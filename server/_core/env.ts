if (!process.env.JWT_SECRET) {
  throw new Error(
    "JWT_SECRET environment variable must be set. Generate one with: node -e \"console.log(require('crypto').randomBytes(64).toString('hex'))\""
  );
}

if (process.env.NODE_ENV === "production" && !process.env.STRIPE_WEBHOOK_SECRET) {
  throw new Error("STRIPE_WEBHOOK_SECRET environment variable must be set in production.");
}

export const ENV = {
  cookieSecret: process.env.JWT_SECRET,
  databaseUrl: process.env.DATABASE_URL ?? "",
  isProduction: process.env.NODE_ENV === "production",
  // S3-compatible object storage (set via Railway environment variables)
  tigrisEndpointUrl: process.env.TIGRIS_ENDPOINT_URL ?? "",
  tigrisAccessKeyId: process.env.TIGRIS_ACCESS_KEY_ID ?? "",
  tigrisSecretAccessKey: process.env.TIGRIS_SECRET_ACCESS_KEY ?? "",
  tigrisBucketName: process.env.TIGRIS_BUCKET_NAME ?? "",
  // Legacy Manus OAuth — kept only for backward-compat; remove when Manus users have migrated
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  // Owner email — user with this email gets admin role automatically on login
  ownerEmail: (process.env.OWNER_EMAIL ?? "").toLowerCase(),
};
