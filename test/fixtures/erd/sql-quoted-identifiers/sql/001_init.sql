CREATE TABLE "users" (
  id UUID PRIMARY KEY,
  "2fa_enabled" BOOLEAN NOT NULL,
  "display name" TEXT
);

CREATE TABLE "sessions" (
  id UUID PRIMARY KEY,
  "user-id" UUID NOT NULL REFERENCES "users"(id)
);
