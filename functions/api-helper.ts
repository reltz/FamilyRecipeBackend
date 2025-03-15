import { APIGatewayAuthorizerResult, APIGatewayProxyStructuredResultV2 } from "aws-lambda";

export interface ResponseParams {
    statusCode: number;
    body?: Object;
}


export function makeCORSResponse(params: ResponseParams): any {
    const { statusCode, body } = params;

    const response: APIGatewayProxyStructuredResultV2 = {
        statusCode: statusCode, headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        }
    }

    switch (statusCode) {
        case 401:
            response.body = JSON.stringify({ message: "Unauthorized" })
    }

    if (body) {
        response.body = JSON.stringify(body);
    }
    return response;
}