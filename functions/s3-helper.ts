import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export interface PreSignedURLParams {
  s3Client: S3Client;
  bucket: string;
  fileName: string;
  familyId: string;
}

export async function generatePreSignedUrl(params: PreSignedURLParams) {
  const {s3Client, bucket, fileName, familyId} = params;

  console.log(`filename: ${fileName}, familyId: ${familyId}`);

  const fileKey = `public-images/${familyId}/${Date.now()}-${fileName}`; // dynamic file name
  const s3Params = {
      Bucket: bucket,
      Key: fileKey,
      ContentType: 'image/*',
  };

  const command = new PutObjectCommand(s3Params);
  // valid for 1h
  const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

  console.log('Pre-signed URL:', url);
  return url;
}