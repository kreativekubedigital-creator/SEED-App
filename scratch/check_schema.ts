
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xjdjsaatcmppqdgzawgi.supabase.co';
const supabaseAnonKey = 'sb_publishable_vYy_iHTwzvma7kVwPVnXGA_ZwMpx_Bw';

const supabase = createClient(supabaseUrl, supabaseAnonKey);


async function testInsert() {
  const table = 'sessions';
  console.log(`Testing insert into ${table}...`);
  const { data, error } = await supabase.from(table).insert({ name: 'Test', school_id: 'any' }).select();
  if (error) console.error(`Insert Error:`, error);
  else console.log(`Insert Success:`, data);
}

testInsert();
