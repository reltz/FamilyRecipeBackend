import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { Stream } from "stream";

const s3 = new S3Client({ region: "us-east-1" }); // Change to your AWS region

async function streamToBuffer(stream: Stream): Promise<Buffer> {
  const chunks: Uint8Array[] = [];
  return new Promise((resolve, reject) => {
    stream.on("data", (chunk) => chunks.push(chunk));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });
}

export async function uploadFileToS3(file: Stream, fileName: string, s3BucketName: string): Promise<string> {
  console.log(`Will upload to s3!`);

  console.log(`Filename: ${fileName}, bucketname: ${s3BucketName}`)
  const buffer = await streamToBuffer(file);
  
  const basePath = "public-images/recipes";
  try {
    await s3.send(new PutObjectCommand({
      Bucket: s3BucketName,
      Key: `basePath/${fileName}`,
      Body: buffer,
      ContentType: "image/jpeg", // Change dynamically if needed
      ACL: "public-read"
    }));
  } catch(er) {
    console.error(`Eror saving to s3: ${JSON.stringify(er)}`);
  }

  return `https://${s3BucketName}.s3.ca-central-1.amazonaws.com/${basePath}/${fileName}`;
}
