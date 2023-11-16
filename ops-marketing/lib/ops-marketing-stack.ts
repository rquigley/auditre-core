import {
  GithubActionsIdentityProvider,
  GithubActionsRole,
} from 'aws-cdk-github-oidc';
import {
  CfnOutput,
  Duration,
  RemovalPolicy,
  Stack,
  StackProps,
} from 'aws-cdk-lib';
import { LambdaIntegration, RestApi } from 'aws-cdk-lib/aws-apigateway';
import { Certificate } from 'aws-cdk-lib/aws-certificatemanager';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as cloudfrontOrigins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as dynamoDb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNodeJs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as targets from 'aws-cdk-lib/aws-route53-targets';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import { Construct } from 'constructs';

import { SSMParameterReader } from './ssm-parameter-reader';

const domainName = 'auditre.co';
// See ops-certificate-stack
const SSM_PARENT_ZONE_ID = 'auditre-parent-zone-id';

export class OpsMarketingStack extends Stack {
  constructor(
    scope: Construct,
    id: string,
    props?: StackProps & { certificateArn: string },
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
    new CfnOutput(this, 'parentZoneId', {
      value: parentZoneIdReader.getParameterValue(),
    });

    const zone = route53.HostedZone.fromHostedZoneAttributes(this, 'Zone', {
      hostedZoneId: parentZoneIdReader.getParameterValue(),
      zoneName: 'auditre.co',
    });
    new CfnOutput(this, 'zone', { value: zone.zoneName });

    const domainNameWithWWW = `www.${domainName}`;

    const siteBucket = new s3.Bucket(this, 'Chah2tai', {
      bucketName: domainName,

      publicReadAccess: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: RemovalPolicy.DESTROY, // NOT recommended for production code
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
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // MTA STS
    const mtaStsBucket = new s3.Bucket(this, 'MtaStsBucket', {
      bucketName: 'mta-sts.auditre.co',

      publicReadAccess: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    new s3deploy.BucketDeployment(this, 'DeployMtaSts', {
      sources: [s3deploy.Source.asset('./mta-sts-assets')],
      destinationBucket: mtaStsBucket,
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
    const certificate = Certificate.fromCertificateArn(
      this,
      'Certificate',
      certificateArn,
    );

    const siteCachePolicy = new cloudfront.CachePolicy(
      this,
      'SiteCachePolicy',
      {
        // headerBehavior: cloudfront.CacheHeaderBehavior.allowList(
        //   'Host',
        //   'Origin',
        // ),
        cookieBehavior: cloudfront.CacheCookieBehavior.all(),
        queryStringBehavior: cloudfront.CacheQueryStringBehavior.all(),
        defaultTtl: Duration.minutes(5),
        minTtl: Duration.seconds(60),
        maxTtl: Duration.minutes(10),
        enableAcceptEncodingBrotli: true,
        enableAcceptEncodingGzip: true,
      },
    );

    const cachePolicyNextStatic = new cloudfront.CachePolicy(
      this,
      'CachePolicyNextStatic',
      {
        cachePolicyName: 'next-static',
        defaultTtl: Duration.seconds(86400),
        maxTtl: Duration.seconds(31536000),
        minTtl: Duration.seconds(2),
        cookieBehavior: cloudfront.CacheCookieBehavior.none(),
        headerBehavior: cloudfront.CacheHeaderBehavior.none(),
        queryStringBehavior: cloudfront.CacheQueryStringBehavior.all(),
        enableAcceptEncodingBrotli: true,
        enableAcceptEncodingGzip: true,
      },
    );
    const distribution = new cloudfront.Distribution(this, 'SiteDistribution', {
      certificate: certificate,
      defaultRootObject: 'index.html',
      domainNames: [domainName, domainNameWithWWW, 'mta-sts.auditre.co'],
      minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 403,
          responsePagePath: '/error.html',
          ttl: Duration.minutes(30),
        },
      ],
      defaultBehavior: {
        origin: new cloudfrontOrigins.S3Origin(siteBucket, {
          originAccessIdentity: cloudfrontOAI,
        }),
        cachePolicy: siteCachePolicy,
        compress: true,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
      additionalBehaviors: {
        '/_next/static/*': {
          origin: new cloudfrontOrigins.S3Origin(siteBucket, {
            originAccessIdentity: cloudfrontOAI,
          }),
          allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
          cachePolicy: cachePolicyNextStatic,
          compress: true,
          viewerProtocolPolicy:
            cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        },
        // '/favicon.ico': {
        //   origin: new cloudfrontOrigins.S3Origin(siteBucket, {
        //     originAccessIdentity: cloudfrontOAI,
        //     //originPath: '/img',
        //   }),
        //   allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        //   cachePolicy: cachePolicyNextStatic,
        //   compress: true,
        //   viewerProtocolPolicy:
        //     cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        // },
        '/logo-email-sig.png': {
          origin: new cloudfrontOrigins.S3Origin(siteBucket, {
            originAccessIdentity: cloudfrontOAI,
          }),
          allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
          cachePolicy: cachePolicyNextStatic,
          compress: true,
          viewerProtocolPolicy:
            cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        },
        '/images/*': {
          origin: new cloudfrontOrigins.S3Origin(siteBucket, {
            originAccessIdentity: cloudfrontOAI,
          }),
          allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
          cachePolicy: cachePolicyNextStatic,
          compress: true,
          viewerProtocolPolicy:
            cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        },
      },
      httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
    });

    distribution.addBehavior(
      '.well-known/mta-sts.txt',
      new cloudfrontOrigins.S3Origin(mtaStsBucket),
      {
        compress: true,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
        cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD,
      },
    );

    const table = new dynamoDb.Table(this, 'MailingListDyanamoDb', {
      partitionKey: { name: 'email', type: dynamoDb.AttributeType.STRING },
    });

    const lambdaFunction = new lambdaNodeJs.NodejsFunction(
      this,
      'MailingListLambda',
      {
        entry: './packages/mailing-list-handler/handler.ts',
        runtime: lambda.Runtime.NODEJS_18_X,
        architecture: lambda.Architecture.ARM_64,
        memorySize: 128,
        environment: {
          TABLE_NAME: table.tableName,
        },
        // bundling: {
        //   nodeModules: ['node-fetch', '@aws-sdk/client-dynamodb'],
        // },
      },
    );
    table.grantReadWriteData(lambdaFunction);

    const lambdaIntegration = new LambdaIntegration(lambdaFunction);

    const api = new RestApi(this, 'MailingListAPIGateway', {
      restApiName: 'My Mailing List Service',
    });
    // api.root.addMethod('POST', lambdaIntegration);
    api.root
      .addResource('join-mailing-list')
      .addMethod('POST', lambdaIntegration);

    distribution.addBehavior(
      '/join-mailing-list',
      new cloudfrontOrigins.RestApiOrigin(api),
      {
        allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
        cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
      },
    );

    new CfnOutput(this, 'DistributionId', {
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

    new route53.ARecord(this, 'MTASTSAliasRecord', {
      recordName: 'mta-sts',
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

    new CfnOutput(this, 'Github Actions Upload Role', {
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
