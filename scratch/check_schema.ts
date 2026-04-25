
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xjdjsaatcmppqdgzawgi.supabase.co';
const supabaseAnonKey = 'sb_publishable_vYy_iHTwzvma7kVwPVnXGA_ZwMpx_Bw';

const supabase = createClient(supabaseUrl, supabaseAnonKey);


async function checkData() {
  const tables = ['schools', 'grade_scales', 'sessions', 'terms'];
  for (const table of tables) {
    console.log(`Checking ${table} table...`);
    const { data, error } = await supabase.from(table).select('*');
    if (error) console.error(`${table} error:`, error.message);
    else console.log(`${table} has ${data.length} records.`);
  }
}

checkData();
