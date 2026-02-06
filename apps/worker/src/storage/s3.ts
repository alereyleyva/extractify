import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { fromNodeProviderChain } from "@aws-sdk/credential-providers";
import { env } from "@extractify/env/server";

let s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (!s3Client) {
    s3Client = new S3Client({
      region: env.AWS_REGION,
      credentials: fromNodeProviderChain(),
    });
  }
  return s3Client;
}

export async function downloadExtractionFile(
  s3UrlOrKey: string,
): Promise<ArrayBuffer> {
  const client = getS3Client();

  let bucket: string;
  let key: string;

  if (s3UrlOrKey.startsWith("s3://")) {
    const url = s3UrlOrKey.slice(5);
    const slashIndex = url.indexOf("/");
    bucket = url.slice(0, slashIndex);
    key = url.slice(slashIndex + 1);
  } else {
    bucket = env.AWS_EXTRACTION_BUCKET;
    key = s3UrlOrKey;
  }

  const response = await client.send(
    new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    }),
  );

  if (!response.Body) {
    throw new Error(`Failed to download file from S3: ${s3UrlOrKey}`);
  }

  const bytes = await response.Body.transformToByteArray();
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
}
