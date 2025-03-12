import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { APIGatewayEvent } from 'aws-lambda';
import { CreateRecipeParams, Database } from './db-helper';
import { MakeRecipeWithFile } from './busboy-helper';


// Create a DynamoDB client
const client = new DynamoDBClient({ region: 'ca-central-1' });
// Create a DynamoDB Document Client
const dynamoDb = DynamoDBDocumentClient.from(client);

export async function handler(event: APIGatewayEvent) {
 
  const tableName = process.env.TABLE_NAME;
  if (!tableName) {
    throw new Error('Table name not set');
  }
  const database = new Database(dynamoDb, tableName);
  
  console.log('Received event:', JSON.stringify(event, null, 2));

  const authorizerContext = event.requestContext.authorizer;
  console.log(`Authorizer context: ${JSON.stringify(authorizerContext)}`);

  if(!authorizerContext || !authorizerContext.username || !authorizerContext.familyId) {
    throw new Error("Token missing info!");
  }
  // const username = authorizerContext.username; // Example: 'user123'
  const familyId = authorizerContext.familyId; // Example: 'potato123'
  const familyName = authorizerContext.familyName;


  const path = event.path;
  const method = event.httpMethod;
  const body = event.body ? JSON.parse(event.body) : null;

  //TEST
  if (path.includes('/recipes/test') && method == 'GET') {
    return { statusCode: 200, body: JSON.stringify({message: "success"}) };
  }

  if (path.includes('/recipes/list-recipes') && method === 'GET') {
    const recipes = await database.listRecipes(familyId);
    return { statusCode: 200, body: JSON.stringify(recipes) };
  }

  if (path.includes('/recipes/create') && method === 'POST') {
    const recipe = await MakeRecipeWithFile(event);

    const recipeInput: CreateRecipeParams = {
      familyId,
      familyName,
      preparation: recipe.preparation,
      ingredients: recipe.ingredients,
      recipeName: recipe.recipeName,
    }

    if(recipe.file && recipe.fileName) {
      // ADD IMAGE TO S3 BUCKET HERE!
      recipeInput.imageUrl = "https://example.com";
    }


    await database.createRecipe(recipeInput);

    return { statusCode: 201, body: JSON.stringify({ message: `Recipe created: ${body?.name}` }) };
  }

  return { statusCode: 404, body: JSON.stringify({ error: 'Route not found' }) };
}
