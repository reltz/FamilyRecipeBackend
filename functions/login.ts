import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { APIGatewayEvent } from 'aws-lambda';
import * as jwt from 'jsonwebtoken'; // npm install jsonwebtoken
import { Database, hashPassword } from './db-helper';


const client = new DynamoDBClient({ region: 'ca-central-1' });
const dynamoDb = DynamoDBDocumentClient.from(client);


export async function handler(event: APIGatewayEvent) {
  const tableName = process.env.TABLE_NAME;
  if (!tableName) {
    throw new Error('Table name not set');
  }


  const body = event.body ? JSON.parse(event.body) : null;
  if (!body?.username || !body?.password) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing credentials' }) };
  }

  const username = body.username;
  const password = body.password;

  const db = new Database(dynamoDb, tableName);

  const user = await db.getUser(username);

  const [salt, storedHash] = user.password.split("$");

  // Hash the input password with the retrieved salt
  const inputHash = hashPassword(password, salt);

  if (inputHash !== storedHash) {
    return { statusCode: 401, body: "Invalid username or password." };
  }


  // MAKE TOKEN IF SUCCESS LOGIN
  const privatePem = await db.getPrivateSecret();
  if (!privatePem) {
    throw new Error("Could not retrieve private pem");
  }


  // Generate JWT token
   const token = jwt.sign({ username, familyName: user.faimilyName, familyId: user.familyId }, privatePem, { algorithm: 'ES256', expiresIn: '1D' });


  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'Login successful', token }),
    headers: {
      'Access-Control-Allow-Origin': '*' // testing
    }
  };
}
