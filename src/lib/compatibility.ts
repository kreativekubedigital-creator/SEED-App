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

export const getDocs = async (queryOrPath: any) => {
  const path = typeof queryOrPath === 'string' ? queryOrPath : queryOrPath.path;
  const constraints = typeof queryOrPath === 'string' ? [] : queryOrPath.constraints;
  
  const conditions: Record<string, any> = {};
  constraints.forEach((c: any) => {
    if (c.op === '==') {
      const field = c.field === 'schoolId' ? 'school_id' : c.field;
      conditions[field] = c.value;
    }
  });

  const data = await DatabaseService.getItems(path, conditions);
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
  
  const conditions: Record<string, any> = {};
  constraints.forEach((c: any) => {
    if (c.op === '==') {
      const field = c.field === 'schoolId' ? 'school_id' : c.field;
      conditions[field] = c.value;
    }
  });

  const subscription = DatabaseService.subscribe(path, (data) => {
    if (isDocument) {
      const item = data[0] || null;
      callback({
        exists: () => !!item,
        data: () => item as any,
        id: path.split('/').pop()
      });
    } else {
      callback({
        docs: data.map((item: any) => ({
          id: item.id,
          data: () => item as any
        })),
        size: data.length,
        empty: data.length === 0
      });
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
export const googleProvider = {};
export const signInWithPopup = async (_auth: any, _provider: any): Promise<{ user: User }> => { throw new Error("Popup login not implemented yet. Use email login."); };
export const signInWithRedirect = async (_auth: any, _provider: any): Promise<void> => { throw new Error("Redirect login not implemented yet. Use email login."); };
export const getRedirectResult = async (_auth: any): Promise<{ user: User } | null> => null;
export const serverTimestamp = () => ({ __type: 'timestamp' });
export const increment = (n: number) => ({ __type: 'increment', value: n });
export const writeBatch = (_db?: any) => ({
  set: (docRef: any, data: any, options?: any) => { console.log('Batch set', docRef, data, options); },
  update: (docRef: any, data: any) => { console.log('Batch update', docRef, data); },
  delete: (docRef: any) => { console.log('Batch delete', docRef); },
  commit: async () => { console.log('Batch commit'); }
});
export const limit = (n: number) => ({ type: 'limit', value: n });
export const orderBy = (field: string, direction: string = 'asc') => ({ type: 'orderBy', field, direction });
export const getDocFromServer = getDoc;
