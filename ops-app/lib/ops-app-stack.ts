import * as cdk from 'aws-cdk-lib';
import * as path from 'path';
import { Construct } from 'constructs';
// import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as iam from 'aws-cdk-lib/aws-iam';
import { ManagedPolicy } from 'aws-cdk-lib/aws-iam';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as ecsPatterns from 'aws-cdk-lib/aws-ecs-patterns';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as cloudfrontOrigins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as targets from 'aws-cdk-lib/aws-route53-targets';
import {
  ApplicationLoadBalancer,
  ApplicationProtocol,
} from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import {
  GithubActionsRole,
  GithubActionsIdentityProvider,
} from 'aws-cdk-github-oidc';

export class OpsAppStack extends cdk.Stack {
  constructor(
    scope: Construct,
    id: string,
    props?: cdk.StackProps & { certificateArn: string },
  ) {
    super(scope, id, props);

    // const repo = new ecr.Repository(this, 'Repo', {
    //   repositoryName: 'auditre-fargate-app',
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
    new cdk.CfnOutput(this, 'Github Actions app upload role', {
      value: deployRole.roleArn,
    });

    new s3.Bucket(this, 's3', {
      bucketName: 'auditre-app-org-files',
      publicReadAccess: false,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // should be RETAINED for prod
      enforceSSL: true,
      versioned: false, // should be true for prod
      cors: [
        {
          allowedMethods: [
            s3.HttpMethods.GET,
            s3.HttpMethods.POST,
            s3.HttpMethods.PUT,
          ],
          allowedOrigins: ['http://localhost:3000', 'https://ci.auditre.co'],
          allowedHeaders: ['*'],
        },
      ],
      /**
       * For sample purposes only, if you create an S3 bucket then populate it, stack destruction fails.  This
       * setting will enable full cleanup of the demo.
       */
      autoDeleteObjects: true, // NOT recommended for production code
      //objectLockEnabled: true, // should be true for prod
    });

    // https://www.cloudtechsimplified.com/ci-cd-pipeline-aws-fargate-github-actions-nodejs/

    const vpc = new ec2.Vpc(this, 'FargateNodeJsVpc', {
      maxAzs: 2,
      natGateways: 1,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'ingress',
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: 'application',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
      ],
    });

    const loadbalancer = new ApplicationLoadBalancer(this, 'lb', {
      vpc,
      internetFacing: true, // change this to false when fixed
      vpcSubnets: vpc.selectSubnets({
        subnetType: ec2.SubnetType.PUBLIC,
      }),
    });

    const cluster = new ecs.Cluster(this, 'Cluster', {
      vpc,
      clusterName: 'fargate-node-cluster',
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
          image: ecs.ContainerImage.fromAsset(
            path.dirname('../app/Dockerfile'),
          ),
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
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        }),
        loadBalancer: loadbalancer,
        // TODO: Switch back to HTTPS
        // protocol: ApplicationProtocol.HTTPS,
        // certificate,
      },
    );
    appService.targetGroup.configureHealthCheck({
      path: '/api/app-cont-health',
    });

    const distribution = new cloudfront.Distribution(this, 'SiteDistribution', {
      certificate: certificate,
      //defaultRootObject: 'index.html',
      domainNames: ['ci.auditre.co', 'app.ci.auditre.co'],
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
        origin: new cloudfrontOrigins.LoadBalancerV2Origin(loadbalancer, {
          // TODO: Switch back to HTTPS
          protocolPolicy: cloudfront.OriginProtocolPolicy.HTTP_ONLY,
        }),
        compress: true,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
      httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
    });

    new cdk.CfnOutput(this, 'DistributionId', {
      value: distribution.distributionId,
    });

    // const zone2 = route53.HostedZone.fromLookup(this, 'Zone', {
    //   domainName: 'ci.auditre.co',
    // });
    const zone = route53.HostedZone.fromHostedZoneAttributes(this, 'Zone', {
      hostedZoneId: 'Z08761632QPQYDP4XYUV2',
      zoneName: 'ci.auditre.co',
    });
    new route53.ARecord(this, 'AppAliasRecord', {
      recordName: 'app.ci.auditre.co',
      target: route53.RecordTarget.fromAlias(
        new targets.CloudFrontTarget(distribution),
      ),
      zone,
    });
  }
}
