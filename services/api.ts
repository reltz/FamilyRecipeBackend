import { Cors } from 'aws-cdk-lib/aws-apigateway';
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

        this.api = new apiGateway.RestApi(this, 'FamilyRecipeAPI', {
            binaryMediaTypes: ['multipart/form-data'], // add this line
        });

        // Authorizer
        const jwtAuthorizer = new apiGateway.TokenAuthorizer(this, 'JwtAuthorizer', {
            handler: props.authorizer,
        });

        // Login
        const loginIntegration = new apiGateway.LambdaIntegration(props.loginLambda);
        const loginResource = this.api.root.addResource('login', {
            defaultCorsPreflightOptions: {
                allowOrigins: Cors.ALL_ORIGINS, // Change to your frontend domain if needed //ROD TODO
                allowMethods: Cors.ALL_METHODS,
                allowHeaders: ['Content-Type'],
            },
        });
        loginResource.addMethod('POST', loginIntegration, {
            // CORS for login API
            methodResponses: [{
                statusCode: '200',
                responseParameters: {
                    'method.response.header.Access-Control-Allow-Origin': true,
                    'method.response.header.Access-Control-Allow-Methods': true,
                    'method.response.header.Access-Control-Allow-Headers': true,
                },
            }],
        });

        // CRUD
        const crudIntegration = new apiGateway.LambdaIntegration(props.crudLambda);

        const recipesResource = this.api.root.addResource('recipes', {
            defaultCorsPreflightOptions: {
                allowOrigins: Cors.ALL_ORIGINS, // Change to your frontend domain if needed
                allowMethods: Cors.ALL_METHODS,
                allowHeaders: ['Content-Type', 'Authorization'],
            },
        });

        const proxyResource = recipesResource.addResource('{proxy+}');
        proxyResource.addMethod('ANY', crudIntegration, {
            authorizer: jwtAuthorizer,
        });
    }
}
