-- Stop rather than merge accounts when historical emails collide canonically.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "users"
    GROUP BY lower(btrim("email"))
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot add normalized_email: case/whitespace duplicate user emails exist';
  END IF;
END $$;

CREATE TYPE "auth_provider" AS ENUM ('GOOGLE');

ALTER TABLE "users" ADD COLUMN "normalized_email" VARCHAR(320);
UPDATE "users" SET "normalized_email" = lower(btrim("email"));
ALTER TABLE "users" ALTER COLUMN "normalized_email" SET NOT NULL;
ALTER TABLE "users" ALTER COLUMN "password_hash" DROP NOT NULL;

CREATE TABLE "auth_identities" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "provider" "auth_provider" NOT NULL,
  "provider_subject" VARCHAR(255) NOT NULL,
  "provider_email" VARCHAR(320) NOT NULL,
  "provider_display_name" VARCHAR(160),
  "provider_picture_url" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "auth_identities_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_normalized_email_key" ON "users"("normalized_email");
CREATE UNIQUE INDEX "auth_identities_provider_provider_subject_key" ON "auth_identities"("provider", "provider_subject");
CREATE UNIQUE INDEX "auth_identities_user_id_provider_key" ON "auth_identities"("user_id", "provider");
CREATE INDEX "auth_identities_user_id_idx" ON "auth_identities"("user_id");

ALTER TABLE "auth_identities"
  ADD CONSTRAINT "auth_identities_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
