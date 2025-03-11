import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { APIGatewayEvent, Context } from 'aws-lambda';
import * as jwt from 'jsonwebtoken'; // npm install jsonwebtoken
import { Database, hashPassword } from './db-helper';


const client = new DynamoDBClient({ region: 'ca-central-1' });
const dynamoDb = DynamoDBDocumentClient.from(client);


export async function handler(event: APIGatewayEvent) {
  const body = event.body ? JSON.parse(event.body) : null;
  if (!body?.username || !body?.password) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing credentials' }) };
  }

  const username = body.username;
  const password = body.password;

  const db = new Database(dynamoDb);

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
  const token = jwt.sign({ username, familyName: user.faimilyName, familyId: user.familyId }, privatePem, { expiresIn: '1D' });

  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'Login successful', token }),
  };
}
