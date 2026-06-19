import * as cdk from "aws-cdk-lib";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as iam from "aws-cdk-lib/aws-iam";
import * as wafv2 from "aws-cdk-lib/aws-wafv2";
import { Construct } from "constructs";

export class PhotoFighterStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // DynamoDB テーブル
    const usersTable = new dynamodb.Table(this, "UsersTable", {
      tableName: "photofighter-users",
      partitionKey: { name: "user_id", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });
    cdk.Tags.of(usersTable).add("name", "photofighter-users");

    const charactersTable = new dynamodb.Table(this, "CharactersTable", {
      tableName: "photofighter-characters",
      partitionKey: {
        name: "character_id",
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });
    cdk.Tags.of(charactersTable).add("name", "photofighter-characters");

    charactersTable.addGlobalSecondaryIndex({
      indexName: "user-id-index",
      partitionKey: { name: "user_id", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "created_at", type: dynamodb.AttributeType.STRING },
    });

    // S3 バケット（スプライトシート保存用）
    const spritesBucket = new s3.Bucket(this, "SpritesBucket", {
      bucketName: `photofighter-sprites-${this.account}`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      lifecycleRules: [
        {
          id: "delete-unused-sprites",
          expiration: cdk.Duration.days(90),
          enabled: true,
        },
      ],
    });
    cdk.Tags.of(spritesBucket).add("name", "photofighter-sprites");

    // フロントエンド配信用 S3
    const frontendBucket = new s3.Bucket(this, "FrontendBucket", {
      bucketName: `photofighter-frontend-${this.account}`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });
    cdk.Tags.of(frontendBucket).add("name", "photofighter-frontend");

    // CloudFront
    const distribution = new cloudfront.Distribution(
      this,
      "FrontendDistribution",
      {
        defaultBehavior: {
          origin:
            origins.S3BucketOrigin.withOriginAccessControl(frontendBucket),
          viewerProtocolPolicy:
            cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        },
        defaultRootObject: "index.html",
        errorResponses: [
          {
            httpStatus: 404,
            responsePagePath: "/index.html",
            responseHttpStatus: 200,
            ttl: cdk.Duration.seconds(0),
          },
        ],
      }
    );
    cdk.Tags.of(distribution).add("name", "photofighter-cdn");

    // WAF (OWASP Top 10)
    const webAcl = new wafv2.CfnWebACL(this, "WebAcl", {
      name: "photofighter-waf",
      scope: "CLOUDFRONT",
      defaultAction: { allow: {} },
      visibilityConfig: {
        cloudWatchMetricsEnabled: true,
        metricName: "photofighter-waf",
        sampledRequestsEnabled: true,
      },
      rules: [
        {
          name: "AWSManagedRulesCommonRuleSet",
          priority: 1,
          overrideAction: { none: {} },
          statement: {
            managedRuleGroupStatement: {
              vendorName: "AWS",
              name: "AWSManagedRulesCommonRuleSet",
            },
          },
          visibilityConfig: {
            cloudWatchMetricsEnabled: true,
            metricName: "CommonRuleSet",
            sampledRequestsEnabled: true,
          },
        },
      ],
    });
    cdk.Tags.of(webAcl).add("name", "photofighter-waf");

    // App Runner 用 IAM ロール
    const appRunnerRole = new iam.Role(this, "AppRunnerRole", {
      roleName: "photofighter-apprunner-role",
      assumedBy: new iam.ServicePrincipal("tasks.apprunner.amazonaws.com"),
    });
    usersTable.grantReadWriteData(appRunnerRole);
    charactersTable.grantReadWriteData(appRunnerRole);
    spritesBucket.grantReadWrite(appRunnerRole);
    appRunnerRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["bedrock:InvokeModel"],
        resources: ["*"],
      })
    );
    cdk.Tags.of(appRunnerRole).add("name", "photofighter-apprunner-role");

    // 出力
    new cdk.CfnOutput(this, "FrontendUrl", {
      value: `https://${distribution.distributionDomainName}`,
    });
    new cdk.CfnOutput(this, "SpritesBucketName", {
      value: spritesBucket.bucketName,
    });
  }
}
