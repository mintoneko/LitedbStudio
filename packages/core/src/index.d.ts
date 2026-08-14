export interface QueryOptions {
  sort?: Record<string, 1 | -1 | 'asc' | 'desc' | 'ASC' | 'DESC'> | string | string[];
  limit?: number;
  skip?: number;
  select?: string[];
}

export interface PaginationOptions extends QueryOptions {
  page?: number;
  pageSize?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface LiteDBEngineOptions {
  path?: string;
  adminKey?: string;
}

export interface ApiKeyRecord {
  id: string;
  key: string;
  name: string;
  role: 'admin' | 'read-write' | 'read-only';
  created_at: string;
  last_used_at?: string;
}

export interface CollectionMeta {
  name: string;
  count: number;
  created_at: string;
  updated_at: string;
}

export interface SystemStats {
  path: string;
  driver: string;
  fileSizeBytes: number;
  fileSizeFormatted: string;
  collectionsCount: number;
  totalDocuments: number;
  apiKeysCount: number;
  memoryUsage: NodeJS.MemoryUsage;
}

export class Collection<T = Record<string, any>> {
  readonly name: string;
  constructor(name: string, engine: LiteDBEngine);

  insert(doc: Partial<T>): T & { id: string; created_at: string; updated_at: string };
  insertMany(docs: Array<Partial<T>>): Array<T & { id: string; created_at: string; updated_at: string }>;
  findById(id: string, select?: string[]): (T & { id: string; created_at: string; updated_at: string }) | null;
  findOne(filter?: Record<string, any>, options?: QueryOptions): (T & { id: string; created_at: string; updated_at: string }) | null;
  find(filter?: Record<string, any>, options?: QueryOptions): Array<T & { id: string; created_at: string; updated_at: string }>;
  paginate(filter?: Record<string, any>, options?: PaginationOptions): PaginatedResult<T & { id: string; created_at: string; updated_at: string }>;
  count(filter?: Record<string, any>): number;
  updateById(id: string, patch: Partial<T>): (T & { id: string; created_at: string; updated_at: string }) | null;
  updateMany(filter: Record<string, any>, patch: Partial<T>): number;
  deleteById(id: string): boolean;
  deleteMany(filter?: Record<string, any>): number;
  createIndex(fieldName: string): void;
  clear(): void;
  drop(): void;
}

export class LiteDBEngine {
  constructor(options?: LiteDBEngineOptions);
  collection<T = Record<string, any>>(name: string): Collection<T>;
  listCollections(): CollectionMeta[];
  dropCollection(name: string): void;
  createApiKey(name: string, role?: 'admin' | 'read-write' | 'read-only', customKey?: string): ApiKeyRecord;
  listApiKeys(): ApiKeyRecord[];
  deleteApiKey(id: string): boolean;
  validateApiKey(apiKey: string): ApiKeyRecord | null;
  rawSql(sql: string, params?: any[]): { type: 'select' | 'execute'; rows?: any[]; changes?: number; lastInsertRowid?: number | bigint };
  getStats(): SystemStats;
  exportSnapshot(): { version: string; exported_at: string; collections: Record<string, any[]> };
  importSnapshot(snapshot: any): Record<string, number>;
  close(): void;
}

export function generateId(size?: number): string;
export function nowTimestamp(): string;
export function sanitizeCollectionName(name: string): string;
export function parseQuery(filter: Record<string, any>): { sql: string; params: any[] };
export function parseSort(sort: any): string;
export function getFieldExpr(field: string): string;
