import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as iam from 'aws-cdk-lib/aws-iam';
import { GithubActionsIdentityProvider } from 'aws-cdk-github-oidc';

const domainName = 'auditre.co';
const SSM_PARENT_ZONE_ID = 'auditre-parent-zone-id';

export class OpsCertificateStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const parentZone = new route53.PublicHostedZone(this, 'AccountHostedZone', {
      zoneName: domainName,
    });

    // Save for lookup by other stacks
    new ssm.StringParameter(this, 'parent-zone-ssm-param', {
      parameterName: SSM_PARENT_ZONE_ID,
      stringValue: parentZone.hostedZoneId,
    });

    // Allow usage by the dev account
    const role = new iam.Role(this, 'RootZoneOrganizationRole', {
      roleName: 'HostedZoneDelegationRole',
      assumedBy: new iam.OrganizationPrincipal('o-9u8fiprcz7'),
    });
    parentZone.grantDelegation(role);

    new route53.MxRecord(this, 'MainMxRecord', {
      values: [
        {
          hostName: 'SMTP.GOOGLE.COM',
          priority: 1,
        },
      ],
      zone: parentZone,
      ttl: cdk.Duration.minutes(5),
    });

    new route53.CnameRecord(this, `CnameApiRecord`, {
      recordName: 'stiab5cgdxvs.auditre.co',
      zone: parentZone,
      domainName: 'gv-zuztxdn3ubnirt.dv.googlehosted.com',
      comment: 'Google Workplace verification',
    });

    new route53.TxtRecord(this, `DKIMTxtRecord`, {
      recordName: 'google._domainkey',
      zone: parentZone,
      values: [
        'v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAi/Zt6DhzSYaZDY5Nx6DLyeAop9qqdeJTzvKqk1Xa8CFV7PFXASijJfIPOxXqNHOUUFI6BKO7uodo+ew9hjuAVvbZV0PD4UM+9D/aCzU/6u+t0qQsURnrK6oYb5vsVn8ktOAD8nmhAgiHWKOnhHdj9nHJNBHQxvTnIIQ+ostxDJNdF8+My8ArOMKn2fDltNTeKedMHsthlurYtIHSRodNp7ydu/uCbjA+QdwRwDhbVnWYGfzy6eWKoip2z2bDW6isPdGblLaGzKbhwsJ+KvYHQRP8x90tPMoHoUR9r6M+u1+1LfWR7sWWbS5GaIgNQr+lzctQDSuvkMasn+GGgwr+pQIDAQAB',
      ],
      comment: 'Google Workplace DKIM',
    });

    new route53.TxtRecord(this, `SMTPTLSTxtRecord`, {
      recordName: '_smtp._tls',
      zone: parentZone,
      values: ['v=TLSRPTv1; rua=mailto:tls-reports@auditre.co'],
      comment: 'SMTP TLS reporting',
    });

    new route53.TxtRecord(this, `MTASTSTxtRecord`, {
      recordName: '_mta-sts',
      zone: parentZone,
      values: ['v=STSv1; id=20231931104300'],
      comment: 'MTA STS',
    });

    new route53.TxtRecord(this, `DMARCTxtRecord`, {
      recordName: '_dmarc',
      zone: parentZone,
      values: [
        'v=DMARC1; p=none; rua=mailto:dmarc-reports@auditre.co; pct=100; adkim=r; aspf=r',
      ],
      comment: 'DMARC',
    });

    new route53.TxtRecord(this, `ApexTxtRecord`, {
      zone: parentZone,
      values: ['v=spf1 include:_spf.google.com ~all'],
    });

    const zone = route53.HostedZone.fromHostedZoneId(
      this,
      'Zone',
      parentZone.hostedZoneId,
    );

    // Waiting on https://github.com/aws-cloudformation/cloudformation-coverage-roadmap/issues/1401
    // and followup with aws cdk https://github.com/aws/aws-cdk/issues/22887
    // to use ECDSA P 384 for app certs
    // const cert = new acm.Certificate(this, 'Cert', {
    //   domainName: domainName,
    //   subjectAlternativeNames: [`*.${domainName}`],
    //   validation: acm.CertificateValidation.fromDns(zone),
    // });
    // cert.metricDaysToExpiry().createAlarm(this, 'Alarm', {
    //   comparisonOperator: cloudwatch.ComparisonOperator.LESS_THAN_THRESHOLD,
    //   evaluationPeriods: 1,
    //   threshold: 45,
    // });

    //new cdk.CfnOutput(this, 'CertificateDomainName', { value: domainName });
    //new cdk.CfnOutput(this, 'CertificateArn', { value: cert.certificateArn });

    // TODO: make sure this runs for both dev and prod accounts
    const provider = new GithubActionsIdentityProvider(this, 'GithubProvider');
  }
}
