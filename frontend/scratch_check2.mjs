import fs from 'fs';
import path from 'path';

// Read .env to get url and key
const envPath = path.resolve('c:/Projek TPI/frontend/.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const urlMatch = envContent.match(/VITE_SUPABASE_URL=(.*)/);
const keyMatch = envContent.match(/VITE_SUPABASE_ANON_KEY=(.*)/);

const url = urlMatch ? urlMatch[1].trim() : '';
const key = keyMatch ? keyMatch[1].trim() : '';

async function check() {
  const res = await fetch(`${url}/rest/v1/profiles?id=eq.123`, {
    method: 'PATCH',
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ phone: '123' })
  });
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}

check();
