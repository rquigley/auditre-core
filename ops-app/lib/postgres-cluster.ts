import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as rds from 'aws-cdk-lib/aws-rds';
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
}

export class PostgresCluster extends Construct {
  cluster: rds.DatabaseInstance;

  constructor(scope: Construct, id: string, props: PostgresClusterProps) {
    super(scope, id);

    const credsSecretName =
      `/${id}/rds/creds/${props.instanceIdentifier}`.toLowerCase();
    const creds = new rds.DatabaseSecret(this, 'PostgreRdsCredentials', {
      secretName: credsSecretName,
      username: 'arroot',
    });

    this.cluster = new rds.DatabaseInstance(this, 'PostgresRdsInstance', {
      vpcSubnets: {
        onePerAz: true,
        subnetType: SubnetType.PRIVATE_ISOLATED,
      },
      credentials: rds.Credentials.fromSecret(creds),
      vpc: props.vpc,
      multiAz: false,
      port: 3306,
      databaseName: 'auditre',
      allocatedStorage: 20,
      instanceIdentifier: props.instanceIdentifier,
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_15_3,
      }),
      instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MICRO),
      autoMinorVersionUpgrade: true,
      allowMajorVersionUpgrade: false,
      //backupRetention: cdk.Duration.days(0),
      deleteAutomatedBackups: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      deletionProtection: false,
      publiclyAccessible: false,
    });
  }
}
