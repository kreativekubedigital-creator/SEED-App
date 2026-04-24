
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xjdjsaatcmppqdgzawgi.supabase.co';
const supabaseAnonKey = 'sb_publishable_vYy_iHTwzvma7kVwPVnXGA_ZwMpx_Bw';

const supabase = createClient(supabaseUrl, supabaseAnonKey);


async function checkQuizzes() {
  console.log('Checking quizzes columns...');
  const { data, error } = await supabase.from('quizzes').select('*').limit(1);
  if (error) console.error('Quizzes error:', error.message);
  else console.log('Quizzes columns:', Object.keys(data[0] || {}));
}

checkQuizzes();
