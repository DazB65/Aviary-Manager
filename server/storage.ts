// Storage helpers using Tigris (Fly.io's S3-compatible object storage)
// Tigris injects TIGRIS_ENDPOINT_URL, TIGRIS_ACCESS_KEY_ID, TIGRIS_SECRET_ACCESS_KEY,
// and TIGRIS_BUCKET_NAME automatically when the extension is added to your Fly app.

import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { ENV } from './_core/env';

function getS3Client(): S3Client {
  const { tigrisEndpointUrl, tigrisAccessKeyId, tigrisSecretAccessKey } = ENV;
  if (!tigrisEndpointUrl || !tigrisAccessKeyId || !tigrisSecretAccessKey) {
    throw new Error(
      "Tigris credentials missing: ensure TIGRIS_ENDPOINT_URL, TIGRIS_ACCESS_KEY_ID, and TIGRIS_SECRET_ACCESS_KEY are set"
    );
  }
  return new S3Client({
    region: "auto",
    endpoint: tigrisEndpointUrl,
    credentials: {
      accessKeyId: tigrisAccessKeyId,
      secretAccessKey: tigrisSecretAccessKey,
    },
  });
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

function getBucket(): string {
  if (!ENV.tigrisBucketName) {
    throw new Error("TIGRIS_BUCKET_NAME is not set");
  }
  return ENV.tigrisBucketName;
}

/**
 * Upload a file to Tigris and return the key and a pre-signed download URL (valid 7 days).
 */
export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  const client = getS3Client();
  const bucket = getBucket();
  const key = normalizeKey(relKey);
  const body = typeof data === "string" ? Buffer.from(data) : data;

  await client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: contentType,
  }));

  // Return a pre-signed URL so the client can access the file directly
  const url = await getSignedUrl(
    client,
    new GetObjectCommand({ Bucket: bucket, Key: key }),
    { expiresIn: 60 * 60 * 24 * 7 } // 7 days
  );

  return { key, url };
}

/**
 * Generate a pre-signed download URL for an existing object in Tigris.
 */
export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const client = getS3Client();
  const bucket = getBucket();
  const key = normalizeKey(relKey);

  const url = await getSignedUrl(
    client,
    new GetObjectCommand({ Bucket: bucket, Key: key }),
    { expiresIn: 60 * 60 * 24 * 7 } // 7 days
  );

  return { key, url };
}
