import { supabase, secondarySupabase } from './supabase';
import { 
  signOut as supabaseSignOut, 
  onAuthStateChanged as supabaseOnAuthStateChanged,
  sendPasswordResetEmail as supabaseSendPasswordResetEmail,
  updatePassword as supabaseUpdatePassword
} from './auth';
import { DatabaseService } from '../services/databaseService';

export interface User {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  emailVerified?: boolean;
  phoneNumber?: string | null;
  isAnonymous?: boolean;
}

/**
 * Compatibility Layer for Firebase-to-Supabase migration.
 * This shim allows the application to continue using Firestore/Firebase Auth syntax
 * while the underlying data is handled by Supabase.
 */
export const db = {};
export const auth = {
  get currentUser() { return null; }
};

export const secondaryAuth = {
  get currentUser() { return null; },
  signOut: async () => { await secondarySupabase.auth.signOut(); }
};

// Re-exporting Supabase versions of Auth functions with generic names
export const signInWithEmailAndPassword = async (authObj: any, email: string, password: string): Promise<{ user: User }> => {
  const client = authObj === secondaryAuth ? secondarySupabase : supabase;
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  if (!data.user) throw new Error("Login failed");
  const user: User = {
    uid: data.user.id,
    email: data.user.email!,
    emailVerified: !!data.user.email_confirmed_at,
    isAnonymous: false
  };
  return { user };
};

export const createUserWithEmailAndPassword = async (authObj: any, email: string, password: string, options?: { data?: any }): Promise<{ user: User }> => {
  const client = authObj === secondaryAuth ? secondarySupabase : supabase;
  const { data, error } = await client.auth.signUp({ 
    email, 
    password,
    options: {
      data: options?.data
    }
  });
  if (error) throw error;
  if (!data.user) throw new Error("Signup failed");
  const user: User = {
    uid: data.user.id,
    email: data.user.email!,
    emailVerified: !!data.user.email_confirmed_at || !!options?.data?.email_confirm,
    isAnonymous: false
  };
  return { user };
};

export const signOut = async (_auth: any) => {
  return supabaseSignOut();
};

export const onAuthStateChanged = (_auth: any, callback: any) => {
  return supabaseOnAuthStateChanged(callback);
};

export const sendPasswordResetEmail = async (_auth: any, email: string) => {
  return supabaseSendPasswordResetEmail(email);
};

export const updatePassword = async (_user: any, password: string) => {
  return supabaseUpdatePassword(password);
};

// Firestore-like shim for Database operations
export const collection = (_db: any, ...paths: string[]) => paths.join('/');
export const doc = (_db: any, ...paths: string[]) => paths.join('/');

export const getDoc = async (path: string) => {
  const parts = path.split('/');
  const id = parts.pop()!;
  const collectionPath = parts.join('/');
  const data = await DatabaseService.getItemById(collectionPath, id);
  return {
    exists: () => !!data,
    data: () => data as any,
    id
  };
};

/**
 * Helper to extract query metadata (conditions, orderBy, limit, in-filters) from constraints.
 */
const extractQueryMeta = (constraints: any[]) => {
  const conditions: Record<string, any> = {};
  const inFilters: { field: string; values: any[] }[] = [];
  let sortField: string | null = null;
  let sortDirection: 'asc' | 'desc' = 'asc';
  let limitCount: number | null = null;

  constraints.forEach((c: any) => {
    if (!c) return;
    if (c.type === 'orderBy') {
      sortField = c.field;
      sortDirection = c.direction === 'desc' ? 'desc' : 'asc';
    } else if (c.type === 'limit') {
      limitCount = c.value;
    } else if (c.op === '==') {
      const field = c.field.replace(/[A-Z]/g, (l: string) => `_${l.toLowerCase()}`);
      conditions[field] = c.value;
    } else if (c.op === 'in') {
      const field = c.field.replace(/[A-Z]/g, (l: string) => `_${l.toLowerCase()}`);
      inFilters.push({ field, values: c.value });
    }
  });

  return { conditions, inFilters, sortField, sortDirection, limitCount };
};

/**
 * Apply post-fetch sorting, in-filtering, and limiting to data arrays.
 */
const applyPostProcessing = (
  data: any[],
  inFilters: { field: string; values: any[] }[],
  sortField: string | null,
  sortDirection: 'asc' | 'desc',
  limitCount: number | null
): any[] => {
  let result = data;

  // Apply 'in' filters
  for (const f of inFilters) {
    const camelField = f.field.replace(/([-_][a-z])/g, group =>
      group.toUpperCase().replace('-', '').replace('_', '')
    );
    result = result.filter(item => f.values.includes(item[camelField]) || f.values.includes(item[f.field]));
  }

  // Apply sorting
  if (sortField) {
    const camelSort = sortField.replace(/([-_][a-z])/g, group =>
      group.toUpperCase().replace('-', '').replace('_', '')
    );
    result.sort((a, b) => {
      const aVal = a[camelSort] ?? a[sortField!] ?? '';
      const bVal = b[camelSort] ?? b[sortField!] ?? '';
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }
      return sortDirection === 'asc'
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });
  }

  // Apply limit
  if (limitCount !== null && limitCount > 0) {
    result = result.slice(0, limitCount);
  }

  return result;
};

export const getDocs = async (queryOrPath: any) => {
  const path = typeof queryOrPath === 'string' ? queryOrPath : queryOrPath.path;
  const constraints = typeof queryOrPath === 'string' ? [] : queryOrPath.constraints;

  const { conditions, inFilters, sortField, sortDirection, limitCount } = extractQueryMeta(constraints);

  let data = await DatabaseService.getItems(path, conditions);
  data = applyPostProcessing(data, inFilters, sortField, sortDirection, limitCount);

  return {
    docs: data.map((item: any) => ({
      id: item.id,
      data: () => item as any
    })),
    size: data.length,
    empty: data.length === 0
  };
};

