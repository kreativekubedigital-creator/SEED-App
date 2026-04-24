
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xjdjsaatcmppqdgzawgi.supabase.co';
const supabaseAnonKey = 'sb_publishable_vYy_iHTwzvma7kVwPVnXGA_ZwMpx_Bw';

const supabase = createClient(supabaseUrl, supabaseAnonKey);


async function verifySQL() {
  console.log('Verifying classes table (level column)...');
  const { data: classData, error: classError } = await supabase
    .from('classes')
    .insert({ name: 'Verification Class', school_id: 'verify-school', level: 'primary' })
    .select();
  
  if (classError) console.error('Class verification failed:', classError.message);
  else {
    console.log('Class verification successful! level column confirmed.');
    await supabase.from('classes').delete().eq('id', classData[0].id);
  }

  console.log('\nVerifying attendance_records table...');
  const { data: attData, error: attError } = await supabase
    .from('attendance_records')
    .insert({ 
      school_id: 'verify-school', 
      class_id: 'verify-class', 
      date: new Date().toISOString().split('T')[0],
      records: { 'test-student': 'present' }
    })
    .select();

  if (attError) console.error('Attendance verification failed:', attError.message);
  else {
    console.log('Attendance verification successful! Table exists.');
    await supabase.from('attendance_records').delete().eq('id', attData[0].id);
  }
}

verifySQL();
