import { supabase } from './src/services/supabaseClient.ts';

async function check() {
  const { data, error } = await supabase.from('profiles').select('*').limit(1);
  console.log('Select profiles:', data, error);
}

check();
