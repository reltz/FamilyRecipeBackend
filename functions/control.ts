import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { Database } from "./db-helper";

interface ControlBaseEvent {
    operation: "secret" | "user" | "family";

}
interface CreateUserEvent extends CreateFamilyEvent {
    username: string;
    password: string;
    familyId: string;
}

interface CreateFamilyEvent extends ControlBaseEvent {
    familyName: string;
}

interface CreateSecretEvent extends ControlBaseEvent {
    action: "create" | "rotate"
}

const client = new DynamoDBClient({ region: 'ca-central-1' });
const dynamoDb = DynamoDBDocumentClient.from(client);

export async function handler(event: CreateUserEvent | CreateFamilyEvent | CreateSecretEvent) {

    const tableName = process.env.TABLE_NAME;
    if (!tableName) {
      throw new Error('Table name not set');
    }

    const database = new Database(dynamoDb, tableName);
    try {
        switch(event.operation) {
            case 'family':
                console.log(`Creating family`);
                await createFamily(database, event as CreateFamilyEvent );
                break;
            case 'user': 
                console.log(`Creating user`);
                await createUser(database, event as CreateUserEvent);
                break;
            case 'secret':
                console.log(`Creating secret`);
                await createRotateSecret(database, event as CreateSecretEvent);
                break;
        }

     
        return { statusCode: 201, body: JSON.stringify({ message: "Created" }) };
    } catch (error) {
        console.error("Error creating user/family:", error);
        return { statusCode: 500, body: "Internal server error" };
    }
};

async function createUser(database: Database, event :CreateUserEvent ) {
    await database.createUser(event.username, event.password, event.familyId, event.familyName);
}

async function createFamily(database: Database, event: CreateFamilyEvent) {
    await database.createFamily(event.familyName)
}

async function createRotateSecret(database: Database, event: CreateSecretEvent ) {
  if(event.action == "create") {
    await database.createSecret();
  }
  else {
    throw new Error("Rotation not implemented")
  }
}

