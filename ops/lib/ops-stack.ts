import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';

export class OpsStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    new s3.Bucket(this, 'Bah7Ogh9', {
      bucketName: 'com-auditrehq-org-files-dev',
      publicReadAccess: false,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      enforceSSL: true,
      //objectLockEnabled: true,
    });
  }
}
