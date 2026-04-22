import { supabase } from '../lib/supabase';
import { PostgrestError } from '@supabase/supabase-js';

export class DatabaseService {
  /**
   * Helper to map Firestore-style paths to Supabase tables.
   * e.g. "schools/123/classes" -> table "classes", filter { school_id: "123" }
   */
  private static parsePath(path: string): { table: string; filters: Record<string, any> } {
    const parts = path.split('/');
    
    // Top-level collections
    if (parts.length === 1) {
      return { table: parts[0], filters: {} };
    }

    // Nested collections: schools/{id}/classes
    if (parts.length === 3 && parts[0] === 'schools' && parts[2] === 'classes') {
      return { table: 'classes', filters: { school_id: parts[1] } };
    }
    
    if (parts.length === 3 && parts[0] === 'schools' && parts[2] === 'subjects') {
      return { table: 'subjects', filters: { school_id: parts[1] } };
    }

    // Default mapping for other known nested structures
    const lastPart = parts[parts.length - 1];
    const parentId = parts[parts.length - 2];
    const parentType = parts[parts.length - 3];

    if (parentType === 'schools') {
      return { table: lastPart, filters: { school_id: parentId } };
    }

    return { table: lastPart, filters: {} };
  }

  /**
   * Converts camelCase keys to snake_case.
   * Special handling: removes 'uid' for the users table as 'id' is used instead.
   */
  private static toSnakeCase(obj: any, table?: string): any {
    if (Array.isArray(obj)) return obj.map(v => this.toSnakeCase(v, table));
    if (obj !== null && typeof obj === 'object' && obj.constructor === Object) {
      // Create a shallow copy to avoid mutating original
      const source = { ...obj };
      
      // For users table, if we have uid, move it to id if id is missing, then delete uid
      if (table === 'users' && source.uid) {
        if (!source.id) source.id = source.uid;
        delete source.uid;
      }

      return Object.keys(source).reduce((acc, key) => {
        const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
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
    if (Array.isArray(obj)) return obj.map(v => this.toCamelCase(v, table));
    if (obj !== null && typeof obj === 'object' && obj.constructor === Object) {
      const result = Object.keys(obj).reduce((acc, key) => {
        const camelKey = key.replace(/([-_][a-z])/g, group =>
          group.toUpperCase().replace('-', '').replace('_', '')
        );
        acc[camelKey] = this.toCamelCase(obj[key], table);
        return acc;
      }, {} as any);

      // Map id to uid for users table to satisfy UserProfile type
      if (table === 'users' && result.id && !result.uid) {
        result.uid = result.id;
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
      const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
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
