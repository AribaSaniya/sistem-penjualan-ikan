# Aturan Main Agen AI — Fish-Link

## 1. Workflow Wajib: Plan → Build → Test → Commit → Push

Setiap pengembangan fitur/ubah harus mengikuti siklus ketat ini:

1. **Plan** — Pahami requirement, cek kode existing, buat rencana
2. **Build** — Implementasi sesuai rencana, ikuti konvensi proyek
3. **Test** — Jalankan `npm run lint` (ESLint) dan `npm run build` (tsc + vite build) di `frontend/`
4. **Commit** — `git add` hanya file relevan, commit dengan pesan jelas
5. **Push** — `git push` ke remote
6. **Verify CI** — Pastikan GitHub Actions lulus

## 2. Konvensi Kode

- Ikuti pola kode existing (React 19, TypeScript, Zustand stores, Supabase client, Axios)
- Jangan tambahkan komentar atau emoji
- Jangan tambah dependency baru tanpa izin
- Baca file sekitar dulu sebelum edit
- Jangan edit file di luar lingkup tugas

## 3. Aturan Git

- WAJIB commit & push setelah selesai fitur/bugfix yang berhasil
- Format commit: `tipe(scope): pesan singkat`
  - Contoh: `feat(orders): add cancel button`, `fix(auth): handle token expiry`
- Stage hanya file relevan — jangan commit node_modules, .env, dll
- Jangan force-push atau --no-verify

## 4. Keamanan

- Jangan pernah commit secret, API key, atau token
- Jangan overwrite file tanpa membaca isinya dulu
- Konfirmasi ke user jika ada langkah destruktif
