#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { EuDressCodeStack } from '../lib/eu-dress-code-stack';

const app = new cdk.App();

new EuDressCodeStack(app, 'EuDressCodeStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: 'us-east-1', // CloudFront ACM requires us-east-1
  },
  description: 'EU Dress Code app — S3/CloudFront/Lambda/ApiGateway',
});
