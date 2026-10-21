-- Accounts created before email verification existed are grandfathered in as
-- verified, so the new login gate does not lock them out. From this point on,
-- new registrations must confirm their email.
UPDATE "User" SET "emailVerified" = NOW() WHERE "emailVerified" IS NULL;
