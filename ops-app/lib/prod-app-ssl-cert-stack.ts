import * as cdk from 'aws-cdk-lib';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as route53 from 'aws-cdk-lib/aws-route53';
import { Construct } from 'constructs';

const domainName = 'auditre.co';
// This is generated via ops-certificate-stack
const AUDITRE_ZONE_ID = 'Z07568843L6OVLOAM2W4';

export class ProdAppSSLCertStack extends cdk.Stack {
  certificateArn: string;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // // import the delegation role by constructing the roleArn
    // const delegationRoleArn = cdk.Stack.of(this).formatArn({
    //   region: '', // IAM is global in each partition
    //   service: 'iam',
    //   account: '857535158880',
    //   resource: 'role',
    //   resourceName: 'HostedZoneDelegationRole',
    // });
    // const delegationRole = iam.Role.fromRoleArn(
    //   this,
    //   'DelegationRole',
    //   delegationRoleArn,
    // );

    // const subZone = new route53.PublicHostedZone(this, 'SubZone', {
    //   zoneName: 'ci.auditre.co',
    // });
    // new route53.CrossAccountZoneDelegationRecord(this, 'delegate', {
    //   delegatedZone: subZone,
    //   //parentHostedZoneName: 'auditre.co', // or you can use parentHostedZoneId
    //   parentHostedZoneId: AUDITRE_CO_PARENT_ZONE_ID,
    //   delegationRole,
    // });

    const zone = route53.PublicHostedZone.fromHostedZoneId(
      this,
      'Zone',
      AUDITRE_ZONE_ID,
    );

    // Waiting on https://github.com/aws-cloudformation/cloudformation-coverage-roadmap/issues/1401
    // and followup with aws cdk https://github.com/aws/aws-cdk/issues/22887
    // to use ECDSA P 384 for app certs
    const cert = new acm.Certificate(this, 'CICert', {
      domainName: `app.${domainName}`,
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
