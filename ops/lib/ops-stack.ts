import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaEventSources from 'aws-cdk-lib/aws-lambda-event-sources';

export class OpsStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const queue = new sqs.Queue(this, 'sqs-queue-test-1', {
      queueName: 'OurSQSQueue',
    });

    const lambdaFunction = new lambda.Function(this, 'Function', {
      code: lambda.Code.fromAsset('src'),
      handler: 'index.handler',
      functionName: 'SqsMessageHandler',
      runtime: lambda.Runtime.NODEJS_18_X,
    });

    const eventSource = new lambdaEventSources.SqsEventSource(queue);

    lambdaFunction.addEventSource(eventSource);

    new s3.Bucket(this, 'Bah7Ogh9', {
      bucketName: 'com-auditrehq-org-files-dev',
      publicReadAccess: false,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // should be RETAINED for prod
      enforceSSL: true,
      versioned: false, // should be true for prod
      cors: [
        {
          allowedMethods: [
            s3.HttpMethods.GET,
            s3.HttpMethods.POST,
            s3.HttpMethods.PUT,
          ],
          allowedOrigins: ['http://localhost:3000'],
          allowedHeaders: ['*'],
        },
      ],
      //objectLockEnabled: true, // should be true for prod
    });

    //https://dev.to/aws-builders/how-to-trigger-an-aws-lambda-from-sqs-2lkc
  }
}
