# AWS CDK Stack for provisioning our wildcard SSL certificate.

It's required because certificates can only be provisioned in us-east-1. We
otherwise use us-east-2 for our infrastructure. Eventually we should be able
to use [crossRegionReferences](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_certificatemanager-readme.html#cross-region-certificates) in order to accomplish
this within existing stacks, but it's currently only experimental.

The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Useful commands

* `npm run build`   compile typescript to js
* `npm run watch`   watch for changes and compile
* `npm run test`    perform the jest unit tests
* `cdk deploy`      deploy this stack to your default AWS account/region
* `cdk diff`        compare deployed stack with current state
* `cdk synth`       emits the synthesized CloudFormation template


# To run
- npm install
- cdk bootstrap --profile auditre-prod
- cdk deploy --profile auditre-prod
This will output the ARN of the certificate to use for other stacks.