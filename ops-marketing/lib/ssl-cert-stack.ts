import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as ssm from 'aws-cdk-lib/aws-ssm';

const domainName = 'auditre.co';
// See ops-certificate-stack
const SSM_PARENT_ZONE_ID = 'auditre-parent-zone-id';

export class SSLCertStack extends cdk.Stack {
  certificateArn: string;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const parentZoneId = ssm.StringParameter.valueForStringParameter(
      this,
      SSM_PARENT_ZONE_ID,
    );
    const zone = route53.HostedZone.fromHostedZoneId(
      this,
      'Zone',
      parentZoneId,
    );

    // Waiting on https://github.com/aws-cloudformation/cloudformation-coverage-roadmap/issues/1401
    // and followup with aws cdk https://github.com/aws/aws-cdk/issues/22887
    // to use ECDSA P 384 for app certs
    const cert = new acm.Certificate(this, 'Cert', {
      domainName: domainName,
      subjectAlternativeNames: [`*.${domainName}`],
      validation: acm.CertificateValidation.fromDns(zone),
    });
    this.certificateArn = cert.certificateArn;
    cert.metricDaysToExpiry().createAlarm(this, 'Alarm', {
      comparisonOperator: cloudwatch.ComparisonOperator.LESS_THAN_THRESHOLD,
      evaluationPeriods: 1,
      threshold: 45,
    });
  }
}
