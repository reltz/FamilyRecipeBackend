import { APIGatewayEvent, APIGatewayProxyResult } from 'aws-lambda';
import { REGION } from './consts';
import { S3Client } from '@aws-sdk/client-s3';
import { generatePreSignedUrl } from './s3-helper';
import { makeCORSResponse } from './api-helper';


const s3 = new S3Client({ region: REGION }); // Change to your AWS region

export async function handler(event: APIGatewayEvent): Promise<APIGatewayProxyResult> {
    try {
        const fileName = event.queryStringParameters?.fileName ?? "";

        if (!fileName) {
            return makeCORSResponse({statusCode: 400, body: {message: "Missing filename"}});
        }

        // Validate file extension
        const allowedExtensions = ['.png', '.jpg', '.jpeg'];
        const fileExtension = fileName.includes('.') ? fileName.slice(fileName.lastIndexOf('.')).toLowerCase() : "";

        if (!fileExtension || !allowedExtensions.includes(fileExtension)) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: 'Invalid file extension!' }),
            }
        }

        const authorizerContext = event.requestContext.authorizer;
        if (!authorizerContext || !authorizerContext.username || !authorizerContext.familyId) {
            throw new Error("Token missing info!");
        }
   
        const familyId: string = authorizerContext.familyId; 
        const familyName: string = authorizerContext.familyName;
        console.log(`Getting pre-signed url for family: ${familyName}`);

        // Retrieve bucket name and expiration time (optional)
        const bucketName = process.env.BUCKET_NAME;

        if (!bucketName) {
            return {
                statusCode: 500,
                body: JSON.stringify({ message: 'Bucket name not set in environment variables' }),
            };
        }

        const url = await generatePreSignedUrl({
            bucket: bucketName,
            fileName: fileName,
            familyId,
            s3Client: s3
        });

        return makeCORSResponse({statusCode: 200, body: {message: "Pre-signed URL generated successfully", uploadUrl: url}});
    } catch (error) {
        console.error('Error generating pre-signed URL:', JSON.stringify(error));
        return makeCORSResponse({statusCode: 500});
    }
}
