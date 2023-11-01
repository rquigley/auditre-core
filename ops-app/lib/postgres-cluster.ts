import * as path from 'path';
import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import {
  InstanceClass,
  InstanceSize,
  InstanceType,
  Port,
  SubnetType,
  Vpc,
} from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as rds from 'aws-cdk-lib/aws-rds';
import { Construct } from 'constructs';

export interface PostgresClusterProps {
  vpc: Vpc;
  instanceIdentifier: string;
  dbName: string;
  dbUsername: string;
  isProd: boolean;
}

export class PostgresCluster extends Construct {
  instance: rds.DatabaseInstance;
  dbName: string;
  dbUsername: string;
  creds: rds.DatabaseSecret;

  constructor(scope: Construct, id: string, props: PostgresClusterProps) {
    super(scope, id);

    this.dbName = props.dbName;
    this.dbUsername = props.dbUsername;

    let multiAz;

    let removalPolicy;
    let deletionProtection;
    let deleteAutomatedBackups;
    let backupRetention;

    let instanceType;
    let postgresVersion;

    if (props.isProd) {
      multiAz = true;

      removalPolicy = cdk.RemovalPolicy.RETAIN;
      deletionProtection = true;
      deleteAutomatedBackups = false;
      backupRetention = cdk.Duration.days(365);

      instanceType = InstanceType.of(InstanceClass.T4G, InstanceSize.MICRO);
      postgresVersion = rds.PostgresEngineVersion.VER_15_4;
    } else {
      multiAz = false;

      removalPolicy = cdk.RemovalPolicy.DESTROY;
      deletionProtection = false;
      deleteAutomatedBackups = true;
      backupRetention = cdk.Duration.days(0);

      instanceType = InstanceType.of(InstanceClass.T4G, InstanceSize.MICRO);
      postgresVersion = rds.PostgresEngineVersion.VER_15_4;
    }

    const credsSecretName =
      `/${id}/rds/creds/${props.instanceIdentifier}`.toLowerCase();
    this.creds = new rds.DatabaseSecret(this, 'PostgreRdsCredentials', {
      secretName: credsSecretName,
      username: this.dbUsername,
    });

    const securityGroup = new ec2.SecurityGroup(
      this,
      'LambdaPostgresConnectionSG',
      {
        vpc: props.vpc,
        description: 'Lambda security group to connect to Postgres db.',
        allowAllOutbound: true,
      },
    );
    securityGroup.addIngressRule(
      ec2.Peer.ipv4(props.vpc.vpcCidrBlock),
      Port.tcp(5432),
      'Allow Postgres Communication',
    );

    const parameterGroup = new rds.ParameterGroup(
      this,
      'PostgresRdsParameterGroup',
      {
        engine: rds.DatabaseInstanceEngine.postgres({
          version: postgresVersion,
        }),
        parameters: {
          statement_timeout: '30000',
          log_min_duration_statement: '1000',
        },
      },
    );
    this.instance = new rds.DatabaseInstance(this, 'PostgresRdsInstance', {
      // vpcSubnets might not be necessary, but until we recreate I can't remove them
      vpcSubnets: {
        onePerAz: true,
        subnetType: SubnetType.PRIVATE_ISOLATED,
      },
      credentials: rds.Credentials.fromSecret(this.creds),
      vpc: props.vpc,
      multiAz,
      databaseName: this.dbName,
      allocatedStorage: 20,
      instanceIdentifier: props.instanceIdentifier,
      engine: rds.DatabaseInstanceEngine.postgres({
        version: postgresVersion,
      }),
      instanceType,
      autoMinorVersionUpgrade: true,
      allowMajorVersionUpgrade: false,
      backupRetention,
      deleteAutomatedBackups,
      removalPolicy,
      deletionProtection,
      publiclyAccessible: false,
      parameterGroup,
      securityGroups: [securityGroup],
      caCertificate: rds.CaCertificate.RDS_CA_RDS2048_G1,
      enablePerformanceInsights: true,
      storageEncrypted: true,
    });

    const lambdaRole = new iam.Role(this, 'LambdaExecutionRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromManagedPolicyArn(
          this,
          'LambdaBasicExecution',
          'arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole',
        ),
        iam.ManagedPolicy.fromManagedPolicyArn(
          this,
          'LambdaVPCExecution',
          'arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole',
        ),
      ],
      inlinePolicies: {
        secretsManagerPermissions: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ['secretsmanager:GetSecretValue', 'kms:Decrypt'],
              resources: [this.creds.secretArn],
            }),
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ['rds-db:connect'],
              resources: [this.instance.instanceArn],
            }),
          ],
        }),
      },
    });

    // Note, changes to this Lambda or teardowns of the stack will take 40+ minutes.
    // This is because of the way AWS handles Lambdas within a VPC.
    // Explaination: https://stackoverflow.com/questions/47957820/lambda-in-vpc-deletion-takes-more-time
    // and https://stackoverflow.com/questions/41299662/aws-lambda-created-eni-not-deleting-while-deletion-of-stack?rq=3
    // Use bin/findEniAssociations to find any associated lambda functions
    const migrationLambda = new lambdaNodejs.NodejsFunction(
      this,
      'DBMigrationFunction',
      {
        functionName: `db-migrate`,
        entry: './packages/db-migration/migrate.js',
        runtime: lambda.Runtime.NODEJS_18_X,
        architecture: lambda.Architecture.ARM_64,
        memorySize: 256,
        timeout: cdk.Duration.minutes(10),
        handler: 'handler',
        bundling: {
          externalModules: ['@aws-sdk/*'],
          nodeModules: ['pg', '@sentry/serverless'],
          minify: false,
          commandHooks: {
            afterBundling(inputDir: string, outputDir: string): string[] {
              return [`cp -r ${inputDir}/migrations ${outputDir}`];
            },
            beforeBundling() {
              return [];
            },
            beforeInstall() {
              return [];
            },
          },
        },
        depsLockFilePath: path.resolve(
          __dirname,
          '../packages/db-migration',
          'package-lock.json',
        ),
        projectRoot: path.resolve(__dirname, '../packages/db-migration'),
        environment: {
          // DEBUG_LOGGING_ENABLED: 'true',
          // PARAMETERS_SECRETS_EXTENSION_LOG_LEVEL: 'debug',
          DB_CREDS_SECRET_ID: credsSecretName,
          PARAMETERS_SECRETS_EXTENSION_HTTP_PORT: '2773',
        },
        vpc: props.vpc,
        vpcSubnets: { subnetType: SubnetType.PRIVATE_WITH_EGRESS },
        role: lambdaRole,
        //securityGroups: [securityGroup],
        layers: [
          lambda.LayerVersion.fromLayerVersionArn(
            this,
            'AWS-Parameters-and-Secrets-Lambda-Extension-Layer-ARM64',
            'arn:aws:lambda:us-east-2:590474943231:layer:AWS-Parameters-and-Secrets-Lambda-Extension-Arm64:4',
          ),
        ],
      },
    );
    this.instance.grantConnect(migrationLambda);
  }
}
