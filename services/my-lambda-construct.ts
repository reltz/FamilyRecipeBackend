import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';


export interface MakeLambdaProps {
    scope: Construct;
    name: string;
    fileName: string;
    tableName: string;
    bucketName?: string;
}
export function MakeLambda(props: MakeLambdaProps) {
    const { scope, name, fileName, tableName, bucketName } = props;
    const lambdaBuildDir = "./functions/dist";
    return new lambda.Function(scope, name, {
        runtime: lambda.Runtime.NODEJS_20_X,
        memorySize: 128,
        code: lambda.Code.fromAsset(lambdaBuildDir),
        handler: `${fileName}.handler`,
        environment: {
            TABLE_NAME: tableName,
        },
    });
}