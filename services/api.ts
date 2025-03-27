import { Cors } from 'aws-cdk-lib/aws-apigateway';
import * as apiGateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import { Duration } from 'aws-cdk-lib';

export interface APIServiceProps {
    loginLambda: lambda.Function;
    crudLambda: lambda.Function;
    authorizer: lambda.Function;
    s3PreSignedLambda: lambda.Function;
}

export class APIService extends Construct {
    public readonly api: apiGateway.RestApi;

    constructor(scope: Construct, id: string, props: APIServiceProps) {
        super(scope, id);

        this.api = new apiGateway.RestApi(this, 'FamilyRecipeAPI', {
            deployOptions: {
                // loggingLevel: apiGateway.MethodLoggingLevel.OFF,
                // dataTraceEnabled: false, // Logs input/output for API request
            }
        });

        // Authorizer
        const jwtAuthorizer = new apiGateway.TokenAuthorizer(this, 'JwtAuthorizer', {
            handler: props.authorizer,
            // resultsCacheTtl: Duration.seconds(0)
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


        // PRE-SIGNED PHOTO URL
        const preSignedIntegration = new apiGateway.LambdaIntegration(props.s3PreSignedLambda);
        const getPreSignedUrlForPhotoUpload = recipesResource.addResource('get-bucket-url');
        getPreSignedUrlForPhotoUpload.addMethod('GET',  preSignedIntegration, {
            authorizer: jwtAuthorizer,
            methodResponses: [{
                statusCode: '200',
                responseParameters: {
                    'method.response.header.Access-Control-Allow-Origin': true,
                    'method.response.header.Access-Control-Allow-Methods': true,
                    'method.response.header.Access-Control-Allow-Headers': true,
                },
            }, {
                statusCode: '400', // Bad Request
                responseParameters: {
                    'method.response.header.Access-Control-Allow-Origin': true,
                    'method.response.header.Access-Control-Allow-Methods': true,
                    'method.response.header.Access-Control-Allow-Headers': true,
                },
            },
            {
                statusCode: '403', 
                responseParameters: {
                    'method.response.header.Access-Control-Allow-Origin': true,
                    'method.response.header.Access-Control-Allow-Methods': true,
                    'method.response.header.Access-Control-Allow-Headers': true,
                },
            }, 
            {
                statusCode: '404', 
                responseParameters: {
                    'method.response.header.Access-Control-Allow-Origin': true,
                    'method.response.header.Access-Control-Allow-Methods': true,
                    'method.response.header.Access-Control-Allow-Headers': true,
                },
            }, 
            {
                statusCode: '500', // Internal Server Error
                responseParameters: {
                    'method.response.header.Access-Control-Allow-Origin': true,
                    'method.response.header.Access-Control-Allow-Methods': true,
                    'method.response.header.Access-Control-Allow-Headers': true,
                },
            }],
        })

        const listRecipesResource = recipesResource.addResource('list-recipes');
        listRecipesResource.addMethod('GET', crudIntegration, {
            authorizer: jwtAuthorizer,
            methodResponses: [{
                statusCode: '200',
                responseParameters: {
                    'method.response.header.Access-Control-Allow-Origin': true,
                    'method.response.header.Access-Control-Allow-Methods': true,
                    'method.response.header.Access-Control-Allow-Headers': true,
                },
            }, {
                statusCode: '400', // Bad Request
                responseParameters: {
                    'method.response.header.Access-Control-Allow-Origin': true,
                    'method.response.header.Access-Control-Allow-Methods': true,
                    'method.response.header.Access-Control-Allow-Headers': true,
                },
            }, {
                statusCode: '500', // Internal Server Error
                responseParameters: {
                    'method.response.header.Access-Control-Allow-Origin': true,
                    'method.response.header.Access-Control-Allow-Methods': true,
                    'method.response.header.Access-Control-Allow-Headers': true,
                },
            }],
        });

        const likeRecipeResource = recipesResource.addResource('like-recipe');
        likeRecipeResource.addMethod('GET', crudIntegration, {
            authorizer: jwtAuthorizer,
            methodResponses: [{
                statusCode: '200',
                responseParameters: {
                    'method.response.header.Access-Control-Allow-Origin': true,
                    'method.response.header.Access-Control-Allow-Methods': true,
                    'method.response.header.Access-Control-Allow-Headers': true,
                },
            }, {
                statusCode: '400', // Bad Request
                responseParameters: {
                    'method.response.header.Access-Control-Allow-Origin': true,
                    'method.response.header.Access-Control-Allow-Methods': true,
                    'method.response.header.Access-Control-Allow-Headers': true,
                },
            }, {
                statusCode: '500', // Internal Server Error
                responseParameters: {
                    'method.response.header.Access-Control-Allow-Origin': true,
                    'method.response.header.Access-Control-Allow-Methods': true,
                    'method.response.header.Access-Control-Allow-Headers': true,
                },
            }],
        });

        // Create Recipe endpoint
        const createRecipeResource = recipesResource.addResource('create');
        createRecipeResource.addMethod('POST', crudIntegration, {
            authorizer: jwtAuthorizer,
            methodResponses: [{
                statusCode: '200',
                responseParameters: {
                    'method.response.header.Access-Control-Allow-Origin': true,
                    'method.response.header.Access-Control-Allow-Methods': true,
                    'method.response.header.Access-Control-Allow-Headers': true,
                },
            },
            {
                statusCode: '201',
                responseParameters: {
                    'method.response.header.Access-Control-Allow-Origin': true,
                    'method.response.header.Access-Control-Allow-Methods': true,
                    'method.response.header.Access-Control-Allow-Headers': true,
                },
            },
            {
                statusCode: '400', // Bad Request
                responseParameters: {
                    'method.response.header.Access-Control-Allow-Origin': true,
                    'method.response.header.Access-Control-Allow-Methods': true,
                    'method.response.header.Access-Control-Allow-Headers': true,
                },
            }, {
                statusCode: '500', // Internal Server Error
                responseParameters: {
                    'method.response.header.Access-Control-Allow-Origin': true,
                    'method.response.header.Access-Control-Allow-Methods': true,
                    'method.response.header.Access-Control-Allow-Headers': true,
                },
            }],
        });
    }
}
