import * as path from 'path';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import {
  InstanceClass,
  InstanceSize,
  InstanceType,
  Port,
  SubnetType,
  Vpc,
} from 'aws-cdk-lib/aws-ec2';

export interface PostgresClusterProps {
  vpc: Vpc;
  instanceIdentifier: string;
  dbName: string;
  dbUsername: string;
  isProd: boolean;
}

export class PostgresCluster extends Construct {
  cluster: rds.DatabaseInstance;
  dbName: string;
  dbUsername: string;
  creds: rds.DatabaseSecret;

  constructor(scope: Construct, id: string, props: PostgresClusterProps) {
    super(scope, id);

    this.dbName = props.dbName;
    this.dbUsername = props.dbUsername;

    let multiAz;
    let removalPolicy;
    let instanceType;
    let deleteAutomatedBackups;
    let deletionProtection;
    let backupRetention;
    let postgresVersion;
    if (props.isProd) {
      multiAz = true;
      removalPolicy = cdk.RemovalPolicy.RETAIN;
      instanceType = InstanceType.of(InstanceClass.T4G, InstanceSize.MICRO);
      deleteAutomatedBackups = false;
      deletionProtection = true;
      backupRetention = cdk.Duration.days(365);
      postgresVersion = rds.PostgresEngineVersion.VER_15_3;
    } else {
      multiAz = false;
      removalPolicy = cdk.RemovalPolicy.DESTROY;
      instanceType = InstanceType.of(InstanceClass.T4G, InstanceSize.MICRO);
      deleteAutomatedBackups = true;
      deletionProtection = false;
      backupRetention = cdk.Duration.days(0);
      postgresVersion = rds.PostgresEngineVersion.VER_15_3;
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

    this.cluster = new rds.DatabaseInstance(this, 'PostgresRdsInstance', {
      vpcSubnets: {
        onePerAz: true,
        subnetType: SubnetType.PRIVATE_ISOLATED,
      },
      credentials: rds.Credentials.fromSecret(this.creds),
      vpc: props.vpc,
      multiAz,
      port: 3306,
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
      securityGroups: [securityGroup],
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
        timeout: cdk.Duration.seconds(5),
        handler: 'handler',
        bundling: {
          externalModules: ['@aws-sdk/*'],
          nodeModules: ['pg'],
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
          DEBUG_LOGGING_ENABLED: 'true',
          PARAMETERS_SECRETS_EXTENSION_LOG_LEVEL: 'debug',
          DB_CREDS_SECRET_ID: credsSecretName,
          PARAMETERS_SECRETS_EXTENSION_HTTP_PORT: '2773',
        },
        vpc: props.vpc,
        role: lambdaRole,
        layers: [
          lambda.LayerVersion.fromLayerVersionArn(
            this,
            'AWS-Parameters-and-Secrets-Lambda-Extension-Layer-ARM64',
            'arn:aws:lambda:us-east-2:590474943231:layer:AWS-Parameters-and-Secrets-Lambda-Extension-Arm64:4',
          ),
        ],
      },
    );
    this.cluster.grantConnect(migrationLambda);
  }
}
