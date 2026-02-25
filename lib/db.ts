import 'server-only';

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import {
  pgTable,
  text,
  integer,
  timestamp,
  jsonb,
  pgEnum
} from 'drizzle-orm/pg-core';
import { eq, desc } from 'drizzle-orm';

const connectionString = process.env.POSTGRES_URL;
export const db = connectionString ? drizzle(neon(connectionString)) : null;

export const fileStatusEnum = pgEnum('file_status', ['pending', 'completed', 'failed']);

export const files = pgTable('files', {
  id: text('id').primaryKey(),
  userId: text('user_id'),
  filename: text('filename').notNull(),
  fileSize: integer('file_size').notNull(),
  fileType: text('file_type').notNull(),
  blobUrl: text('blob_url'),
  /** Base64 file content when using Postgres storage (no Blob). Max ~5MB recommended. */
  fileDataBase64: text('file_data_base64'),
  status: fileStatusEnum('status').notNull().default('pending'),
  insightsCount: integer('insights_count').default(0),
  chartsCount: integer('charts_count').default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const analyses = pgTable('analyses', {
  id: text('id').primaryKey(),
  fileId: text('file_id').notNull().references(() => files.id, { onDelete: 'cascade' }),
  dataSummary: jsonb('data_summary'),
  insights: jsonb('insights'),
  statistics: jsonb('statistics'),
  missingValues: jsonb('missing_values'),
  dataTypes: jsonb('data_types'),
  charts: jsonb('charts'),
  fileInfo: jsonb('file_info'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export type SelectFile = typeof files.$inferSelect;
export type SelectAnalysis = typeof analyses.$inferSelect;

export async function createFile(data: {
  id: string;
  userId?: string;
  filename: string;
  fileSize: number;
  fileType: string;
  blobUrl?: string;
  fileDataBase64?: string;
}) {
  if (!db) return;
  await db.insert(files).values({
    id: data.id,
    userId: data.userId ?? null,
    filename: data.filename,
    fileSize: data.fileSize,
    fileType: data.fileType,
    blobUrl: data.blobUrl ?? null,
    fileDataBase64: data.fileDataBase64 ?? null,
    status: 'pending',
  });
}

export async function updateFileStatus(
  fileId: string,
  status: 'pending' | 'completed' | 'failed',
  insightsCount?: number,
  chartsCount?: number
) {
  if (!db) return;
  await db
    .update(files)
    .set({
      status,
      ...(insightsCount !== undefined && { insightsCount }),
      ...(chartsCount !== undefined && { chartsCount }),
    })
    .where(eq(files.id, fileId));
}

export async function getFilesByUserId(userId: string | undefined) {
  if (!db) return [];
  if (!userId) {
    return db.select().from(files).orderBy(desc(files.createdAt));
  }
  return db
    .select()
    .from(files)
    .where(eq(files.userId, userId))
    .orderBy(desc(files.createdAt));
}

export async function getFileById(fileId: string) {
  if (!db) return null;
  const result = await db.select().from(files).where(eq(files.id, fileId)).limit(1);
  return result[0] ?? null;
}

export async function deleteFileById(fileId: string) {
  if (!db) return;
  await db.delete(files).where(eq(files.id, fileId));
}

export async function saveAnalysis(data: {
  id: string;
  fileId: string;
  dataSummary: any;
  insights: any;
  statistics?: any;
  missingValues?: any;
  dataTypes?: any;
  charts?: any;
  fileInfo?: any;
}) {
  if (!db) return;
  await db.insert(analyses).values({
    id: data.id,
    fileId: data.fileId,
    dataSummary: data.dataSummary,
    insights: data.insights,
    statistics: data.statistics,
    missingValues: data.missingValues,
    dataTypes: data.dataTypes,
    charts: data.charts ?? [],
    fileInfo: data.fileInfo,
  });
}

export async function getAnalysisByFileId(fileId: string) {
  if (!db) return null;
  const result = await db
    .select()
    .from(analyses)
    .where(eq(analyses.fileId, fileId))
    .orderBy(desc(analyses.createdAt))
    .limit(1);
  return result[0] ?? null;
}

export async function getDashboardStats(userId?: string) {
  if (!db) return { totalProjects: 0, totalInsights: 0, totalCharts: 0, recentUploads: 0 };
  const filesQuery = userId
    ? db.select().from(files).where(eq(files.userId, userId))
    : db.select().from(files);

  const allFiles = await filesQuery;
  const totalProjects = allFiles.length;
  const totalInsights = allFiles.reduce((sum, f) => sum + (f.insightsCount ?? 0), 0);
  const totalCharts = allFiles.reduce((sum, f) => sum + (f.chartsCount ?? 0), 0);
  const recentUploads = allFiles.filter((f) => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return new Date(f.createdAt) >= weekAgo;
  }).length;

  return {
    totalProjects,
    totalInsights,
    totalCharts,
    recentUploads,
  };
}
