
import { GetItemCommand, PutItemCommand, QueryCommand } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommandInput, QueryCommandInput, UpdateCommand, UpdateCommandInput } from '@aws-sdk/lib-dynamodb';
import { randomBytes, createHmac, generateKeyPairSync } from "crypto";
import { v4 } from 'uuid';
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { FeRecipe } from './schemas';
import { encodeCursor, Log } from './utils';

export enum EntityType {
    Family = 'Family',
    User = 'User',
    Recipe = 'Recipe',
    Secret = 'Secret',
}

export interface DBBase {
    createdAt: string;
    updatedAt: string;
    entityType: EntityType;
    PK: string;
    SK: string;
    id: string;
    name: string;
}

export interface DBRecipe extends DBBase {
    familyId: string;
    faimilyName: string;
    preparation: string;
    author: string;
    ingredients?: string;
    imageUrl?: string;
}

export interface DBUser extends DBBase {
    familyId: string;
    faimilyName: string;
    password: string;
}

export interface DBFamily extends DBBase { }

export interface CreateRecipeParams {
    familyId: string;
    familyName: string;
    recipeName: string;
    preparation: string;
    author: string;
    ingredients?: string;
    imageUrl?: string;
}

export interface DBSecret {
    id: string;
    PK: string; // Partition key, could be the name or an identifier for the key pair
    SK: string; // Sort key, can be a unique identifier or type of secret (e.g., 'public', 'private')
    secret: string; // The PEM key string, could be public or private key
    name: string; // A name or identifier for the secret (e.g., 'auth-jwt-key', 'auth-key-pair')
    createdAt: string; // Date/time when the key was created
    updatedAt: string; // Date/time when the key was last updated or rotated
    entityType: EntityType;
}


export interface ListRecipeParams {
    familyId: string;
    limit: number;
    lastEvaluatedKey?: Record<string, any>
}

export interface ListRecipesResponse {
    recipes: FeRecipe[];
    cursor?: string;
}


export class Database {
    constructor(public readonly dynamoDB: DynamoDBDocumentClient, public readonly tableName: string) { }

    public static makePK(entity: EntityType, value: string): string {
        switch (entity) {
            case EntityType.Family:
                return `F#${value}`; // For families, PK is FAMILY#<familyId>
            case EntityType.User:
                return `UN#${value}`; // For users, PK is USER#<userName>
            case EntityType.Recipe:
                return `F#${value}`; // For recipes, PK is FAMILY#<familyId> (assuming recipes belong to families)
            case EntityType.Secret:
                return `S#${value}`; // For secrets, PK is SECRET#<secretId>
            default:
                throw new Error(`Unknown entity type: ${entity}`);
        }
    }

    public static makeSK(entity: EntityType, value: string): string {
        switch (entity) {
            case EntityType.Family:
                return `FN#${value}`;
            case EntityType.User:
                return `UN#${value}`;
            case EntityType.Recipe:
                return `R#${value}`; // Recipe sort key is RECIPE#<recipeId>
            case EntityType.Secret:
                return `S#${value}`;
            default:
                throw new Error(`Unknown entity type: ${entity}`);
        }
    }

    public async listRecipes(inputParams: ListRecipeParams): Promise<ListRecipesResponse> {
        const { familyId, limit, lastEvaluatedKey } = inputParams;
        const pkValue = Database.makePK(EntityType.Family, familyId);
        const skPrefixValue = Database.makeSK(EntityType.Recipe, '');


        let params: QueryCommandInput = {
            TableName: this.tableName,
            KeyConditionExpression: 'PK = :pk and begins_with(SK, :skPrefix)', // Query for all recipes under the family
            ExpressionAttributeValues: {
                ":pk": { S: pkValue },
                ":skPrefix": { S: skPrefixValue }
            },
            Limit: limit ?? 10
        };

        if (lastEvaluatedKey) {
            params.ExclusiveStartKey = lastEvaluatedKey // For pagination, pass the LastEvaluatedKey from the previous query
        }

        try {
            const result = await this.dynamoDB.send(new QueryCommand(params)); // Use QueryCommand and client.send()

            Log(`Result of query: ${JSON.stringify(result)}`);

            if (!result.Items || result.Items.length === 0) return { recipes: [] };

            const recipes: DBRecipe[] = result.Items.map((item) => unmarshall(item) as DBRecipe);

            const outPutRecipes: FeRecipe[] = recipes.map(r => {
                return {
                    id: r.id,
                    name: r.name,
                    author: r.author,
                    familyId: r.familyId,
                    familyName: r.faimilyName,
                    preparation: r.preparation,
                    createdAt: r.createdAt,
                    ingredients: r.ingredients ?? "",
                    photoUrl: r.imageUrl ?? ""
                }
            })

            const response: ListRecipesResponse = {
                recipes: outPutRecipes,
            };

            if (result.LastEvaluatedKey) {
                response.cursor = encodeCursor(result.LastEvaluatedKey);
            }
            return response;
        } catch (error) {
            Log(`Error querying recipes: ${error}`, 'error');
            throw error;
        }
    }


