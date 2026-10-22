-- Repeatable intent for existing databases. The application runs the equivalent guarded migration at startup.
-- Run manually only if applying migrations outside the application bootstrap.

ALTER TABLE items
  ADD COLUMN image_public_id VARCHAR(255) NULL AFTER image;

ALTER TABLE items
  MODIFY COLUMN image TEXT NULL;
