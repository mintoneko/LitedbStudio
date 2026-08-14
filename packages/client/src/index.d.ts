export interface ClientOptions {
  mode?: 'http' | 'embedded';
  endpoint?: string;
  apiKey?: string;
  dbPath?: string;
  timeout?: number;
}

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

export class CollectionClient<T = Record<string, any>> {
  readonly name: string;
  constructor(name: string, adapter: any);

  insert(doc: Partial<T>): Promise<T & { id: string; created_at: string; updated_at: string }>;
  insertMany(docs: Array<Partial<T>>): Promise<Array<T & { id: string; created_at: string; updated_at: string }>>;
  findById(id: string, select?: string[]): Promise<(T & { id: string; created_at: string; updated_at: string }) | null>;
  findOne(filter?: Record<string, any>, options?: QueryOptions): Promise<(T & { id: string; created_at: string; updated_at: string }) | null>;
  find(filter?: Record<string, any>, options?: QueryOptions): Promise<Array<T & { id: string; created_at: string; updated_at: string }>>;
  paginate(filter?: Record<string, any>, options?: PaginationOptions): Promise<PaginatedResult<T & { id: string; created_at: string; updated_at: string }>>;
  count(filter?: Record<string, any>): Promise<number>;
  updateById(id: string, patch: Partial<T>): Promise<(T & { id: string; created_at: string; updated_at: string }) | null>;
  updateMany(filter: Record<string, any>, patch: Partial<T>): Promise<number>;
  deleteById(id: string): Promise<boolean>;
  deleteMany(filter?: Record<string, any>): Promise<number>;
  clear(): Promise<boolean>;
  createIndex(field: string): Promise<boolean>;
}

export class LiteDB {
  readonly mode: 'http' | 'embedded';
  constructor(options?: ClientOptions);

  collection<T = Record<string, any>>(name: string): CollectionClient<T>;
  listCollections(): Promise<Array<{ name: string; count: number; created_at: string; updated_at: string }>>;
  createCollection(name: string): Promise<{ name: string }>;
  dropCollection(name: string): Promise<boolean>;
  rawSql(sql: string, params?: any[]): Promise<{ type: 'select' | 'execute'; rows?: any[]; changes?: number }>;
  getStats(): Promise<SystemStats>;
  exportSnapshot(): Promise<{ version: string; exported_at: string; collections: Record<string, any[]> }>;
  importSnapshot(snapshot: any): Promise<Record<string, number>>;
  close(): void;
}
