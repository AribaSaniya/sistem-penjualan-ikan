import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://enqeoosohskvselufajr.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVucWVvb3NvaHNrdnNlbHVmYWpyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTkzMjY0OCwiZXhwIjoyMDkxNTA4NjQ4fQ.0A3JCjXcRAs4fsvwXHT2pAaAZdOxBqG0_NoTJG_8U38';
const supabase = createClient(supabaseUrl, serviceRoleKey);

async function main() {
  console.log('=== REGISTRASI AKUN ADMIN ===\n');

  // Step 1: Create user in Supabase Auth
  console.log('1. Membuat user di Supabase Auth...');
  const { data: userData, error: userError } = await supabase.auth.admin.createUser({
    email: 'pengelolatpi@gmail.com',
    password: 'Admin123!',
    email_confirm: true,
    user_metadata: { name: 'Admin TPI', role: 'admin' }
  });

  let userId = userData?.user?.id;

  if (userError) {
    if (userError.message.includes('already been registered')) {
      console.log('   User sudah terdaftar, mengambil data user...');
      const { data: usersList, error: listError } = await supabase.auth.admin.listUsers();
      if (listError) {
        console.error('   GAGAL mengambil daftar user:', listError.message, '\n');
        return;
      }
      const existingUser = usersList.users.find(u => u.email === 'pengelolatpi@gmail.com');
      if (!existingUser?.id) {
        console.error('   User tidak ditemukan di daftar.\n');
        return;
      }
      userId = existingUser.id;
      console.log('   ID:', userId, '\n');
    } else {
      console.error('   GAGAL:', userError.message, '\n');
      return;
    }
  } else {
    console.log('   BERHASIL! ID:', userId, '\n');
  }

  // Step 1.5: Update password to ensure known password
  console.log('1.5. Memastikan password...');
  const { error: updatePwdError } = await supabase.auth.admin.updateUserById(userId, {
    password: 'Admin123!'
  });
  if (updatePwdError) {
    console.error('   GAGAL update password:', updatePwdError.message, '\n');
  } else {
    console.log('   Password diperbarui.\n');
  }

  // Step 2: Insert / upsert profile
  console.log('2. Insert profile admin...');
  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .upsert({
      id: userId,
      name: 'Admin TPI',
      role: 'admin',
      phone: ''
    })
    .select()
    .single();

  if (profileError) {
    if (profileError.message.includes('relation') && profileError.message.includes('does not exist')) {
      console.error('   TABEL "profiles" BELUM ADA!');
      console.error('\n   >>> Buka Supabase Dashboard → SQL Editor, jalankan SQL berikut:\n');
      console.error(`   CREATE TABLE IF NOT EXISTS profiles (
     id UUID REFERENCES auth.users(id) PRIMARY KEY,
     name TEXT,
     role TEXT DEFAULT 'user',
     phone TEXT,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );

   ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

   CREATE POLICY "Users can read own profile"
     ON profiles FOR SELECT USING (auth.uid() = id);

   CREATE POLICY "Users can insert own profile"
     ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

   CREATE POLICY "Users can update own profile"
     ON profiles FOR UPDATE USING (auth.uid() = id);\n`);
      console.error('   Setelah itu jalankan script ini lagi.\n');
      return;
    }
    console.error('   GAGAL:', profileError.message, '\n');
    return;
  }

  console.log('   BERHASIL!', profileData, '\n');

  // Step 3: Selesai
  console.log('=== ✅ SELESAI ===');
  console.log('Email:    pengelolatpi@gmail.com');
  console.log('Password: Admin123!');
  console.log('\nBuka http://localhost:5173/auth → pilih Pengelola → login.');
}

main().catch(console.error);
