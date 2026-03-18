import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

type JournalEntry = {
  tag?: string;
};

type MigrationJournal = {
  entries?: JournalEntry[];
};

type PostprocessState = {
  lastProcessedTag?: string;
};

const rootDir = process.cwd();
const journalPath = path.join(rootDir, 'drizzle', 'meta', '_journal.json');
const statePath = path.join(rootDir, 'drizzle', 'meta', '_postprocess-migration.json');

if (!existsSync(journalPath)) {
  process.exit(0);
}

const journal = JSON.parse(readFileSync(journalPath, 'utf8')) as MigrationJournal;
const latestEntry = journal.entries?.[journal.entries.length - 1];

if (!latestEntry?.tag) {
  process.exit(0);
}

const state = existsSync(statePath)
  ? (JSON.parse(readFileSync(statePath, 'utf8')) as PostprocessState)
  : undefined;

if (state?.lastProcessedTag === latestEntry.tag) {
  process.exit(0);
}

const migrationPath = path.join(rootDir, 'drizzle', `${latestEntry.tag}.sql`);

if (!existsSync(migrationPath)) {
  process.exit(0);
}

const originalSql = readFileSync(migrationPath, 'utf8');
const updatedSql = originalSql.replaceAll('ADD COLUMN "', 'ADD COLUMN IF NOT EXISTS "');

if (updatedSql !== originalSql) {
  writeFileSync(migrationPath, updatedSql);
}

writeFileSync(statePath, `${JSON.stringify({ lastProcessedTag: latestEntry.tag }, null, 2)}\n`);