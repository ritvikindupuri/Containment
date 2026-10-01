// In-memory and file-persisted local database store for Containment
// Provides a Supabase-compatible query builder interface when Supabase is offline or unconfigured.

import fs from "node:fs";
import path from "node:path";

export type DbRecord = Record<string, any>;

interface LocalStoreData {
  policies: DbRecord[];
  policy_versions: DbRecord[];
  decisions: DbRecord[];
  api_keys: DbRecord[];
  flow_sessions: DbRecord[];
  profiles: DbRecord[];
  [key: string]: DbRecord[];
}

const DB_FILE_PATH = path.resolve(process.cwd(), ".containment_local_db.json");

function loadDb(): LocalStoreData {
  try {
    if (fs.existsSync(DB_FILE_PATH)) {
      const content = fs.readFileSync(DB_FILE_PATH, "utf-8");
      return JSON.parse(content);
    }
  } catch {
    // ignore
  }
  return {
    policies: [],
    policy_versions: [],
    decisions: [],
    api_keys: [],
    flow_sessions: [],
    profiles: [],
  };
}

let memoryDb: LocalStoreData = loadDb();

function saveDb() {
  try {
    fs.writeFileSync(DB_FILE_PATH, JSON.stringify(memoryDb, null, 2), "utf-8");
  } catch {
    // ignore filesystem write errors in read-only environments
  }
}

export class LocalQueryBuilder implements PromiseLike<{ data: any; error: any }> {
  private tableName: string;
  private filters: Array<(row: DbRecord) => boolean> = [];
  private orderField?: string | undefined;
  private ascending = true;
  private limitCount?: number | undefined;
  private pendingInsert?: DbRecord | DbRecord[] | undefined;
  private pendingUpdate?: DbRecord | undefined;
  private pendingUpsert?: { data: DbRecord | DbRecord[]; onConflict?: string | undefined } | undefined;
  private pendingDelete = false;
  private selectFields?: string[] | undefined;

  constructor(tableName: string) {
    this.tableName = tableName;
    if (!memoryDb[tableName]) {
      memoryDb[tableName] = [];
    }
  }

  select(fields?: string) {
    if (fields && fields !== "*") {
      this.selectFields = fields.split(",").map((f) => f.trim());
    }
    return this;
  }

  insert(values: DbRecord | DbRecord[]) {
    this.pendingInsert = values;
    return this;
  }

  update(values: DbRecord) {
    this.pendingUpdate = values;
    return this;
  }

  upsert(values: DbRecord | DbRecord[], options?: { onConflict?: string }) {
    this.pendingUpsert = { data: values, ...(options?.onConflict !== undefined ? { onConflict: options.onConflict } : {}) };
    return this;
  }

  delete() {
    this.pendingDelete = true;
    return this;
  }

  eq(field: string, value: any) {
    this.filters.push((row) => row[field] === value);
    return this;
  }

  order(field: string, options?: { ascending?: boolean }) {
    this.orderField = field;
    this.ascending = options?.ascending ?? true;
    return this;
  }

  limit(count: number) {
    this.limitCount = count;
    return this;
  }

  private project(row: DbRecord): DbRecord {
    if (!this.selectFields || this.selectFields.length === 0) return { ...row };
    const res: DbRecord = {};
    for (const f of this.selectFields) {
      if (f in row) res[f] = row[f];
    }
    return res;
  }

