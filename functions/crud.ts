import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { APIGatewayEvent } from 'aws-lambda';
import { CreateRecipeParams as CreateRecipeDBParams, Database, DBRecipe, ListRecipeParams, ListRecipesResponse } from './db-helper';
import { decodeCursor, Log } from './utils';
import { REGION } from './consts';
import { CreateRecipeRequestInput } from './schemas';
import { makeCORSResponse } from './api-helper';


// Create a DynamoDB client
const client = new DynamoDBClient({ region: REGION });
// Create a DynamoDB Document Client
const dynamoDb = DynamoDBDocumentClient.from(client);

export async function handler(event: APIGatewayEvent) {
  try {
    const tableName = process.env.TABLE_NAME;

    if (!tableName) {
      throw new Error('Table name not set');
    }
    const database = new Database(dynamoDb, tableName);

    Log('Received event');

    const authorizerContext = event.requestContext.authorizer;
    Log(`Authorizer context: ${JSON.stringify(authorizerContext)}`);

    if (!authorizerContext || !authorizerContext.username || !authorizerContext.familyId) {
      throw new Error("Token missing info!");
    }
    // const username = authorizerContext.username; // Example: 'user123'
    const familyId: string = authorizerContext.familyId; // Example: 'potato123'
    const familyName: string = authorizerContext.familyName;
    const userName: string = authorizerContext.username;

    if (!familyId) {
      return makeCORSResponse({ statusCode: 401 })
    }

    const path = event.path;
    const method = event.httpMethod;

    //TEST
    if (path.includes('/recipes/test') && method == 'GET') {
      return { statusCode: 200, body: JSON.stringify({ message: "success" }) };
    }

    if (path.includes('/recipes/list-recipes') && method === 'GET') {
      const { cursor, limit = 25 } = event.queryStringParameters || {}; // Get cursor and limit from query params

      let dbRequest: ListRecipeParams = {
        familyId,
        limit: Number(limit)
      }
      if (cursor) {
        const decoded = decodeCursor(cursor);
        if (decoded) {
          dbRequest.lastEvaluatedKey = decoded;
        }
      }

      const listResponse: ListRecipesResponse = await database.listRecipes(dbRequest);

      return makeCORSResponse({ statusCode: 200, body: listResponse })
    }

    if (path.includes('/recipes/create') && method === 'POST') {
      const bucketName = process.env.BUCKET_NAME;
      if (!bucketName) {
        throw new Error("missing bucket name on env");
      }

      if (!event.body) {
        return makeCORSResponse({ statusCode: 400, body: { error: "Missing body" } });
      }
      const recipe: CreateRecipeRequestInput = JSON.parse(event.body);

      let recipeInput: CreateRecipeDBParams = {
        familyId,
        familyName,
        preparation: recipe.preparation,
        ingredients: recipe.ingredients,
        recipeName: recipe.name,
        author: userName,
        imageUrl: recipe.photoUrl
      }

      await database.createRecipe(recipeInput);

      return makeCORSResponse({
        statusCode: 201
      });
    }

    if(path.includes('/users/change-password') && method === 'POST') {
      if (!event.body) {
        return makeCORSResponse({ statusCode: 400, body: { error: "Missing body" } });
      }

      const body = JSON.parse(event.body);
      if (!body.newPassword) {
        return makeCORSResponse({ statusCode: 400, body: { error: "Missing new password" } });
      }

      await database.updateUserPassword(userName, body.newPassword);

      return makeCORSResponse({ statusCode: 200 });
    }

    return makeCORSResponse({statusCode: 404, body: {error: "Route not found"}});
  } catch (er) {
    console.error("Error:", er);
    return makeCORSResponse({statusCode: 500, body: {error: JSON.stringify(er)}})
  }
}
