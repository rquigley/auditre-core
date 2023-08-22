#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { OpsCertificateStack } from '../lib/ops-certificate-stack';

const app = new cdk.App();
new OpsCertificateStack(app, 'OpsCertificateStack', {
  // Locked to auditre-prod and us-east-1 because that's where
  // ACM certificates must be created.
  env: { account: '857535158880', region: 'us-east-1' },
});
