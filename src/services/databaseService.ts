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
    // For many others, we just use the last part as the table and the second as a parent ID
    const lastPart = parts[parts.length - 1];
    const parentId = parts[parts.length - 2];
    const parentType = parts[parts.length - 3];

    if (parentType === 'schools') {
      return { table: lastPart, filters: { school_id: parentId } };
    }

    return { table: lastPart, filters: {} };
  }

  static async getItems<T>(path: string, conditions: Record<string, any> = {}): Promise<T[]> {
    const { table, filters } = this.parsePath(path);
    let query = supabase.from(table).select('*');

    // Apply path filters
    Object.entries(filters).forEach(([key, value]) => {
      query = query.eq(key, value);
    });

    // Apply additional conditions
    Object.entries(conditions).forEach(([key, value]) => {
      query = query.eq(key, value);
    });

    const { data, error } = await query;
    if (error) throw error;
    return data as T[];
  }

  static async getItemById<T>(path: string, id: string): Promise<T | null> {
    const { table } = this.parsePath(path);
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .eq('id', id)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "no rows returned"
    return data as T | null;
  }

  static async addItem(path: string, data: any) {
    const { table, filters } = this.parsePath(path);
    const payload = { ...data, ...filters };
    
    const { data: insertedData, error } = await supabase
      .from(table)
      .insert(payload)
      .select()
      .single();
    
    if (error) throw error;
    return insertedData;
  }

  static async updateItem(path: string, id: string, data: any) {
    const { table } = this.parsePath(path);
    const { data: updatedData, error } = await supabase
      .from(table)
      .update(data)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return updatedData;
  }

  static async upsertItem(path: string, id: string, data: any) {
    const { table, filters } = this.parsePath(path);
    const { data: upsertedData, error } = await supabase
      .from(table)
      .upsert({ ...data, ...filters, id })
      .select()
      .single();
    
    if (error) throw error;
    return upsertedData;
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
    const { table, filters } = this.parsePath(path);
    
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
