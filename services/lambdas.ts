
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { MakeLambda } from './my-lambda-construct';
import { Duration } from 'aws-cdk-lib';

export class LambdaService extends Construct {
    public readonly loginLambda: lambda.Function;
    public readonly crudLambda: lambda.Function;
    public readonly authorizer: lambda.Function;
    public readonly controler: lambda.Function;
    public readonly preSignedUrl: lambda.Function;



    constructor(scope: Construct, id: string, props: { table: dynamodb.Table; bucket: s3.Bucket }) {
        super(scope, id);

        this.loginLambda = MakeLambda({
            fileName: 'login',
            name: 'LoginFunction',
            scope: this,
            tableName: props.table.tableName,
        })

        // Grant permissions
        props.table.grantReadWriteData(this.loginLambda);

        this.crudLambda = MakeLambda({
            fileName: 'crud',
            name: 'CrudFunction',
            scope: this,
            tableName: props.table.tableName,
            bucketName: props.bucket.bucketName,
        })
        props.table.grantReadWriteData(this.crudLambda);
        props.bucket.grantReadWrite(this.crudLambda);


        this.authorizer = MakeLambda({
            scope:this,
            name: 'Authorizer',
            fileName: 'authorizer',
            tableName: props.table.tableName
        })
        props.table.grantReadData(this.authorizer);

        this.controler = MakeLambda({
            scope: this,
            name: 'Controler',
            fileName: 'control',
            tableName: props.table.tableName,
        })
        props.table.grantReadWriteData(this.controler);


        this.preSignedUrl = MakeLambda({
            scope: this,
            fileName: 'pre-signed-s3',
            name: 'PreSignedUrlGenerator',
            bucketName: props.bucket.bucketName,
        })

        props.bucket.grantReadWrite(this.preSignedUrl);
    }
}
