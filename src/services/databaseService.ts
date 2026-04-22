import { supabase } from './lib/supabase';

export class DatabaseService {
  /**
   * Helper to map Firestore-style paths to Supabase tables.
   * e.g. "schools/123/classes" -> table "classes", filter { school_id: "123" }
   */
  private static parsePath(path: string): { table: string; filters: Record<string, any> } {
    const parts = path.split('/').filter(Boolean);
    // In Firestore paths, collections are at even indices (0, 2, 4...)
    // We want the last collection name as the Supabase table name.
    const tableIndex = (parts.length - 1) % 2 === 0 ? parts.length - 1 : parts.length - 2;
    const table = parts[tableIndex];
    
    // For specific nested paths we know about, we can extract filters
    const filters: Record<string, any> = {};
    if (parts.length >= 3 && parts[0] === 'schools') {
      filters.school_id = parts[1];
    }

    return { table, filters };
  }

  /**
   * Converts camelCase keys to snake_case.
   * Special handling: removes 'uid' for the users table as 'id' is used instead.
   */
  private static toSnakeCase(obj: any, table?: string): any {
    if (typeof obj === 'string') {
      if (table === 'users' && obj === 'uid') return 'id';
      return obj.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    }
    if (Array.isArray(obj)) return obj.map(v => this.toSnakeCase(v, table));
    if (obj !== null && typeof obj === 'object' && obj.constructor === Object) {
      const source = { ...obj };
      
      // For users table, if we have uid, move it to id if id is missing, then delete uid
      if (table === 'users' && source.uid) {
        if (!source.id) source.id = source.uid;
        delete source.uid;
      }

      return Object.keys(source).reduce((acc, key) => {
        const snakeKey = this.toSnakeCase(key, table);
        acc[snakeKey] = this.toSnakeCase(source[key], table);
        return acc;
      }, {} as any);
    }
    return obj;
  }

  /**
   * Converts snake_case keys to camelCase.
   * Special handling: maps 'id' to 'uid' for the users table to maintain Firebase compatibility.
   */
  private static toCamelCase(obj: any, table?: string): any {
    if (typeof obj === 'string') {
      if (table === 'users' && obj === 'id') return 'uid';
      return obj.replace(/([-_][a-z])/g, group =>
        group.toUpperCase().replace('-', '').replace('_', '')
      );
    }
    if (Array.isArray(obj)) return obj.map(v => this.toCamelCase(v, table));
    if (obj !== null && typeof obj === 'object' && obj.constructor === Object) {
      const result = Object.keys(obj).reduce((acc, key) => {
        const camelKey = this.toCamelCase(key, table);
        acc[camelKey] = this.toCamelCase(obj[key], table);
        return acc;
      }, {} as any);

      // Explicitly map id to uid for users table if not already present
      if (table === 'users' && obj.id && !result.uid) {
        result.uid = obj.id;
      }

      return result;
    }
    return obj;
  }

  static async getItems<T>(path: string, conditions: Record<string, any> = {}): Promise<T[]> {
    const { table, filters } = this.parsePath(path);
    let query = supabase.from(table).select('*');

    // Apply path filters
    Object.entries(filters).forEach(([key, value]) => {
      query = query.eq(key, value);
    });

    // Apply additional conditions (mapping keys to snake_case)
    Object.entries(conditions).forEach(([key, value]) => {
      const snakeKey = this.toSnakeCase(key, table);
      query = query.eq(snakeKey, value);
    });

    const { data, error } = await query;
    if (error) throw error;
    return this.toCamelCase(data, table) as T[];
  }

  static async getItemById<T>(path: string, id: string): Promise<T | null> {
    const { table } = this.parsePath(path);
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .eq('id', id)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data ? this.toCamelCase(data, table) as T : null;
  }

  static async addItem(path: string, data: any) {
    const { table, filters } = this.parsePath(path);
    const payload = this.toSnakeCase({ ...data, ...filters }, table);
    
    const { data: insertedData, error } = await supabase
      .from(table)
      .insert(payload)
      .select()
      .single();
    
    if (error) throw error;
    return this.toCamelCase(insertedData, table);
  }

  static async updateItem(path: string, id: string, data: any) {
    const { table } = this.parsePath(path);
    const payload = this.toSnakeCase(data, table);
    
    const { data: updatedData, error } = await supabase
      .from(table)
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return this.toCamelCase(updatedData, table);
  }

  static async upsertItem(path: string, id: string, data: any) {
    const { table, filters } = this.parsePath(path);
    const payload = this.toSnakeCase({ ...data, ...filters, id }, table);
    
    const { data: upsertedData, error } = await supabase
      .from(table)
      .upsert(payload)
      .select()
      .single();
    
    if (error) throw error;
    return this.toCamelCase(upsertedData, table);
  }

  static async deleteItem(path: string, id: string) {
    const { table } = this.parsePath(path);
    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }

  static subscribe(path: string, callback: (data: any[]) => void, conditions: Record<string, any> = {}) {
    const { table } = this.parsePath(path);
    
    // Initial fetch
    this.getItems(path, conditions).then(callback);

    // Real-time subscription
    return supabase
      .channel(`${table}-changes`)
      .on('postgres_changes', { event: '*', schema: 'public', table }, () => {
        this.getItems(path, conditions).then(callback);
      })
      .subscribe();
  }
}
