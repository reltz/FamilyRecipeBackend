
import { GetItemCommand, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, QueryCommandInput } from '@aws-sdk/lib-dynamodb';
import { randomBytes, createHmac, generateKeyPairSync  } from "crypto";
import { v4 } from 'uuid';
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";

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



export class Database {
    constructor(public readonly dynamoDB: DynamoDBDocumentClient, public readonly tableName: string){}

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

    public async listRecipes(familyId: string): Promise<DBRecipe[]> {
        const params: QueryCommandInput = {
            TableName: this.tableName,
            KeyConditionExpression: 'PK = :pk and begins_with(SK, :sk)', // Query for all recipes under the family
            ExpressionAttributeValues: {
                ':pk': Database.makePK(EntityType.Family, familyId),  // Set PK to FAMILY#<familyId>
                ':sk': 'RECIPE#'             // Set SK prefix to "RECIPE#"
            }
        };
    
        try {
            const result = await this.dynamoDB.send(new QueryCommand(params)); // Use QueryCommand and client.send()
            return result.Items as DBRecipe[];  // Return all recipes
        } catch (error) {
            console.error("Error querying recipes:", error);
            throw error;
        }
    }


    public async createRecipe(params: CreateRecipeParams): Promise<void> {
        // Implement the createRecipe method     
        throw new Error("create recipe not implemented");       
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
        const params = {
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
                console.log("User not found.");
                throw new Error('User not found');
            }
        } catch (error) {
            console.error("Error retrieving user:", error);
            throw new Error("Failed to retrieve user.");
        }
    }

    public async getPublicSecrets(): Promise<{ keyId: string; publicKey: string }[]> {
        try {
            const result = await this.dynamoDB.send(
                new QueryCommand({
                    TableName: this.tableName,
                    KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
                    ExpressionAttributeValues: marshall({
                        ":pk": Database.makePK(EntityType.Secret, "PEM"),
                        ":skPrefix": "PUBLIC#", // Fetch all public keys
                    }),
                })
            );
    
            if (!result.Items || result.Items.length === 0) return [];
    
            return result.Items.map((item) => {
                const secret = unmarshall(item) as DBSecret;
                return { keyId: secret.id, publicKey: secret.secret };
            });
        } catch (error) {
            console.error("Error fetching public secrets:", error);
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
            console.error("Error fetching private secret:", error);
            throw new Error("Failed to retrieve private key");
        }
    }
}

export function hashPassword(password: string, salt: string): string {
    return createHmac("sha256", salt).update(password).digest("hex");
}