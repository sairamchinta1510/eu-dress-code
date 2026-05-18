#!/usr/bin/env pwsh
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

Write-Host "==> CDK bootstrap (safe to re-run)" -ForegroundColor Cyan
Set-Location "$PSScriptRoot\infra"
npx cdk bootstrap aws://913111977146/us-east-1

Write-Host "==> CDK deploy" -ForegroundColor Cyan
npx cdk deploy EuDressCodeStack --require-approval never --outputs-file ..\cdk-outputs.json

Write-Host "==> Reading CDK outputs" -ForegroundColor Cyan
$outputs = Get-Content "$PSScriptRoot\cdk-outputs.json" | ConvertFrom-Json
$bucketName = $outputs.EuDressCodeStack.BucketName
$distributionId = $outputs.EuDressCodeStack.DistributionId

Write-Host "  Bucket:       $bucketName"
Write-Host "  Distribution: $distributionId"

Write-Host "==> Building React app" -ForegroundColor Cyan
Set-Location $PSScriptRoot
npm run build

Write-Host "==> Syncing to S3" -ForegroundColor Cyan
aws s3 sync build/ "s3://$bucketName" --delete --region us-east-1

Write-Host "==> Invalidating CloudFront cache" -ForegroundColor Cyan
aws cloudfront create-invalidation --distribution-id $distributionId --paths "/*" --region us-east-1

Write-Host "==> Done! Site live at https://eudresscode.tadpoleindustries.com" -ForegroundColor Green
