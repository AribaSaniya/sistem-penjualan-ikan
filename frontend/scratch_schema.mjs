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
  const res = await fetch(`${url}/rest/v1/?apikey=${key}`);
  const data = await res.json();
  const ordersProps = data.definitions.orders.properties;
  console.log('Orders Columns:', Object.keys(ordersProps));
  const profilesProps = data.definitions.profiles.properties;
  console.log('Profiles Columns:', Object.keys(profilesProps));
}

check();
