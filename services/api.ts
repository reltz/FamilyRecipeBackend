import { RemovalPolicy } from 'aws-cdk-lib';
import * as apiGateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';

export interface APIServiceProps {
    loginLambda: lambda.Function;
    crudLambda: lambda.Function;
    authorizer: lambda.Function;
}

export class APIService extends Construct {
    public readonly api: apiGateway.RestApi;

    constructor(scope: Construct, id: string, props: APIServiceProps) {
        super(scope, id);

        this.api = new apiGateway.RestApi(this, 'FamilyRecipeAPI');

         // Authorizer
        const jwtAuthorizer = new apiGateway.TokenAuthorizer(this, 'JwtAuthorizer', {
            handler: props.authorizer,
        });

        // Login
        const loginIntegration = new apiGateway.LambdaIntegration(props.loginLambda);
        this.api.root.addResource('login').addMethod('GET', loginIntegration);

        // CRUD
        const crudIntegration = new apiGateway.LambdaIntegration(props.crudLambda);
        const recipesResource = this.api.root.addResource('recipes');
        const proxyResource = recipesResource.addResource('{proxy+}');
        proxyResource.addMethod('ANY', crudIntegration, {
            authorizer: jwtAuthorizer,
        });       
    }
}
