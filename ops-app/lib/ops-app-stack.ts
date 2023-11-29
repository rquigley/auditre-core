import * as path from 'path';
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
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as cloudfrontOrigins from 'aws-cdk-lib/aws-cloudfront-origins';
import { SubnetType, Vpc } from 'aws-cdk-lib/aws-ec2';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecsPatterns from 'aws-cdk-lib/aws-ecs-patterns';
import { ApplicationLoadBalancer } from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as events from 'aws-cdk-lib/aws-events';
import * as eventsTarget from 'aws-cdk-lib/aws-events-targets';
import * as iam from 'aws-cdk-lib/aws-iam';
import { ManagedPolicy } from 'aws-cdk-lib/aws-iam';
import {
  Architecture,
  Code,
  Function,
  LayerVersion,
  Runtime,
} from 'aws-cdk-lib/aws-lambda';
import { ARecord, HostedZone, RecordTarget } from 'aws-cdk-lib/aws-route53';
import { CloudFrontTarget } from 'aws-cdk-lib/aws-route53-targets';
// import * as sqs from 'aws-cdk-lib/aws-sqs';
import {
  BlockPublicAccess,
  Bucket,
  EventType,
  HttpMethods,
} from 'aws-cdk-lib/aws-s3';
import { LambdaDestination } from 'aws-cdk-lib/aws-s3-notifications';
import { Topic } from 'aws-cdk-lib/aws-sns';
import { UrlSubscription } from 'aws-cdk-lib/aws-sns-subscriptions';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';

import { PostgresCluster } from './postgres-cluster';

