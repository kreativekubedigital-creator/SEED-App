
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xjdjsaatcmppqdgzawgi.supabase.co';
const supabaseAnonKey = 'sb_publishable_vYy_iHTwzvma7kVwPVnXGA_ZwMpx_Bw';

const supabase = createClient(supabaseUrl, supabaseAnonKey);


async function checkRemaining() {
  console.log('Checking announcements table...');
  const { error: annErr } = await supabase.from('announcements').select('*').limit(1);
  if (annErr) console.error('Announcements error:', annErr.message);
  else console.log('Announcements table exists.');

  console.log('Checking timetables table...');
  const { error: timeErr } = await supabase.from('timetables').select('*').limit(1);
  if (timeErr) console.error('Timetables error:', timeErr.message);
  else console.log('Timetables table exists.');
}

checkRemaining();
