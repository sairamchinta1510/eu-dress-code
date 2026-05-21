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
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as cloudwatchActions from 'aws-cdk-lib/aws-cloudwatch-actions';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as snsSubscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import { Construct } from 'constructs';
import * as path from 'path';

const ALERT_EMAIL = 'sairamchinta@gmail.com';

const DOMAIN_NAME = 'eudresscode.tadpoleindustries.com';
const HOSTED_ZONE_ID = 'Z0650233B5QZHL1QIP47';
const HOSTED_ZONE_NAME = 'tadpoleindustries.com';
const GEMINI_SSM_PARAM_NAME = '/eu-dress-code/GEMINI_API_KEY';
export class EuDressCodeStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // CloudFront requires ACM certificates to be in us-east-1 — enforce at synth time.
    // this.region is concrete because app.ts always passes env.region explicitly.
    if (this.region !== 'us-east-1') {
      throw new Error(
        `EuDressCodeStack must be deployed to us-east-1 (CloudFront ACM constraint). Got: ${this.region}`
      );
    }

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
    const ssmParamArn = `arn:aws:ssm:${this.region}:${this.account}:parameter${GEMINI_SSM_PARAM_NAME}`;
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
      environment: {
        GEMINI_SSM_PARAM: GEMINI_SSM_PARAM_NAME,
      },
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

    // ── Monitoring ────────────────────────────────────────────────────────────

    // SNS topic for all alerts
    const alertTopic = new sns.Topic(this, 'AlertTopic', {
      topicName: 'eu-dress-code-alerts',
      displayName: 'Dress Perfectly Alerts',
    });
    alertTopic.addSubscription(new snsSubscriptions.EmailSubscription(ALERT_EMAIL));

    const snsAction = new cloudwatchActions.SnsAction(alertTopic);

    // Helper: create standard Lambda alarms for a function
    const lambdaAlarms = (fn: lambda.IFunction, name: string) => {
      // Errors > 0 in any 1-minute window
      fn.metricErrors({ period: cdk.Duration.minutes(1) })
        .createAlarm(this, `${name}Errors`, {
          alarmName: `${fn.functionName}-errors`,
          alarmDescription: `${name} threw errors`,
          threshold: 1,
          evaluationPeriods: 1,
          comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
          treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
        })
        .addAlarmAction(snsAction);

      // Throttles > 0 in any 1-minute window
      fn.metricThrottles({ period: cdk.Duration.minutes(1) })
        .createAlarm(this, `${name}Throttles`, {
          alarmName: `${fn.functionName}-throttles`,
          alarmDescription: `${name} is being throttled`,
          threshold: 1,
          evaluationPeriods: 1,
          comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
          treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
        })
        .addAlarmAction(snsAction);

      // P99 duration > 20 s (timeout is 28 s — warn with 8 s headroom)
      fn.metricDuration({ period: cdk.Duration.minutes(5), statistic: 'p99' })
        .createAlarm(this, `${name}HighLatency`, {
          alarmName: `${fn.functionName}-high-latency`,
          alarmDescription: `${name} p99 latency > 20 s`,
          threshold: 20_000,
          evaluationPeriods: 2,
          comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
          treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
        })
        .addAlarmAction(snsAction);
    };

    lambdaAlarms(searchFn, 'Search');
    lambdaAlarms(analyzeClosetFn, 'AnalyzeCloset');

    // Route 53 health check — HTTPS GET on the site root
    const healthCheck = new route53.CfnHealthCheck(this, 'SiteHealthCheck', {
      healthCheckConfig: {
        type: 'HTTPS',
        fullyQualifiedDomainName: DOMAIN_NAME,
        port: 443,
        resourcePath: '/',
        requestInterval: 30,
        failureThreshold: 3,
      },
      healthCheckTags: [{ key: 'Name', value: 'eu-dress-code-site' }],
    });

    // Route 53 health check metrics are only available in us-east-1
    new cloudwatch.Alarm(this, 'SiteUptimeAlarm', {
      alarmName: 'eu-dress-code-site-down',
      alarmDescription: `${DOMAIN_NAME} failed health check 3 times in a row`,
      metric: new cloudwatch.Metric({
        namespace: 'AWS/Route53',
        metricName: 'HealthCheckStatus',
        dimensionsMap: { HealthCheckId: healthCheck.ref },
        period: cdk.Duration.minutes(1),
        statistic: 'Minimum',
      }),
      threshold: 1,
      evaluationPeriods: 3,
      comparisonOperator: cloudwatch.ComparisonOperator.LESS_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.BREACHING,
    }).addAlarmAction(snsAction);

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
