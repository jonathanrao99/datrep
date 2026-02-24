-- Create file_status enum
CREATE TYPE "file_status" AS ENUM('pending', 'completed', 'failed');

-- Create files table
CREATE TABLE IF NOT EXISTS "files" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text,
  "filename" text NOT NULL,
  "file_size" integer NOT NULL,
  "file_type" text NOT NULL,
  "status" "file_status" NOT NULL DEFAULT 'pending',
  "insights_count" integer DEFAULT 0,
  "charts_count" integer DEFAULT 0,
  "created_at" timestamp NOT NULL DEFAULT now()
);

-- Create analyses table
CREATE TABLE IF NOT EXISTS "analyses" (
  "id" text PRIMARY KEY NOT NULL,
  "file_id" text NOT NULL,
  "data_summary" jsonb,
  "insights" jsonb,
  "statistics" jsonb,
  "missing_values" jsonb,
  "data_types" jsonb,
  "charts" jsonb,
  "file_info" jsonb,
  "created_at" timestamp NOT NULL DEFAULT now()
);

-- Add foreign key
ALTER TABLE "analyses" ADD CONSTRAINT "analyses_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "files"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
