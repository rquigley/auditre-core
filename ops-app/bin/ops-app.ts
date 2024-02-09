#!/usr/bin/env node

import 'source-map-support/register';

import * as cdk from 'aws-cdk-lib';

import { DevAppSSLCertStack } from '../lib/dev-app-ssl-cert-stack';
import { OpsAppStack } from '../lib/ops-app-stack';
import { ProdAppSSLCertStack } from '../lib/prod-app-ssl-cert-stack';

const app = new cdk.App();

const isProd = process.env.CDK_DEFAULT_ACCOUNT === '857535158880';

let certStack;
if (isProd) {
  certStack = new ProdAppSSLCertStack(app, 'ProdAppSSLCertStack', {
    crossRegionReferences: true,
    env: {
      account: '857535158880',
      region: 'us-east-1',
    },
  });
} else {
  certStack = new DevAppSSLCertStack(app, 'DevAppSSLCertStack', {
    crossRegionReferences: true,
    env: { account: '258343757818', region: 'us-east-1' },
  });
}

new OpsAppStack(app, 'OpsAppStack', {
  /* If you don't specify 'env', this stack will be environment-agnostic.
   * Account/Region-dependent features and context lookups will not work,
   * but a single synthesized template can be deployed anywhere. */
  /* Uncomment the next line to specialize this stack for the AWS Account
   * and Region that are implied by the current CLI configuration. */
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
  /* Uncomment the next line if you know exactly what Account and Region you
   * want to deploy the stack to. */
  // env: { account: '123456789012', region: 'us-east-1' },
  /* For more information, see https://docs.aws.amazon.com/cdk/latest/guide/environments.html */
  crossRegionReferences: true,
  certificateArn: certStack.certificateArn,
  isProd,
});
