import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Duration } from 'aws-cdk-lib';


export interface MakeLambdaProps {
    scope: Construct;
    name: string;
    fileName: string;
    tableName?: string;
    bucketName?: string;
    timeout?: Duration;
    memory?: number;
}
export function MakeLambda(props: MakeLambdaProps) {
    const { scope, name, fileName, tableName, bucketName } = props;
    const lambdaBuildDir = "./functions/dist";
    const env: Record<string,string> = {};
    if(bucketName) {
        env.BUCKET_NAME = bucketName
    }
    if(tableName) {
        env.TABLE_NAME= tableName
    }

    return new lambda.Function(scope, name, {
        runtime: lambda.Runtime.NODEJS_20_X,
        memorySize: props.memory ?? 128,
        code: lambda.Code.fromAsset(lambdaBuildDir),
        handler: `${fileName}.handler`,
        environment: env,
        logRetention: logs.RetentionDays.ONE_WEEK, 
        timeout:props.timeout ?? Duration.seconds(15),
    });
}