export const setDoc = async (path: string, data: any, options?: { merge?: boolean }) => {
  const parts = path.split('/');
  const id = parts.pop()!;
  const collectionPath = parts.join('/');
  return DatabaseService.upsertItem(collectionPath, id, data);
};

export const addDoc = async (path: string, data: any) => {
  return DatabaseService.addItem(path, data);
};

export const updateDoc = async (path: string, data: any) => {
  const parts = path.split('/');
  const id = parts.pop()!;
  const collectionPath = parts.join('/');
  return DatabaseService.updateItem(collectionPath, id, data);
};

export const deleteDoc = async (path: string) => {
  const parts = path.split('/');
  const id = parts.pop()!;
  const collectionPath = parts.join('/');
  return DatabaseService.deleteItem(collectionPath, id);
};

export const query = (path: string, ...constraints: any[]) => {
  return { path, constraints };
};

export const where = (field: string, op: string, value: any) => ({ field, op, value });

export const onSnapshot = (queryObj: any, callback: any, errorCallback?: (error: any) => void) => {
  const path = typeof queryObj === 'string' ? queryObj : queryObj.path;
  const constraints = typeof queryObj === 'string' ? [] : queryObj.constraints;
  const isDocument = path.split('/').filter(Boolean).length % 2 === 0;

  const { conditions, inFilters, sortField, sortDirection, limitCount } = extractQueryMeta(constraints);

  const subscription = DatabaseService.subscribe(path, (data) => {
    try {
      let processed = applyPostProcessing(data, inFilters, sortField, sortDirection, limitCount);

      if (isDocument) {
        const item = processed[0] || null;
        callback({
          exists: () => !!item,
          data: () => item as any,
          id: path.split('/').pop()
        });
      } else {
        callback({
          docs: processed.map((item: any) => ({
            id: item.id,
            data: () => item as any
          })),
          size: processed.length,
          empty: processed.length === 0
        });
      }
    } catch (err) {
      if (errorCallback) errorCallback(err);
      else console.error('onSnapshot processing error:', err);
    }
  }, conditions);

  return () => {
    supabase.removeChannel(subscription);
  };
};

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  console.error('Database Error: ', error, operationType, path);
  // We no longer throw here to allow call sites to continue with UI feedback (e.g. showing error messages)
}

// Audit logging
export async function logAuditAction(
  action: string, 
  details: string, 
  targetId?: string, 
  targetType?: string
) {
  try {
    await DatabaseService.addItem('audit_logs', {
      action,
      details,
      targetId: targetId || 'none',
      targetType: targetType || 'none',
      createdAt: new Date().toISOString()
    });
  } catch (error) {
    console.error("Failed to write audit log:", error);
  }
}

// Mocks for unused legacy features to prevent build errors
export const googleProvider = { provider: 'google' };
export const signInWithPopup = async (_auth: any, _provider: any): Promise<{ user: User }> => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
      skipBrowserRedirect: false
    },
  });
  if (error) throw error;
  // Note: OAuth doesn't return user immediately in popup/redirect flow for Supabase JS usually
  // but the auth state listener will catch it.
  return { user: {} as User }; 
};
export const signInWithRedirect = async (_auth: any, _provider: any): Promise<void> => {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
    },
  });
  if (error) throw error;
};
export const getRedirectResult = async (_auth: any): Promise<{ user: User } | null> => {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) throw error;
  if (!session?.user) return null;
  return { 
    user: { 
      uid: session.user.id, 
      email: session.user.email!, 
      emailVerified: !!session.user.email_confirmed_at, 
      isAnonymous: false 
    } 
  };
};
export const serverTimestamp = () => ({ __type: 'timestamp' });
export const increment = (n: number) => ({ __type: 'increment', value: n });

/**
 * writeBatch — Functional Supabase implementation.
 * Collects set/update/delete operations and executes them all on commit().
 */
export const writeBatch = (_db?: any) => {
  const operations: Array<{ type: 'set' | 'update' | 'delete'; path: string; data?: any; options?: any }> = [];

  return {
    set: (docPath: any, data: any, options?: any) => {
      operations.push({ type: 'set', path: String(docPath), data, options });
    },
    update: (docPath: any, data: any) => {
      operations.push({ type: 'update', path: String(docPath), data });
    },
    delete: (docPath: any) => {
      operations.push({ type: 'delete', path: String(docPath) });
    },
    commit: async () => {
      for (const op of operations) {
        const parts = op.path.split('/');
        const isDocument = parts.length % 2 === 0;

        if (op.type === 'set') {
          if (isDocument) {
            // Document path: upsert with ID
            const id = parts.pop()!;
            const collectionPath = parts.join('/');
            await DatabaseService.upsertItem(collectionPath, id, op.data);
          } else {
            // Collection path: add new item
            await DatabaseService.addItem(op.path, op.data);
          }
        } else if (op.type === 'update') {
          if (isDocument) {
            const id = parts.pop()!;
            const collectionPath = parts.join('/');
            await DatabaseService.updateItem(collectionPath, id, op.data);
          }
        } else if (op.type === 'delete') {
          if (isDocument) {
            const id = parts.pop()!;
            const collectionPath = parts.join('/');
            await DatabaseService.deleteItem(collectionPath, id);
          }
        }
      }
    }
  };
};
export const limit = (n: number) => ({ type: 'limit', value: n });
export const orderBy = (field: string, direction: string = 'asc') => ({ type: 'orderBy', field, direction });
export const getDocFromServer = getDoc;
