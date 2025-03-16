import { APIGatewayTokenAuthorizerEvent, APIGatewayAuthorizerResult } from 'aws-lambda';
import * as jwt from 'jsonwebtoken';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { Database } from './db-helper';
import { REGION } from './consts';


export interface AuthToken extends jwt.JwtPayload {
  username: string;
  familyId: string;
  familyName: string;
}

// Create a DynamoDB client
const client = new DynamoDBClient({ region: REGION });
// Create a DynamoDB Document Client
const dynamoDb = DynamoDBDocumentClient.from(client);


export async function handler(event: APIGatewayTokenAuthorizerEvent): Promise<APIGatewayAuthorizerResult> {
  const tableName = process.env.TABLE_NAME;
  if (!tableName) {
    throw new Error('Table name not set');
  }

  const db = new Database(dynamoDb, tableName);
  const token = event.authorizationToken.split(' ')[1]; // Assuming Bearer <token>

  // Get the secret from DynamoDB
  const secrets = await db.getPublicSecrets();

  // FOR NOW THERE IS NO ROTATION SO 1ST RESULT IS RIGHT:

  const secret = secrets[0];

  try {
    // Verify JWT token
    const decoded = verifyToken(token, secret.publicKey);

    // Return an IAM policy allowing access

    console.log(`Authorizer: decoded sub :${decoded.username}, methorARN: ${event.methodArn}`)
    return generatePolicy(decoded.username, 'Allow', event.methodArn, decoded);
  } catch (err) {
    console.log('Token verification failed', err);
    throw new Error('Unauthorized');
  }
}

function verifyToken(token: string, secret: string): any {
  let decoded: AuthToken = jwt.verify(token, secret) as AuthToken;

  console.log('Token payload is: ', decoded);

  if (typeof decoded === 'string') {
    decoded = JSON.parse(decoded);
    throw new Error('Unauthorized'); // Treat it as an error if it's a string
  }

  if (!decoded.username || !decoded.familyId || !decoded.familyName) {
    console.log('Token payload is missing fields', decoded);
    throw new Error('Unauthorized'); // Treat it as an error if it's a string
  }

  console.log('Token decoded:', decoded);
  return decoded;
}

// Function to generate an IAM policy
function generatePolicy(principalId: string, effect: 'Allow' | 'Deny', resource: string, decodedToken: AuthToken) {
  const parts = resource.split(':');

  const region = parts[3];
  const accountId = parts[4];
  const apiPath = parts[5]; // 123/prod/GET/recipes/list-recipes

  const apiParts = apiPath.split('/');
  const apiId = apiParts[0];
  const stage = apiParts[1];

  // const isRecipe = apiParts[3];
  // if (isRecipe !== "recipes") {
  //   // THROW ERROR IF POLICY IS FOR ANOTHER NEW ENDPOINT
  // }

  const arn = `arn:aws:execute-api:${region}:${accountId}:${apiId}/${stage}/*/recipes/*`

  const policyDocument = {
    Version: '2012-10-17',
    Statement: [
      {
        Action: 'execute-api:Invoke',
        Effect: effect,
        Resource: arn,
      },
    ],
  };
  return {
    principalId,
    policyDocument,
    context: {
      username: decodedToken.username,
      familyId: decodedToken.familyId,
      familyName: decodedToken.familyName
    }
  };
}
