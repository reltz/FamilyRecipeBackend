import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { APIGatewayEvent } from 'aws-lambda';
import { CreateRecipeParams, Database, ListRecipeParams } from './db-helper';
import { MakeRecipeWithFile } from './busboy-helper';
import { decodeCursor } from './utils';
import { uploadFileToS3 } from './s3-helper';
import { errorMonitor } from 'events';


// Create a DynamoDB client
const client = new DynamoDBClient({ region: 'ca-central-1' });
// Create a DynamoDB Document Client
const dynamoDb = DynamoDBDocumentClient.from(client);

export async function handler(event: APIGatewayEvent) {
  try {


    const tableName = process.env.TABLE_NAME;

    if (!tableName) {
      throw new Error('Table name not set');
    }
    const database = new Database(dynamoDb, tableName);

    console.log('Received event:');

    const authorizerContext = event.requestContext.authorizer;
    console.log(`Authorizer context: ${JSON.stringify(authorizerContext)}`);

    if (!authorizerContext || !authorizerContext.username || !authorizerContext.familyId) {
      throw new Error("Token missing info!");
    }
    // const username = authorizerContext.username; // Example: 'user123'
    const familyId: string = authorizerContext.familyId; // Example: 'potato123'
    const familyName: string = authorizerContext.familyName;
    const userName: string = authorizerContext.username;

    if (!familyId) {
      return {
        statusCode: 401,
        body: JSON.stringify({ message: 'Unauthorized' }),
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      };
    }


    const path = event.path;
    const method = event.httpMethod;
    // const body = event.body ? (event.isBase64Encoded ? Buffer.from(event.body, 'base64') : JSON.parse(event.body)) : null;

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

      const listResponse = await database.listRecipes(dbRequest);
      return {
        statusCode: 200, body: JSON.stringify(listResponse), headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      };
    }

    if (path.includes('/recipes/create') && method === 'POST') {
      const bucketName = process.env.BUCKET_NAME;
      if (!bucketName) {
        throw new Error("missing bucket name on env");
      }
      const recipe = await MakeRecipeWithFile(event);

      const fileName = `${familyName}-${familyId}/${recipe.recipeName}`;

      console.log(`After busboy: ${JSON.stringify({
        name: recipe.recipeName,
        filename:fileName
      })}`);

      const recipeInput: CreateRecipeParams = {
        familyId,
        familyName,
        preparation: recipe.preparation,
        ingredients: recipe.ingredients,
        recipeName: recipe.recipeName,
        author: userName
      }

      if (recipe.file) {
        // ADD IMAGE TO S3 BUCKET HERE!
        console.log(`There is a file!! lets upload to s3!`)
        recipeInput.imageUrl = await uploadFileToS3(recipe.file, fileName, bucketName)

        console.log(`Success saving to s3? ${recipeInput.imageUrl}`);
      }

      await database.createRecipe(recipeInput);

      return {
        statusCode: 201, headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      };
    }

    return {
      statusCode: 404, body: JSON.stringify({ error: 'Route not found' }), headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    };
  } catch (er) {
    console.error("Error:", er);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: JSON.stringify(er) || 'Internal Server Error' }),
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    };
  }
}
