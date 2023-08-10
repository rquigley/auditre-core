import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';

const domainName = 'auditre.co';

export class OpsCertificateStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const zone = route53.HostedZone.fromLookup(this, 'Zone', {
      domainName: domainName,
    });

    const cert = new acm.Certificate(this, 'Cert', {
      domainName: domainName,
      subjectAlternativeNames: [`*.${domainName}`],
      validation: acm.CertificateValidation.fromDns(zone),
      
    });
    cert.metricDaysToExpiry().createAlarm(this, 'Alarm', {
      comparisonOperator: cloudwatch.ComparisonOperator.LESS_THAN_THRESHOLD,
      evaluationPeriods: 1,
      threshold: 45,
    });
    
    new cdk.CfnOutput(this, 'CertificateDomainName', { value: domainName });
    new cdk.CfnOutput(this, 'CertificateArn', { value: cert.certificateArn });

  }
}
