import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { Database } from "./db-helper";
import { REGION } from "./consts";
import { Log } from "./utils";

interface ControlBaseEvent {
  operation: "secret" | "user" | "family";
  action: "create" | "update-password" | "rotate";
}
interface CreateUserEvent extends CreateFamilyEvent {
  username: string;
  password: string;
  familyId: string;
}

interface UpdateUserPasswordEvent extends ControlBaseEvent {
  username: string;
  newPassword: string;
}

interface CreateFamilyEvent extends ControlBaseEvent {
  familyName: string;
}

interface CreateSecretEvent extends ControlBaseEvent {}

// TEMP
// const secretEvent: CreateSecretEvent = {
//     "action": "create",
//     "operation": "secret"
// }

// const famCreate: CreateFamilyEvent = {
//     "familyName": "Mock",
//     "operation": "family"
// }

const userCreate: CreateUserEvent = {
    familyId: "eadb731a-bd9e-4c28-a53c-fd4aa455818d",
    familyName: "Mock",
    operation: "user",
    password: "mock",
    username: "mock",
    action: "create"
};

const updateUserPasswordEvent: UpdateUserPasswordEvent = {
  newPassword: "potato",
  operation: "user",
  username: "mock",
  action: "update-password",
};

// END TEMP

const client = new DynamoDBClient({ region: REGION });
const dynamoDb = DynamoDBDocumentClient.from(client);

export async function handler(
  event: CreateUserEvent | CreateFamilyEvent | CreateSecretEvent
) {
  const tableName = process.env.TABLE_NAME;
  if (!tableName) {
    throw new Error("Table name not set");
  }

  const database = new Database(dynamoDb, tableName);
  try {
    switch (event.operation) {
      case "family":
        Log(`Creating family`);
        await createFamily(database, event as CreateFamilyEvent);
        break;
      case "user":
        if (event.action === "create"){
            Log(`Creating user`);
            await createUser(database, event as CreateUserEvent);
            break;
        } else if (event.action === "update-password") {
            Log(`Updating user password`);
            await updateUserPasswordAdmin(database, event as UpdateUserPasswordEvent);
            break;
        }
      case "secret":
        Log(`Creating secret`);
        await createRotateSecret(database, event as CreateSecretEvent);
        break;
    }

    return { statusCode: 201, body: JSON.stringify({ message: "Created" }) };
  } catch (error) {
    Log(`Error creating user/family: ${error}`, "error");
    return { statusCode: 500, body: "Internal server error" };
  }
}

async function createUser(database: Database, event: CreateUserEvent) {
  await database.createUser(
    event.username,
    event.password,
    event.familyId,
    event.familyName
  );
}

async function updateUserPasswordAdmin(
  database: Database,
  event: UpdateUserPasswordEvent
) {
  await database.updateUserPassword(event.username, event.newPassword);
}

async function createFamily(database: Database, event: CreateFamilyEvent) {
  await database.createFamily(event.familyName);
}

async function createRotateSecret(
  database: Database,
  event: CreateSecretEvent
) {
  if (event.action == "create") {
    await database.createSecret();
  } else {
    throw new Error("Rotation not implemented");
  }
}