    public async createRecipe(params: CreateRecipeParams): Promise<void> {
        Log(`Will save recipe to DB!`);
        // Implement the createRecipe method     
        const { familyId, familyName, preparation, recipeName, ingredients, author, imageUrl } = params;
        const timestamp = new Date().toISOString();
        const recipeId = v4();

        const recipeToInsert: DBRecipe = {
            familyId,
            faimilyName: familyName,
            createdAt: timestamp,
            updatedAt: timestamp,
            entityType: EntityType.Recipe,
            PK: Database.makePK(EntityType.Recipe, familyId),
            SK: Database.makeSK(EntityType.Recipe, recipeId),
            id: recipeId,
            name: recipeName,
            preparation,
            author,
            imageUrl
        }
        if (ingredients) {
            recipeToInsert.ingredients = ingredients;
        }
        try {
            await this.dynamoDB.send(
                new PutItemCommand({
                    TableName: this.tableName, // Replace with actual table name
                    Item: marshall(recipeToInsert, { removeUndefinedValues: true }),
                },)
            );
        } catch (er) {
            console.error(`Error: ${JSON.stringify(er)}`);
        }

    }

    public async createUser(username: string, password: string, familyId: string, familyName: string) {
        const userId = v4();
        const salt = randomBytes(16).toString("hex");
        const hashedPassword = hashPassword(password, salt);
        const timestamp = new Date().toISOString();


        const dbUser: DBUser = {
            familyId,
            faimilyName: familyName, // Fixing the typo
            password: `${salt}$${hashedPassword}`, // Storing salt with the hash
            createdAt: timestamp,
            updatedAt: timestamp,
            entityType: EntityType.User,
            PK: Database.makePK(EntityType.User, username),
            SK: Database.makeSK(EntityType.User, username),
            id: userId,
            name: username
        };

        await this.dynamoDB.send(
            new PutItemCommand({
                TableName: this.tableName, // Replace with actual table name
                Item: marshall(dbUser),
            })
        );
    }

    public async updateUserPassword(username: string, newPassword: string) {
        const user = await this.getUser(username);

        const newSalt = randomBytes(16).toString("hex");
        const newHash = hashPassword(newPassword, newSalt);

        const timestamp = new Date().toISOString();

        const updatedUser: DBUser = {
            ...user,
            password: `${newSalt}$${newHash}`,
            updatedAt: timestamp
        };

        await this.dynamoDB.send(
            new PutItemCommand({
                TableName: this.tableName,
                Item: marshall(updatedUser),
            }));
    }

    public async createFamily(familyName: string) {
        const familyId = v4();

        const timestamp = new Date().toISOString();

        const dbFamily: DBFamily = {
            id: familyId,
            name: familyName,
            PK: Database.makePK(EntityType.Family, familyId),
            SK: Database.makeSK(EntityType.Family, familyName),
            createdAt: timestamp,
            updatedAt: timestamp,
            entityType: EntityType.Family
        }

        Log(`Creating family: ${JSON.stringify(dbFamily)}`);
        await this.dynamoDB.send(
            new PutItemCommand({
                TableName: this.tableName,
                Item: marshall(dbFamily),
            })
        );
    }

