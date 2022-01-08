#!/usr/bin/env node
import * as cdk from '@aws-cdk/core';
import { DyndnsLambdaStack } from '../lib/dyndns_lambda-stack';

const app = new cdk.App();
new DyndnsLambdaStack(app, 'DyndnsLambdaStack', {

  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT, 
    region: process.env.CDK_DEFAULT_REGION 
  }

});
