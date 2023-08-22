#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { OpsMarketingStack } from '../lib/ops-marketing-stack';
import { SSLCertStack } from '../lib/ssl-cert-stack';

const app = new cdk.App();

const sslCertStack = new SSLCertStack(app, 'SSLCertStack', {
  env: { account: '857535158880', region: 'us-east-1' },
  crossRegionReferences: true,
});

new OpsMarketingStack(app, 'OpsMarketingStack', {
  env: {
    account: '857535158880',
    region: 'us-east-2',
  },
  crossRegionReferences: true,
  certificateArn: sslCertStack.certificateArn,
});
