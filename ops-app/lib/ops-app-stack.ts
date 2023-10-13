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
import { Bucket, EventType, HttpMethods } from 'aws-cdk-lib/aws-s3';
import { LambdaDestination } from 'aws-cdk-lib/aws-s3-notifications';
import { Topic } from 'aws-cdk-lib/aws-sns';
import { UrlSubscription } from 'aws-cdk-lib/aws-sns-subscriptions';
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

    let removalPolicy;
    let allowedOrigins;
    let autoDeleteObjects;
    let objectLockEnabled;
    if (isProd) {
      removalPolicy = RemovalPolicy.RETAIN;
      allowedOrigins = ['https://app.auditre.co'];
      autoDeleteObjects = false;
      objectLockEnabled = true;
    } else {
      removalPolicy = RemovalPolicy.DESTROY;
      allowedOrigins = ['http://localhost:3000', 'https://app.ci.auditre.co'];
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
    });

    const lxmlLayer = new LayerVersion(this, 'LXMLLayer', {
      removalPolicy: RemovalPolicy.DESTROY,
      code: Code.fromAsset(
        path.join(__dirname, '../packages/lxml-layer/layer311.zip'),
      ),
      compatibleArchitectures: [Architecture.ARM_64],
      compatibleRuntimes: [Runtime.PYTHON_3_11],
    });
    const extractContentLambda = new Function(this, 'ExtractContentLambda', {
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
      timeout: Duration.seconds(30),
      // vpc: vpc,
      // vpcSubnets: { subnetType: SubnetType.PRIVATE_WITH_EGRESS },
      handler: 'lambda_function.handler',
      layers: [lxmlLayer],
    });
    s3Bucket.grantReadWrite(extractContentLambda);
    const s3nDest = new LambdaDestination(extractContentLambda);
    const extensionsToConvert = ['.doc', '.docx', '.pdf', 'xlsx', 'xls'];
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

    const loadbalancer = new ApplicationLoadBalancer(this, 'lb', {
      vpc,
      internetFacing: true, // TODO: false for prod
      vpcSubnets: vpc.selectSubnets({
        subnetType: SubnetType.PUBLIC,
      }),
      idleTimeout: Duration.seconds(5),
    });

    const cluster = new ecs.Cluster(this, 'Cluster', {
      vpc,
      clusterName: 'fargate-node-cluster',
    });

    const db = new PostgresCluster(this, 'PostgresCluster', {
      vpc,
      instanceIdentifier: 'app-psql',
      dbName: 'auditre',
      dbUsername: 'arroot',
      isProd,
    });
    db.instance.connections.allowDefaultPortFrom(cluster);
    new CfnOutput(this, 'dbEndpoint', {
      value: db.instance.instanceEndpoint.hostname,
    });

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
      'FargateNodeService',
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
            GOOGLE_CLIENT_ID:
              '274008686939-oejqk1po6q1qd8krlcqsgk3brih10qgm.apps.googleusercontent.com',
            AWS_S3_BUCKET: s3Bucket.bucketName,
            ENVIRONMENT: 'production',
            NODE_ENV: 'production',

            // move to secrets
            NEXTAUTH_SECRET:
              '263dfdaa81588b662f576fa193e3f8f36c92096eae99814f0d9fc1b3907afa77',
            GOOGLE_CLIENT_SECRET: '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',
            OPENAI_API_KEY:
              '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',
          },
          secrets: {
            AWS_RDS_DB_CREDS: ecs.Secret.fromSecretsManager(db.creds),
            //NEXTAUTH_SECRET: ecs.Secret.fromSecretsManager(),
            //GOOGLE_CLIENT_SECRET: ecs.Secret.fromSecretsManager(),
            //OPENAI_API_KEY: ecs.Secret.fromSecretsManager(),
          },
          containerName: 'nodejs-app-container',
          family: 'fargate-node-task-defn',
          containerPort: 3000,
          executionRole,
        },
        cpu: 256,
        memoryLimitMiB: 512,
        desiredCount: 1,
        serviceName: 'fargate-node-service',
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

    // appService.grantConnectionsToSecurityGroups(db.instance.connections);
    appService.targetGroup.configureHealthCheck({
      path: '/api/app-cont-health',
      healthyThresholdCount: 2,
    });
    appService.targetGroup.setAttribute(
      'deregistration_delay.timeout_seconds',
      '10',
    );

    const distribution = new cloudfront.Distribution(this, 'SiteDistribution', {
      certificate: certificate,
      domainNames: ['ci.auditre.co', 'app.ci.auditre.co'],
      minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
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
        }),
        compress: true,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: new cloudfront.CachePolicy(this, 'AppCachePolicy', {
          headerBehavior: cloudfront.CacheHeaderBehavior.allowList('Host'),
          cookieBehavior: cloudfront.CacheCookieBehavior.all(),
          queryStringBehavior: cloudfront.CacheQueryStringBehavior.all(),
          defaultTtl: Duration.seconds(5),
          minTtl: Duration.seconds(5),
          maxTtl: Duration.seconds(5),
          enableAcceptEncodingBrotli: true,
          enableAcceptEncodingGzip: true,
        }),
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