export class OpsAppStack extends Stack {
  constructor(
    scope: Construct,
    id: string,
    props?: StackProps & { certificateArn: string; isProd: boolean },
  ) {
    super(scope, id, props);
    const isProd = props?.isProd || false;

    // const repo = new ecr.Repository(this, 'Repo', {
    //   repositoryName: 'auditre-fargate-app',
    //   lifecycleRules: [
    //     {
    //       description: 'keep 5 images',
    //       maxImageCount: 5,
    //     },
    //   ],
    //   removalPolicy: RemovalPolicy.DESTROY,
    // });
    const repo = ecr.Repository.fromRepositoryName(
      this,
      'Repo',
      'auditre-fargate-app',
    );
    const policy = new iam.ManagedPolicy(this, 'AppDeployIamUserPolicy', {
      managedPolicyName: 'AppDeployIamUserPolicy',
      statements: [
        new iam.PolicyStatement({
          actions: [
            'iam:PassRole',
            'ecr:BatchCheckLayerAvailability',
            'ecr:BatchGetImage',
            'ecr:CompleteLayerUpload',
            'ecr:GetAuthorizationToken',
            'ecr:GetDownloadUrlForLayer',
            'ecr:InitiateLayerUpload',
            'ecr:PutImage',
            'ecr:UploadLayerPart',
            'ecs:DescribeServices',
            'ecs:DescribeTaskDefinition',
            'ecs:RegisterTaskDefinition',
            'ecs:UpdateService',
            'lambda:InvokeFunction',
          ],
          //resources: [repo.repositoryArn],
          // TODO: lock this down to the repo
          resources: ['*'],
        }),
      ],
    });
    //policy.attachToUser(user);

    const provider = new GithubActionsIdentityProvider(this, 'GithubProvider');
    // const provider = GithubActionsIdentityProvider.fromAccount(
    //   this,
    //   'GithubProvider',
    // );

    const deployRole = new GithubActionsRole(this, 'AppDeployRole', {
      roleName: 'AppDeployRole',
      provider: provider,
      owner: 'auditrehq',
      repo: 'core',
      filter: '*',
      //filter: "ref:refs/tags/v*", // JWT sub suffix filter, defaults to '*'
    });
    deployRole.addManagedPolicy(policy);

    //iam.ManagedPolicy.fromManagedPolicyArn
    //fromAwsManagedPolicyName('AppDeployAccess'),
    //);
    // https://github.com/aws-actions/amazon-ecr-login#ecr-private allow push pull!
    new CfnOutput(this, 'Github Actions app upload role', {
      value: deployRole.roleArn,
    });

    let appDomainName;
    let removalPolicy;
    let allowedOrigins;
    let autoDeleteObjects;
    let objectLockEnabled;
    if (isProd) {
      appDomainName = 'app.auditre.co';
      removalPolicy = RemovalPolicy.RETAIN;
      allowedOrigins = [`https://${appDomainName}`];
      autoDeleteObjects = false;
      objectLockEnabled = true;
    } else {
      appDomainName = 'app.ci.auditre.co';
      removalPolicy = RemovalPolicy.DESTROY;
      allowedOrigins = ['http://localhost:3000', `https://${appDomainName}`];
      autoDeleteObjects = true;
      objectLockEnabled = false;
    }
    const s3Bucket = new Bucket(this, 's3', {
      bucketName: `auditre-app-org-files-${isProd ? 'prod' : 'dev'}`,
      publicReadAccess: false,
      removalPolicy,
      enforceSSL: true,
      versioned: isProd, // should be true for prod
      cors: [
        {
          allowedMethods: [HttpMethods.GET, HttpMethods.POST, HttpMethods.PUT],
          allowedOrigins,
          allowedHeaders: ['*'],
        },
      ],
      autoDeleteObjects,
      objectLockEnabled,
      //intelligentTieringConfigurations:
    });

    const lxmlLayer = new LayerVersion(this, 'LXMLLayer', {
      removalPolicy: RemovalPolicy.DESTROY,
      code: Code.fromAsset(
        path.join(__dirname, '../packages/lxml-layer/layer311.zip'),
      ),
      compatibleArchitectures: [Architecture.ARM_64],
      compatibleRuntimes: [Runtime.PYTHON_3_11, Runtime.PYTHON_3_12],
    });
    /// pdf
    const extractPdfLambda = new Function(this, 'ExtractPdfLambda', {
      description: 'S3 handler to extract text from PDFs',
      code: Code.fromAsset(
        path.join(__dirname, '../packages/extract-pdf-lambda'),
        {
          bundling: {
            image: Runtime.PYTHON_3_12.bundlingImage,
            command: [
              'bash',
              '-c',
              'pip install -r requirements.txt -t /asset-output && cp -au . /asset-output',
            ],
          },
        },
      ),
      runtime: Runtime.PYTHON_3_12,
      architecture: Architecture.ARM_64,
      memorySize: 512,
      timeout: Duration.seconds(30),
      handler: 'lambda_function.handler',
    });
    s3Bucket.grantReadWrite(extractPdfLambda);
    const pdfS3nDest = new LambdaDestination(extractPdfLambda);
    const pdfExtensionsToConvert = ['pdf'];
    pdfExtensionsToConvert.forEach((suffix) => {
      s3Bucket.addEventNotification(EventType.OBJECT_CREATED, pdfS3nDest, {
        suffix,
      });
    });
    ////
    const extractContentLambda = new Function(this, 'ExtractContentLambda', {
      description: 'S3 handler to extract text from XLXS, DOCX, DOC files',
      code: Code.fromAsset(
        path.join(__dirname, '../packages/extract-content-lambda'),
        {
          bundling: {
            image: Runtime.PYTHON_3_11.bundlingImage,
            command: [
              'bash',
              '-c',
              'pip install -r requirements.txt -t /asset-output && cp -au . /asset-output',
            ],
          },
        },
      ),
      runtime: Runtime.PYTHON_3_11,
      architecture: Architecture.ARM_64,
      memorySize: 512,
      timeout: Duration.seconds(60),
      handler: 'lambda_function.handler',
      layers: [lxmlLayer],
    });
    s3Bucket.grantReadWrite(extractContentLambda);
    const s3nDest = new LambdaDestination(extractContentLambda);
    const extensionsToConvert = ['xlsx', 'xls', '.doc', '.docx'];
    extensionsToConvert.forEach((suffix) => {
      s3Bucket.addEventNotification(EventType.OBJECT_CREATED, s3nDest, {
        suffix,
      });
    });

    // https://www.cloudtechsimplified.com/ci-cd-pipeline-aws-fargate-github-actions-nodejs/

    const vpc = new Vpc(this, 'FargateNodeJsVpc', {
      maxAzs: 2,
      natGateways: 1,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'ingress',
          subnetType: SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: 'application',
          subnetType: SubnetType.PRIVATE_WITH_EGRESS,
        },
        {
          cidrMask: 28,
          name: 'rds',
          subnetType: SubnetType.PRIVATE_ISOLATED,
        },
      ],
    });

    const loadbalancer = new ApplicationLoadBalancer(this, 'FargrateALB', {
      vpc,
      internetFacing: true,
      vpcSubnets: vpc.selectSubnets({
        subnetType: SubnetType.PUBLIC,
        // subnetType: SubnetType.PRIVATE_WITH_EGRESS,
      }),
      idleTimeout: Duration.seconds(60),
      dropInvalidHeaderFields: true,
    });

    const cluster = new ecs.Cluster(this, 'Cluster', {
      vpc,
      clusterName: 'fargate-node-cluster',
    });

    const dbMigrationsBucket = new Bucket(this, 'DBMigrationsS3Bucket', {
      bucketName: `auditre-app-db-migrations-${isProd ? 'prod' : 'dev'}`,

      publicReadAccess: false,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      removalPolicy: RemovalPolicy.DESTROY, // NOT recommended for production code
      autoDeleteObjects: true, // NOT recommended for production code
    });

    const db = new PostgresCluster(this, 'PostgresCluster', {
      vpc,
      instanceIdentifier: 'app-psql2',
      dbName: 'auditre',
      dbUsername: 'arroot',
      isProd,
      migrationBucket: dbMigrationsBucket,
    });
    db.instance.connections.allowDefaultPortFrom(cluster);
    new CfnOutput(this, 'dbEndpoint', {
      value: db.instance.instanceEndpoint.hostname,
    });

    dbMigrationsBucket.grantReadWrite(deployRole);

    const staticAssetBucket = new Bucket(this, 'StaticAssetS3Bucket', {
      bucketName: `auditre-app-static-assets-${isProd ? 'prod' : 'dev'}`,

      publicReadAccess: false,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      removalPolicy: RemovalPolicy.DESTROY, // NOT recommended for production code
      autoDeleteObjects: true, // NOT recommended for production code
    });
    staticAssetBucket.grantReadWrite(deployRole);

    const cloudfrontOAI = new cloudfront.OriginAccessIdentity(
      this,
      'cloudfront-OAI',
      {
        comment: `OAI for ${appDomainName}`,
      },
    );

    // const repo = new ecr.Repository(this, 'Repo', {
    //   repositoryName: 'auditre-fargate-app',
    // });

    const executionRole = new iam.Role(this, 'ExecutionRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
      managedPolicies: [
        ManagedPolicy.fromAwsManagedPolicyName(
          'service-role/AmazonECSTaskExecutionRolePolicy',
        ),
      ],
    });

    const certificateArn = props?.certificateArn || '';
    const certificate = acm.Certificate.fromCertificateArn(
      this,
      'Certificate',
      certificateArn,
    );
    const appService = new ecsPatterns.ApplicationLoadBalancedFargateService(
      this,
      'FargateNodeServiceV2',
      {
        cluster,
        // taskImageOptions: {
        //   // image: ecs.ContainerImage.fromRegistry('amazon/amazon-ecs-sample'),
        //   image: ecs.ContainerImage.fromEcrRepository(
        //     repo,
        //     'auditre-fargate-app',
        //   ),
        //   containerName: 'nodejs-app-container',
        //   family: 'fargate-node-task-defn',
        //   containerPort: 3000,
        //   executionRole,
        // },

        taskImageOptions: {
          // image: ecs.ContainerImage.fromAsset(
          //   path.dirname('../app/Dockerfile'),
          // ),
          image: ecs.ContainerImage.fromEcrRepository(repo, 'latest'),
          environment: {
            NEXT_PUBLIC_ROOT_DOMAIN: 'app.ci.auditre.co',
            NEXTAUTH_URL: 'https://app.ci.auditre.co',
            NEXT_RUNTIME: 'nodejs',
            GOOGLE_CLIENT_ID:
              '274008686939-oejqk1po6q1qd8krlcqsgk3brih10qgm.apps.googleusercontent.com',
            AWS_S3_BUCKET: s3Bucket.bucketName,
            ENVIRONMENT: 'production',
            NODE_ENV: 'production',
          },
          secrets: {
            AWS_RDS_DB_CREDS: ecs.Secret.fromSecretsManager(db.creds),

            NEXTAUTH_SECRET: ecs.Secret.fromSsmParameter(
              StringParameter.fromStringParameterName(
                this,
                'AppNextAuthParameter',
                '/app/NEXTAUTH_SECRET',
              ),
            ),
            GOOGLE_CLIENT_SECRET: ecs.Secret.fromSsmParameter(
              StringParameter.fromStringParameterName(
                this,
                'AppGoogleClientSecretParameter',
                '/app/GOOGLE_CLIENT_SECRET',
              ),
            ),
            OPENAI_API_KEY: ecs.Secret.fromSsmParameter(
              StringParameter.fromStringParameterName(
                this,
                'AppOpenAIKeyParameter',
                '/app/OPENAI_API_KEY',
              ),
            ),
          },
          containerName: 'nodejs-app-container',
          family: 'fargate-node-task-defn',
          containerPort: 3000,
          executionRole,
        },
        cpu: 256,
        memoryLimitMiB: 512,
        desiredCount: 1,
        // If you change serviceName, it must also be changed in the github workflow file.
        serviceName: 'fargate-node-service-v2',
        taskSubnets: vpc.selectSubnets({
          subnetType: SubnetType.PRIVATE_WITH_EGRESS,
        }),
        //securityGroups: [db.instance.connections.securityGroups[0]],
        loadBalancer: loadbalancer,
        // TODO: Switch back to HTTPS
        // protocol: ApplicationProtocol.HTTPS,
        // certificate,
      },
    );

    s3Bucket.grantReadWrite(appService.taskDefinition.taskRole);

    // Notify Slack on deploys
    const rule = new events.Rule(this, 'FargateDeployRule', {
      eventPattern: {
        source: ['aws.ecs'],
        detailType: ['AWS API Call via CloudTrail'],
        detail: {
          eventName: ['CreateTaskSet', 'UpdateService'],
        },
      },
    });
    const topic = new Topic(this, 'FargateDeployTopic');
    rule.addTarget(new eventsTarget.SnsTopic(topic));
    topic.addSubscription(
      new UrlSubscription(
        'https://hooks.slack.com/services/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',
      ),
    );

    // https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_elasticloadbalancingv2.HealthCheck.html
    // health return 200, unhealthy: anything else
    appService.targetGroup.configureHealthCheck({
      path: '/api/app-cont-health',
      healthyThresholdCount: 2,
    });
    appService.targetGroup.setAttribute(
      'deregistration_delay.timeout_seconds',
      '10',
    );

    const appCachePolicy = new cloudfront.CachePolicy(this, 'AppCachePolicy', {
      headerBehavior: cloudfront.CacheHeaderBehavior.allowList(
        'Host',
        'Origin',
      ),
      cookieBehavior: cloudfront.CacheCookieBehavior.all(),
      queryStringBehavior: cloudfront.CacheQueryStringBehavior.all(),
      defaultTtl: Duration.seconds(0),
      minTtl: Duration.seconds(0),
      maxTtl: Duration.seconds(1),
      enableAcceptEncodingBrotli: true,
      enableAcceptEncodingGzip: true,
    });

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

    const xForwardedForFunc = new cloudfront.Function(
      this,
      'XForwardedHostFunc',
      {
        code: cloudfront.FunctionCode.fromInline(`
        function handler(event) {
          var request = event.request;
          request.headers['x-forwarded-host'] = request.headers.host;
          return request;
        }
      `),
      },
    );

    const distribution = new cloudfront.Distribution(this, 'SiteDistribution', {
      certificate: certificate,
      domainNames: ['ci.auditre.co', 'app.ci.auditre.co'],
      minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
      // errorResponses: [
      //   {
      //     httpStatus: 403,
      //     responseHttpStatus: 403,
      //     responsePagePath: '/error.html',
      //     ttl: Duration.minutes(30),
      //   },
      // ],
      defaultBehavior: {
        origin: new cloudfrontOrigins.LoadBalancerV2Origin(loadbalancer, {
          // TODO: Switch back to HTTPS
          protocolPolicy: cloudfront.OriginProtocolPolicy.HTTP_ONLY,
          customHeaders: {
            'X-AR-CF-Header': 'CustomValue',
          },
        }),
        functionAssociations: [
          {
            function: xForwardedForFunc,
            eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
          },
        ],
        compress: true,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: appCachePolicy,
        originRequestPolicy: new cloudfront.OriginRequestPolicy(
          this,
          'AppOriginPolicy',
          {
            headerBehavior: cloudfront.OriginRequestHeaderBehavior.all(),
            queryStringBehavior:
              cloudfront.OriginRequestQueryStringBehavior.all(),
            cookieBehavior: cloudfront.OriginRequestCookieBehavior.all(),
          },
        ),
      },
      httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
      additionalBehaviors: {
        '/_next/static/*': {
          origin: new cloudfrontOrigins.S3Origin(staticAssetBucket, {
            originAccessIdentity: cloudfrontOAI,
          }),
          allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
          cachePolicy: cachePolicyNextStatic,
          compress: true,
          viewerProtocolPolicy:
            cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        },
        '/favicon.ico': {
          origin: new cloudfrontOrigins.S3Origin(staticAssetBucket, {
            originAccessIdentity: cloudfrontOAI,
            originPath: '/img',
          }),
          allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
          cachePolicy: cachePolicyNextStatic,
          compress: true,
          viewerProtocolPolicy:
            cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        },
        '/img/*': {
          origin: new cloudfrontOrigins.S3Origin(staticAssetBucket, {
            originAccessIdentity: cloudfrontOAI,
          }),
          allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
          cachePolicy: cachePolicyNextStatic,
          compress: true,
          viewerProtocolPolicy:
            cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        },
        // '/api/*': {
        //     allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
        //     cachePolicy: cloudfront.CachePolicy.fromCachePolicyId(this, 'ApiCachePolicy', '4135ea2d-6df8-44a3-9df3-4b5a84be39ad'),
        //     compress: true,
        //     viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS
        // }
      },
    });

    new CfnOutput(this, 'DistributionId', {
      value: distribution.distributionId,
    });

    // const zone2 = route53.HostedZone.fromLookup(this, 'Zone', {
    //   domainName: 'ci.auditre.co',
    // });
    const zone = HostedZone.fromHostedZoneAttributes(this, 'Zone', {
      hostedZoneId: 'Z08761632QPQYDP4XYUV2',
      zoneName: 'ci.auditre.co',
    });
    new ARecord(this, 'AppAliasRecord', {
      recordName: 'app.ci.auditre.co',
      target: RecordTarget.fromAlias(new CloudFrontTarget(distribution)),
      zone,
    });
  }
}
