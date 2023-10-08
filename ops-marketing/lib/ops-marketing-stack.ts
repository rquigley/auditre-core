import {
  GithubActionsIdentityProvider,
  GithubActionsRole,
} from 'aws-cdk-github-oidc';
import * as cdk from 'aws-cdk-lib';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as cloudfront_origins from 'aws-cdk-lib/aws-cloudfront-origins';
//import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as targets from 'aws-cdk-lib/aws-route53-targets';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';

import { SSMParameterReader } from './ssm-parameter-reader';

const domainName = 'auditre.co';
// See ops-certificate-stack
const SSM_PARENT_ZONE_ID = 'auditre-parent-zone-id';

export class OpsMarketingStack extends cdk.Stack {
  constructor(
    scope: Construct,
    id: string,
    props?: cdk.StackProps & { certificateArn: string },
  ) {
    super(scope, id, props);

    const parentZoneIdReader = new SSMParameterReader(
      this,
      'ParentZoneIdSSMReader',
      {
        parameterName: SSM_PARENT_ZONE_ID,
        region: 'us-east-1',
      },
    );
    new cdk.CfnOutput(this, 'parentZoneId', {
      value: parentZoneIdReader.getParameterValue(),
    });

    const zone = route53.HostedZone.fromHostedZoneAttributes(this, 'Zone', {
      hostedZoneId: parentZoneIdReader.getParameterValue(),
      zoneName: 'auditre.co',
    });
    new cdk.CfnOutput(this, 'zone', { value: zone.zoneName });

    const domainNameWithWWW = `www.${domainName}`;

    const siteBucket = new s3.Bucket(this, 'Chah2tai', {
      bucketName: domainName,

      publicReadAccess: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // NOT recommended for production code
      autoDeleteObjects: true, // NOT recommended for production code
    });

    new s3.Bucket(this, 'Chah2tai-www', {
      bucketName: domainNameWithWWW,

      websiteRedirect: {
        hostName: siteBucket.bucketWebsiteDomainName,
        protocol: s3.RedirectProtocol.HTTPS,
      },
      publicReadAccess: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // NOT recommended for production code
      autoDeleteObjects: true, // NOT recommended for production code
    });

    const cloudfrontOAI = new cloudfront.OriginAccessIdentity(
      this,
      'cloudfront-OAI',
      {
        comment: `OAI for ${domainName}`,
      },
    );

    // Output from ssl-cert-stack
    const certificateArn = props?.certificateArn || '';
    const certificate = acm.Certificate.fromCertificateArn(
      this,
      'Certificate',
      certificateArn,
    );
    const distribution = new cloudfront.Distribution(this, 'SiteDistribution', {
      certificate: certificate,
      defaultRootObject: 'index.html',
      domainNames: [domainName, domainNameWithWWW],
      minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 403,
          responsePagePath: '/error.html',
          ttl: cdk.Duration.minutes(30),
        },
      ],
      defaultBehavior: {
        origin: new cloudfront_origins.S3Origin(siteBucket, {
          originAccessIdentity: cloudfrontOAI,
        }),
        compress: true,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
      httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
    });

    new cdk.CfnOutput(this, 'DistributionId', {
      value: distribution.distributionId,
    });

    new route53.ARecord(this, 'SiteAliasRecord', {
      recordName: domainName,
      target: route53.RecordTarget.fromAlias(
        new targets.CloudFrontTarget(distribution),
      ),
      zone,
    });

    new route53.ARecord(this, 'WWWSiteAliasRecord', {
      recordName: domainNameWithWWW,
      target: route53.RecordTarget.fromAlias(
        new targets.CloudFrontTarget(distribution),
      ),
      zone,
    });

    const provider = GithubActionsIdentityProvider.fromAccount(
      this,
      'GithubProvider',
    );

    const uploadRole = new GithubActionsRole(this, 'UploadRole', {
      roleName: 'MarketingSiteUploadRole',
      provider: provider,
      owner: 'auditrehq',
      repo: 'marketing-site',
      filter: '*',
      //filter: "ref:refs/tags/v*", // JWT sub suffix filter, defaults to '*'
    });

    siteBucket.grantReadWrite(uploadRole);
    distribution.grantCreateInvalidation(uploadRole);

    new cdk.CfnOutput(this, 'Github Actions Upload Role', {
      value: uploadRole.roleArn,
    });

    // TODO: remove this once the site is deployed
    // new s3deploy.BucketDeployment(this, 'DeployWithInvalidation', {
    //   sources: [s3deploy.Source.asset('./site-contents')],
    //   destinationBucket: siteBucket,
    //   distribution,
    //   distributionPaths: ['/*'],
    // });
  }
}