    public async createSecret() {
        // Generate an EC key pair (P-256)
        const { privateKey, publicKey } = generateKeyPairSync("ec", {
            namedCurve: "P-256", // Strong and efficient
            publicKeyEncoding: { type: "spki", format: "pem" },
            privateKeyEncoding: { type: "pkcs8", format: "pem" },
        });

        const keyId = v4();
        const timestamp = new Date().toISOString();

        const privateKeyFields: DBSecret = {
            PK: Database.makePK(EntityType.Secret, 'PEM'),
            SK: Database.makeSK(EntityType.Secret, "PRIVATE"),
            id: keyId,
            createdAt: timestamp,
            updatedAt: timestamp,
            secret: privateKey,
            name: 'Private-PEM',
            entityType: EntityType.Secret
        }
        await this.dynamoDB.send(
            new PutItemCommand({
                TableName: this.tableName, // Replace with your table name
                Item: marshall(privateKeyFields),
            })
        );

        const publicKeyFields: DBSecret = {
            PK: Database.makePK(EntityType.Secret, 'PEM'),
            SK: Database.makeSK(EntityType.Secret, `PUBLIC#${keyId}`),
            id: keyId,
            createdAt: timestamp,
            updatedAt: timestamp,
            secret: publicKey,
            name: 'Public-PEM',
            entityType: EntityType.Secret
        }

        await this.dynamoDB.send(
            new PutItemCommand({
                TableName: this.tableName,
                Item: marshall(publicKeyFields),
            })
        );
    }

    public async getUser(username: string): Promise<DBUser> {
        const params: GetCommandInput = {
            TableName: this.tableName,
            Key: marshall({
                PK: Database.makePK(EntityType.User, username), // The PK is unique for each user based on the username
                SK: Database.makePK(EntityType.User, username), // You can optionally use SK if you want, but it should match the same value in this case
            }),
        };

        try {
            const result = await this.dynamoDB.send(new GetItemCommand(params));

            if (result.Item) {
                const user: DBUser = unmarshall(result.Item) as DBUser;
                return user; // Return the user object
            } else {
                Log("User not found.");
                throw new Error('User not found');
            }
        } catch (error) {
            Log(`Error retrieving user: ${error}`, 'error');
            throw new Error("Failed to retrieve user.");
        }
    }

    public async updateUser(userName: string): Promise<void> {
        const currentDate = new Date().toISOString();
        const params: UpdateCommandInput = {
            Key: {
                PK: Database.makePK(EntityType.User, userName),
                SK: Database.makePK(EntityType.User, userName),
            },
            TableName: this.tableName,
            UpdateExpression: "SET lastLogin = :lastLogin",
            ExpressionAttributeValues: {
                ":lastLogin": currentDate
            }
        }
        try {
            await this.dynamoDB.send(new UpdateCommand(params));

        } catch (er) {
            console.error(`Failed to update last login for user: ${userName} with error: ${er}`);
        }
    }

    public async getPublicSecrets(): Promise<{ keyId: string; publicKey: string }[]> {
        try {
            const pkValue = Database.makePK(EntityType.Secret, "PEM");
            const skPrefixValue = Database.makeSK(EntityType.Secret, "PUBLIC#");

            const params: QueryCommandInput = {
                TableName: this.tableName,
                KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
                ExpressionAttributeValues: {
                    ":pk": { S: pkValue },
                    ":skPrefix": { S: skPrefixValue }
                }
            };

            const result = await this.dynamoDB.send(
                new QueryCommand(params)
            );

            if (!result.Items || result.Items.length === 0) return [];

            return result.Items.map((item) => {
                const secret = unmarshall(item) as DBSecret;
                return { keyId: secret.id, publicKey: secret.secret };
            });
        } catch (error) {
            Log(`Error fetching public secrets: ${error}`, 'error');
            throw new Error("Failed to retrieve public keys");
        }
    }

    public async getPrivateSecret(): Promise<string | null> {
        try {
            const result = await this.dynamoDB.send(
                new GetItemCommand({
                    TableName: this.tableName,
                    Key: marshall({
                        PK: Database.makePK(EntityType.Secret, "PEM"),
                        SK: Database.makeSK(EntityType.Secret, "PRIVATE"),
                    }),
                })
            );

            if (!result.Item) return null;

            const secret = unmarshall(result.Item) as DBSecret;
            return secret.secret; // Returns the private key
        } catch (error) {
            Log(`Error fetching private secret: ${error}`, 'error');
            throw new Error("Failed to retrieve private key");
        }
    }
}

export function hashPassword(password: string, salt: string): string {
    return createHmac("sha256", salt).update(password).digest("hex");
}