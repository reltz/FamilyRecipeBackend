import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';

export class LambdaService extends Construct {
    public readonly loginLambda: lambda.Function;
    public readonly crudLambda: lambda.Function;
    public readonly authorizer: lambda.Function;

    private lambdaBuildDir = "./functions/dist";

    constructor(scope: Construct, id: string, props: { table: dynamodb.Table; bucket: s3.Bucket }) {
        super(scope, id);

        this.loginLambda = new lambda.Function(this, 'LoginFunction', {
            runtime: lambda.Runtime.NODEJS_20_X,
            memorySize: 128,
            code: lambda.Code.fromAsset(this.lambdaBuildDir), 
            handler: 'login.handler',
            environment: {
                TABLE_NAME: props.table.tableName,
            },
        });

        this.crudLambda = new lambda.Function(this, 'CrudFunction', {
            runtime: lambda.Runtime.NODEJS_20_X,
            code: lambda.Code.fromAsset(this.lambdaBuildDir),
            handler: 'crud.handler',
            memorySize: 128,
            environment: {
                TABLE_NAME: props.table.tableName,
                BUCKET_NAME: props.bucket.bucketName,
            },
        });

        this.authorizer = new lambda.Function(this, 'Authorizer', {
            runtime: lambda.Runtime.NODEJS_20_X,
            handler: 'authorizer.handler',
            memorySize: 128,
            code: lambda.Code.fromAsset(this.lambdaBuildDir),
            environment: {
                TABLE_NAME: props.table.tableName,
            },
        });

        // Grant permissions
        props.table.grantReadData(this.loginLambda);

        props.table.grantReadWriteData(this.crudLambda);
        props.bucket.grantReadWrite(this.crudLambda);

        props.table.grantReadData(this.authorizer);
    }
}
