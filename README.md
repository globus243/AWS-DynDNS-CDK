# About

Build a DynDNS in the AWS to update your Route53 entries based on web requests and deploy it using [AWS CDK](https://docs.aws.amazon.com/cdk/v2/guide/cli.html)

A full guide can be found on https://blog.timhartmann.de/2022/01/07/cdk-dyndns/

based on https://github.com/awslabs/route53-dynamic-dns-with-lambda

## How To

### Install Prerequisites

1. If not already done you can [install CDK](https://docs.aws.amazon.com/cdk/v2/guide/getting_started.html) as follows:

    ``` bash
    $ npm install -g aws-cdk
    ```

2. We will also need the [AWS-CLI](https://aws.amazon.com/cli/) configured to use our account. CDK will use the authentication to do all the AWS calls for us.
Use the AWS Docs to install it, depending on your OS:
https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html

3. and run:

    ``` bash
    $ aws configure
    ```

follow the guide and everything should be setup.

### Clone Repo

``` bash
$ git clone https://github.com/globus243/AWS-DynDNS-CDK.git
```

### Change the Source

1. On line 18 in  ```lib/dyndns_lambda-stack.ts``` enter your hosted zone name
2. Adjust the setting to fit you: ```src/lambda_s3_config/config.json```

### Deploy

Translate files to js

``` bash
$ npm run build
```

Synthesize a cloudformation template

``` bash
$ cdk synth
```

deploy it to your AWS Accpimt

``` bash
$ cdk deploy
```
