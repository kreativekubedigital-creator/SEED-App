
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function fixDefaults() {
  // We can't run arbitrary SQL via the client easily unless we have a function
  // But we can try to use a RPC if available, or just tell the user to run it.
  
  const sql = `
-- Ensure pgcrypto is available for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Add defaults to id columns
ALTER TABLE sessions ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE terms ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE grade_scales ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE attendance_records ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE lessons ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE lesson_results ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE challenges ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE graduation_students ALTER COLUMN id SET DEFAULT gen_random_uuid();
`;

  console.log("Please run the following SQL in your Supabase SQL Editor:");
  console.log(sql);
}

fixDefaults();
