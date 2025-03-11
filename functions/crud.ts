import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { APIGatewayEvent, Context } from 'aws-lambda';
import { Database } from './db-helper';

// Create a DynamoDB client
const client = new DynamoDBClient({ region: 'ca-central-1' });
// Create a DynamoDB Document Client
const dynamoDb = DynamoDBDocumentClient.from(client);

export async function handler(event: APIGatewayEvent) {

  const database = new Database(dynamoDb);
  
  console.log('Received event:', JSON.stringify(event, null, 2));

  const authorizerContext = event.requestContext.authorizer;

  if(!authorizerContext || !authorizerContext.username || !authorizerContext.familyId) {
    throw new Error("Token missing info!");
  }
  // const username = authorizerContext.username; // Example: 'user123'
  const familyId = authorizerContext.familyId; // Example: 'potato123'


  const path = event.path;
  const method = event.httpMethod;
  const body = event.body ? JSON.parse(event.body) : null;

  if (path.includes('/recipes/list-recipes') && method === 'GET') {
    const recipes = await database.listRecipes(familyId);
    return { statusCode: 200, body: JSON.stringify(recipes) };
  }

  if (path.includes('/recipes/create') && method === 'POST') {
    throw new Error("create recipe not implemented");
    // return { statusCode: 201, body: JSON.stringify({ message: `Potato created: ${body?.name}` }) };
  }

  return { statusCode: 404, body: JSON.stringify({ error: 'Route not found' }) };
}
