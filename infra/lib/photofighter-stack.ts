import * as cdk from "aws-cdk-lib";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as cognito from "aws-cdk-lib/aws-cognito";
import { Construct } from "constructs";

export class PhotoFighterStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Cognito User Pool（hanashite-tsukurun と共有）
    const userPool = cognito.UserPool.fromUserPoolId(
      this,
      "SharedUserPool",
      "ap-northeast-1_VNCSv95Dm"
    );

    // photofighter 用アプリクライアント
    const userPoolClient = new cognito.UserPoolClient(
      this,
      "PhotoFighterClient",
      {
        userPool,
        userPoolClientName: "photofighter",
        authFlows: {
          userPassword: true,
          userSrp: true,
        },
        generateSecret: false,
        accessTokenValidity: cdk.Duration.hours(1),
        idTokenValidity: cdk.Duration.hours(1),
        refreshTokenValidity: cdk.Duration.days(7),
      }
    );
    cdk.Tags.of(userPoolClient).add("name", "photofighter-cognito-client");

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

    // Lambda 関数（FastAPI バックエンド）
    const apiFunction = new lambda.DockerImageFunction(this, "ApiFunction", {
      functionName: "photofighter-api",
      code: lambda.DockerImageCode.fromImageAsset("../backend"),
      memorySize: 512,
      timeout: cdk.Duration.seconds(30),
      architecture: lambda.Architecture.ARM_64,
      environment: {
        DYNAMODB_TABLE_USERS: usersTable.tableName,
        DYNAMODB_TABLE_CHARACTERS: charactersTable.tableName,
        S3_BUCKET_SPRITES: spritesBucket.bucketName,
        AWS_REGION_NAME: this.region,
        COGNITO_USER_POOL_ID: "ap-northeast-1_VNCSv95Dm",
        COGNITO_CLIENT_ID: userPoolClient.userPoolClientId,
      },
    });
    cdk.Tags.of(apiFunction).add("name", "photofighter-api");

    // Lambda に DynamoDB / S3 / Bedrock アクセス権限を付与
    usersTable.grantReadWriteData(apiFunction);
    charactersTable.grantReadWriteData(apiFunction);
    spritesBucket.grantReadWrite(apiFunction);
    apiFunction.addToRolePolicy(
      new cdk.aws_iam.PolicyStatement({
        effect: cdk.aws_iam.Effect.ALLOW,
        actions: ["bedrock:InvokeModel"],
        resources: ["*"],
      })
    );

    // Lambda Function URL
    const functionUrl = apiFunction.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
    });
    cdk.Tags.of(apiFunction).add("name", "photofighter-api");

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
        additionalBehaviors: {
          "/api/*": {
            origin: new origins.FunctionUrlOrigin(functionUrl),
            viewerProtocolPolicy:
              cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
            cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
            allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
            originRequestPolicy:
              cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
          },
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

    // 出力
    new cdk.CfnOutput(this, "FrontendUrl", {
      value: `https://${distribution.distributionDomainName}`,
    });
    new cdk.CfnOutput(this, "SpritesBucketName", {
      value: spritesBucket.bucketName,
    });
    new cdk.CfnOutput(this, "ApiUrl", {
      value: functionUrl.url,
    });
    new cdk.CfnOutput(this, "CognitoUserPoolId", {
      value: "ap-northeast-1_VNCSv95Dm",
    });
    new cdk.CfnOutput(this, "CognitoClientId", {
      value: userPoolClient.userPoolClientId,
    });
  }
}
