import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
// import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as cloudfront_origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as targets from 'aws-cdk-lib/aws-route53-targets';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
//import * as patterns from 'aws-cdk-lib/aws-route53-patterns';
import { GithubActionsRole } from 'aws-cdk-github-oidc';
import { GithubActionsIdentityProvider } from 'aws-cdk-github-oidc';

const domainName = 'auditre.co';

// Get this value from core/ops-certificate stack
const certificateArn =
  'arn:aws:acm:us-east-1:857535158880:certificate/f91cba71-a2da-41c7-ac3c-2bad93028383';

export class OpsMarketingStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const zone = route53.HostedZone.fromLookup(this, 'Zone', {
      domainName: domainName,
    });

    const certificate = acm.Certificate.fromCertificateArn(
      this,
      'Certificate',
      certificateArn,
    );

    const domainNameWithWWW = `www.${domainName}`;

    const siteBucket = new s3.Bucket(this, 'Chah2tai', {
      bucketName: domainName,
      publicReadAccess: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // NOT recommended for production code
      autoDeleteObjects: true, // NOT recommended for production code
    });

    new s3.Bucket(this, 'Chah2tai-www', {
      websiteRedirect: { hostName: 'www.example.com' },

      bucketName: domainNameWithWWW,
      publicReadAccess: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // NOT recommended for production code
      autoDeleteObjects: true, // NOT recommended for production code
    });
    const bucket = new s3.Bucket(this, 'MyRedirectedBucket', {
      websiteRedirect: { hostName: 'www.example.com' },
    });

    const cloudfrontOAI = new cloudfront.OriginAccessIdentity(
      this,
      'cloudfront-OAI',
      {
        comment: `OAI for ${domainName}`,
      },
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
      zone: zone,
    });

    new route53.ARecord(this, 'WWWSiteAliasRecord', {
      recordName: domainNameWithWWW,
      target: route53.RecordTarget.fromAlias(
        new targets.CloudFrontTarget(distribution),
      ),
      zone: zone,
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
