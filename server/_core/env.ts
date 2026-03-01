export const ENV = {
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  isProduction: process.env.NODE_ENV === "production",
  // Tigris (Fly.io S3-compatible object storage) — injected automatically by Fly
  tigrisEndpointUrl: process.env.TIGRIS_ENDPOINT_URL ?? "",
  tigrisAccessKeyId: process.env.TIGRIS_ACCESS_KEY_ID ?? "",
  tigrisSecretAccessKey: process.env.TIGRIS_SECRET_ACCESS_KEY ?? "",
  tigrisBucketName: process.env.TIGRIS_BUCKET_NAME ?? "",
  // Legacy Manus OAuth — kept only for backward-compat; remove when Manus users have migrated
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
};
