import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as route53Targets from 'aws-cdk-lib/aws-route53-targets';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as apigwv2Integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import * as path from 'path';

const DOMAIN_NAME = 'eudresscode.tadpoleindustries.com';
const HOSTED_ZONE_ID = 'Z0650233B5QZHL1QIP47';
const HOSTED_ZONE_NAME = 'tadpoleindustries.com';
export class EuDressCodeStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ── Route 53 ────────────────────────────────────────────────────────────
    const hostedZone = route53.HostedZone.fromHostedZoneAttributes(this, 'HostedZone', {
      hostedZoneId: HOSTED_ZONE_ID,
      zoneName: HOSTED_ZONE_NAME,
    });

    // ── ACM Certificate (must be us-east-1 for CloudFront) ──────────────────
    const certificate = new acm.Certificate(this, 'Certificate', {
      domainName: DOMAIN_NAME,
      validation: acm.CertificateValidation.fromDns(hostedZone),
    });

    // ── S3 Bucket (private; served via CloudFront OAC) ───────────────────────
    const siteBucket = new s3.Bucket(this, 'SiteBucket', {
      bucketName: `eu-dress-code-site-${this.account}`,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      autoDeleteObjects: false,
    });

    // ── Lambda: shared IAM policy for SSM ────────────────────────────────────
    const ssmParamArn = `arn:aws:ssm:${this.region}:${this.account}:parameter/eu-dress-code/GEMINI_API_KEY`;
    // NOTE: Assumes the SSM parameter uses the default aws/ssm managed key.
    // If a CMK is used, also add kms:Decrypt on the key ARN.
    const ssmReadPolicy = new iam.PolicyStatement({
      actions: ['ssm:GetParameter'],
      resources: [ssmParamArn],
    });

    const lambdaDefaults: Partial<lambdaNodejs.NodejsFunctionProps> = {
      runtime: lambda.Runtime.NODEJS_20_X,
      timeout: cdk.Duration.seconds(28),
      memorySize: 256,
      // entry paths are outside infra/, so set projectRoot to repo root
      projectRoot: path.join(__dirname, '../..'),
    };

    // ── Lambda: analyze-closet ────────────────────────────────────────────────
    const analyzeClosetFn = new lambdaNodejs.NodejsFunction(this, 'AnalyzeClosetFn', {
      ...lambdaDefaults,
      entry: path.join(__dirname, '../../lambda/analyze-closet/index.ts'),
      handler: 'handler',
      functionName: 'eu-dress-code-analyze-closet',
    });
    analyzeClosetFn.addToRolePolicy(ssmReadPolicy);

    // ── Lambda: search ────────────────────────────────────────────────────────
    const searchFn = new lambdaNodejs.NodejsFunction(this, 'SearchFn', {
      ...lambdaDefaults,
      entry: path.join(__dirname, '../../lambda/search/index.ts'),
      handler: 'handler',
      functionName: 'eu-dress-code-search',
    });
    searchFn.addToRolePolicy(ssmReadPolicy);

    // ── API Gateway HTTP API ──────────────────────────────────────────────────
    const httpApi = new apigwv2.HttpApi(this, 'HttpApi', {
      apiName: 'eu-dress-code-api',
      corsPreflight: {
        allowOrigins: [`https://${DOMAIN_NAME}`],
        allowMethods: [apigwv2.CorsHttpMethod.POST, apigwv2.CorsHttpMethod.OPTIONS],
        allowHeaders: ['Content-Type'],
        maxAge: cdk.Duration.days(1),
      },
    });

    httpApi.addRoutes({
      path: '/api/analyze-closet',
      methods: [apigwv2.HttpMethod.POST],
      integration: new apigwv2Integrations.HttpLambdaIntegration('AnalyzeClosetIntegration', analyzeClosetFn),
    });

    httpApi.addRoutes({
      path: '/api/search',
      methods: [apigwv2.HttpMethod.POST],
      integration: new apigwv2Integrations.HttpLambdaIntegration('SearchIntegration', searchFn),
    });

    // API Gateway domain: {apiId}.execute-api.{region}.amazonaws.com
    const apiGatewayDomain = `${httpApi.httpApiId}.execute-api.${this.region}.amazonaws.com`;

    // ── CloudFront ────────────────────────────────────────────────────────────
    const oac = new cloudfront.S3OriginAccessControl(this, 'OAC');

    const s3Origin = origins.S3BucketOrigin.withOriginAccessControl(siteBucket, {
      originAccessControl: oac,
    });

    const apiOrigin = new origins.HttpOrigin(apiGatewayDomain, {
      protocolPolicy: cloudfront.OriginProtocolPolicy.HTTPS_ONLY,
    });

    const distribution = new cloudfront.Distribution(this, 'Distribution', {
      domainNames: [DOMAIN_NAME],
      certificate,
      defaultRootObject: 'index.html',
      // SPA routing: map 403/404 from S3 back to index.html
      errorResponses: [
        { httpStatus: 403, responseHttpStatus: 200, responsePagePath: '/index.html', ttl: cdk.Duration.seconds(0) },
        { httpStatus: 404, responseHttpStatus: 200, responsePagePath: '/index.html', ttl: cdk.Duration.seconds(0) },
      ],
      defaultBehavior: {
        origin: s3Origin,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        compress: true,
      },
      additionalBehaviors: {
        '/api/*': {
          origin: apiOrigin,
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.HTTPS_ONLY,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
          originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
        },
      },
    });

    // Grant CloudFront OAC read access to the S3 bucket
    siteBucket.addToResourcePolicy(
      new iam.PolicyStatement({
        actions: ['s3:GetObject'],
        resources: [siteBucket.arnForObjects('*')],
        principals: [new iam.ServicePrincipal('cloudfront.amazonaws.com')],
        conditions: {
          StringEquals: {
            'AWS:SourceArn': `arn:aws:cloudfront::${this.account}:distribution/${distribution.distributionId}`,
          },
        },
      })
    );

    // ── Route 53 alias record ─────────────────────────────────────────────────
    new route53.ARecord(this, 'AliasRecord', {
      zone: hostedZone,
      recordName: 'eudresscode',
      target: route53.RecordTarget.fromAlias(new route53Targets.CloudFrontTarget(distribution)),
    });

    // ── Outputs (used by deploy.ps1) ──────────────────────────────────────────
    new cdk.CfnOutput(this, 'BucketName', {
      value: siteBucket.bucketName,
      exportName: 'EuDressCodeBucketName',
    });
    new cdk.CfnOutput(this, 'DistributionId', {
      value: distribution.distributionId,
      exportName: 'EuDressCodeDistributionId',
    });
    new cdk.CfnOutput(this, 'SiteUrl', {
      value: `https://${DOMAIN_NAME}`,
    });
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: httpApi.apiEndpoint,
      description: 'HTTP API endpoint for Lambda functions',
    });
  }
}
