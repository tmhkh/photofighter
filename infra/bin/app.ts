#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { PhotoFighterStack } from "../lib/photofighter-stack";

const app = new cdk.App();

new PhotoFighterStack(app, "PhotoFighterStack", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || "ap-northeast-1",
  },
  tags: {
    name: "photofighter",
    project: "photofighter",
    environment: "production",
  },
});