  async execute(): Promise<{ data: any; error: any }> {
    const table = memoryDb[this.tableName] || (memoryDb[this.tableName] = []);

    // Handle Insert
    if (this.pendingInsert) {
      const items = Array.isArray(this.pendingInsert) ? this.pendingInsert : [this.pendingInsert];
      const inserted: DbRecord[] = [];

      for (const item of items) {
        if (!item) continue;
        const row: DbRecord = {
          id: item["id"] || `loc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          created_at: item["created_at"] || new Date().toISOString(),
          updated_at: new Date().toISOString(),
          ...item,
        };
        table.push(row);
        inserted.push(this.project(row));
      }
      saveDb();
      const resultData = Array.isArray(this.pendingInsert) ? inserted : inserted[0];
      return { data: resultData, error: null };
    }

    // Handle Upsert
    if (this.pendingUpsert) {
      const items = Array.isArray(this.pendingUpsert.data) ? this.pendingUpsert.data : [this.pendingUpsert.data];
      const conflicts = (this.pendingUpsert.onConflict ?? "id").split(",").map((c) => c.trim());
      const upserted: DbRecord[] = [];

      for (const item of items) {
        if (!item) continue;
        const matchIdx = table.findIndex((row) => row && conflicts.every((c) => row[c] === item[c]));
        if (matchIdx >= 0) {
          const existing = table[matchIdx];
          if (existing) {
            table[matchIdx] = {
              ...existing,
              ...item,
              updated_at: new Date().toISOString(),
            };
            upserted.push(this.project(table[matchIdx]!));
          }
        } else {
          const row: DbRecord = {
            id: item["id"] || `loc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            created_at: item["created_at"] || new Date().toISOString(),
            updated_at: new Date().toISOString(),
            ...item,
          };
          table.push(row);
          upserted.push(this.project(row));
        }
      }
      saveDb();
      const resultData = Array.isArray(this.pendingUpsert.data) ? upserted : upserted[0];
      return { data: resultData, error: null };
    }

    // Handle Update
    if (this.pendingUpdate) {
      const updated: DbRecord[] = [];
      for (let i = 0; i < table.length; i++) {
        const item = table[i];
        if (item && this.filters.every((fn) => fn(item))) {
          table[i] = {
            ...item,
            ...this.pendingUpdate,
            updated_at: new Date().toISOString(),
          };
          updated.push(this.project(table[i]!));
        }
      }
      saveDb();
      return { data: updated, error: null };
    }

    // Handle Delete
    if (this.pendingDelete) {
      memoryDb[this.tableName] = table.filter((row) => row && !this.filters.every((fn) => fn(row)));
      saveDb();
      return { data: null, error: null };
    }

    // Handle Query / Select
    let rows = table.filter((row): row is DbRecord => Boolean(row) && this.filters.every((fn) => fn(row)));

    if (this.orderField) {
      const f = this.orderField;
      const asc = this.ascending;
      rows = [...rows].sort((a, b) => {
        const valA = a[f];
        const valB = b[f];
        if (valA === valB) return 0;
        if (valA === undefined) return 1;
        if (valB === undefined) return -1;
        return asc ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1);
      });
    }

    if (this.limitCount !== undefined && this.limitCount >= 0) {
      rows = rows.slice(0, this.limitCount);
    }

    const projected = rows.map((r) => this.project(r));
    return { data: projected, error: null };
  }

  async single(): Promise<{ data: any; error: any }> {
    const { data, error } = await this.execute();
    if (error) return { data: null, error };
    if (!data) return { data: null, error: { message: "Row not found" } };
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) return { data: null, error: { message: "Row not found" } };
    return { data: row, error: null };
  }

  async maybeSingle(): Promise<{ data: any; error: any }> {
    const { data, error } = await this.execute();
    if (error) return { data: null, error };
    if (!data) return { data: null, error: null };
    const row = Array.isArray(data) ? data[0] : data;
    return { data: row ?? null, error: null };
  }

  then<TResult1 = any, TResult2 = never>(
    onfulfilled?: ((value: { data: any; error: any }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }
}

export function createLocalSupabaseClient() {
  return {
    from(tableName: string) {
      return new LocalQueryBuilder(tableName);
    },
    auth: {
      async getUser() {
        return { data: { user: null }, error: null };
      },
      async getSession() {
        return { data: { session: null }, error: null };
      },
      async getClaims(token: string) {
        const { decodeJwtPayload } = await import("./auth-local");
        const payload = decodeJwtPayload(token);
        if (payload?.["sub"]) {
          return { data: { claims: payload }, error: null };
        }
        return { data: null, error: new Error("Invalid token") };
      },
    },
  };
}

export const localDb = createLocalSupabaseClient();
