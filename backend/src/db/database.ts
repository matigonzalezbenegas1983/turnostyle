import BetterSqlite3 from 'better-sqlite3';
import path from 'path';
import { runSchema } from './schema';

const DB_PATH = process.env.DB_PATH ?? path.join(__dirname, '../../data/barbershop.db');

let _db: BetterSqlite3.Database | null = null;

export function getDb(): BetterSqlite3.Database {
  if (!_db) {
    _db = new BetterSqlite3(DB_PATH);
    _db.pragma('journal_mode = WAL');
    _db.pragma('foreign_keys = ON');
    runSchema(_db);
  }
  return _db;
}
