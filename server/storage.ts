// Storage helpers using S3-compatible object storage.
// Configure TIGRIS_* variables, Railway Bucket variables, or AWS_* Tigris aliases.

import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { ENV } from './_core/env';

function normalizeEndpoint(endpoint: string): string {
  const trimmed = endpoint.trim().replace(/\/+$/, "");
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function getS3Client(): S3Client {
  const { tigrisAccessKeyId, tigrisForcePathStyle, tigrisRegion, tigrisSecretAccessKey } = ENV;
  const endpoint = normalizeEndpoint(ENV.tigrisEndpointUrl);
  if (!endpoint || !tigrisAccessKeyId || !tigrisSecretAccessKey) {
    throw new Error(
      "Tigris credentials missing: set TIGRIS_* variables, Railway Bucket variables, or AWS_* S3 variables"
    );
  }
  return new S3Client({
    region: tigrisRegion,
    endpoint,
    forcePathStyle: tigrisForcePathStyle,
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
    throw new Error("Tigris bucket name missing: set TIGRIS_BUCKET_NAME, BUCKET_NAME, or Railway BUCKET");
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
 * Delete a file from Tigris.
 */
export async function storageDelete(relKey: string): Promise<{ key: string }> {
  const client = getS3Client();
  const bucket = getBucket();
  const key = normalizeKey(relKey);

  await client.send(new DeleteObjectCommand({
    Bucket: bucket,
    Key: key,
  }));

  return { key };
}

/**
 * Read the raw bytes of an existing object from Tigris.
 * Used for bundling files (e.g. bird photos) into a server-built archive,
 * where a pre-signed URL isn't enough — we need the actual content.
 */
export async function storageGetBytes(relKey: string): Promise<Buffer> {
  const client = getS3Client();
  const bucket = getBucket();
  const key = normalizeKey(relKey);

  const res = await client.send(
    new GetObjectCommand({ Bucket: bucket, Key: key })
  );

  const body = res.Body;
  if (!body) {
    throw new Error(`Empty object body for key: ${key}`);
  }

  // AWS SDK v3 in Node returns a stream with transformToByteArray()
  const anyBody = body as unknown as { transformToByteArray?: () => Promise<Uint8Array> };
  if (typeof anyBody.transformToByteArray === "function") {
    const bytes = await anyBody.transformToByteArray();
    return Buffer.from(bytes);
  }

  // Fallback: async-iterable stream
  const chunks: Buffer[] = [];
  for await (const chunk of body as AsyncIterable<Uint8Array>) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
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
