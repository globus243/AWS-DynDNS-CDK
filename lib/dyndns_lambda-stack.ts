import * as cdk from '@aws-cdk/core';
import * as route53 from '@aws-cdk/aws-route53';
import * as s3deploy from '@aws-cdk/aws-s3-deployment';
import * as s3 from '@aws-cdk/aws-s3';
import * as lambda from '@aws-cdk/aws-lambda';
import * as apigateway from '@aws-cdk/aws-apigateway';
import * as acm from '@aws-cdk/aws-certificatemanager';
import * as iam from '@aws-cdk/aws-iam';
import * as route53Targets from '@aws-cdk/aws-route53-targets';
import { Duration } from '@aws-cdk/core';
import * as path from "path";

export class DyndnsLambdaStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // enter your hosted zone name here
    const route53Name: string = "__REPLACE_ME__" 

    const route53Zone
      = route53.HostedZone.fromLookup(this, 'Zone', { domainName: route53Name });
    
    const apiUri: string
      = "dyndns." + route53Name;

    // create config bucket
    const configBucket = new s3.Bucket(this, 'configBucket', {
      bucketName: "lambdadyndnsconfig",
      publicReadAccess: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // Deploy config file to S3 bucket
    new s3deploy.BucketDeployment(this, 'DeployWithInvalidation', {
      sources: [s3deploy.Source.asset('./src/lambda_s3_config')],
      destinationBucket: configBucket
    });

    // create lambda function
    const dyndnsLambda = new lambda.Function(this, 'Lambda', {
      code: lambda.Code.fromAsset(path.join(__dirname, '../src/dynamic_dns_lambda/')),
      handler: 'dynamic_dns_lambda.lambda_handler',
      runtime: lambda.Runtime.PYTHON_3_8,
      timeout: Duration.seconds(10)
    });
    configBucket.grantRead(dyndnsLambda);

    // create policy for lambda
    const lambdaPolicy = new iam.PolicyStatement({
      actions: [
        'route53:ChangeResourceRecordSets',
        'route53:ListResourceRecordSets'
      ],
      resources: ['arn:aws:route53:::hostedzone/' + route53Zone.hostedZoneId],
    });

    // attach policy to lambda
    dyndnsLambda.role?.attachInlinePolicy(
      new iam.Policy(this, 'list-buckets-policy', {
        statements: [lambdaPolicy],
      }),
    );
    
    const certificate = new acm.Certificate(this, 'Certificate', {
      domainName: apiUri,
      validation: acm.CertificateValidation.fromDns(route53Zone),
    });
    
    const restApi = new apigateway.LambdaRestApi(this, "dyndns-api", {
      handler: dyndnsLambda,
      proxy: false,
      domainName: {
        securityPolicy: apigateway.SecurityPolicy.TLS_1_2,
        domainName: apiUri,
        certificate: certificate,
        endpointType: apigateway.EndpointType.REGIONAL
      }
    });

    const methodResponse: apigateway.MethodResponse = {
      statusCode: "200", 
      responseModels: {"application/json": apigateway.Model.EMPTY_MODEL}
    }

    const integrationResponse: apigateway.IntegrationResponse = {
      statusCode: "200",
      contentHandling: apigateway.ContentHandling.CONVERT_TO_TEXT
    }

    new route53.ARecord(this, "apiDNS", {
      zone: route53Zone,
      recordName: apiUri,
      target: route53.RecordTarget.fromAlias(new route53Targets.ApiGateway(restApi)),
    });

    const requestTemplate: Object = {
      "execution_mode" : "$input.params('mode')",
      "source_ip" : "$context.identity.sourceIp",
      "set_hostname" : "$input.params('hostname')",
      "validation_hash" : "$input.params('hash')"
    }

    const dnydnsIntegration = new apigateway.LambdaIntegration(dyndnsLambda, {
      allowTestInvoke: true,
      proxy: false,
      integrationResponses: [integrationResponse],
      passthroughBehavior: apigateway.PassthroughBehavior.WHEN_NO_TEMPLATES,
      requestTemplates: { "application/json": JSON.stringify(requestTemplate) },
    });

    restApi.root.addMethod("GET", dnydnsIntegration, {
      methodResponses: [methodResponse]
    });
    
    new cdk.CfnOutput(this, 'URL', { value: apiUri + "/?mode=get" });

  }
}