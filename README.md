# Fish-Link (ArusLaut) — Sistem Penjualan Ikan Online

**Fish-Link** adalah platform marketplace digital untuk Tempat Penjualan Ikan (TPI) yang menghubungkan Distributor Utama dengan Distributor lanjutan dan para pedagang. Aplikasi ini mengotomatisasi proses  pemantauan stok, pembelian, manajemen pesanan, analitik penjualan, dan reputasi pedagang secara _real-time_.

---

## Fitur

### Untuk Pembeli (User)

| Fitur               | Keterangan                                                                 |
|---------------------|---------------------------------------------------------------------------|
| Bursa Ikan          | Jelajahi katalog ikan dengan harga, stok, dan gambar                      |
| Cari Ikan           | Filter ikan berdasarkan nama secara _real-time_                           |
| Keranjang / Checkout| Pilih jumlah, hitung total, dan checkout via RPC Supabase                 |
| Riwayat Pesanan     | Lihat pesanan, batalkan pesanan, dan hapus massal                         |
| Beri Rating         | Beri bintang + komentar + foto untuk pedagang                             |
| Grafik Harga Pasar  | Lihat perbandingan harga TPI vs harga pasar dalam _area chart_            |
| WhatsApp Chat       | Floating widget untuk chat admin langsung via WhatsApp                     |
| Realtime            | Data katalog dan pesanan sinkron otomatis tanpa refresh                   |

### Untuk Admin (Pengelola)

| Fitur                    | Keterangan                                                               |
|--------------------------|--------------------------------------------------------------------------|
| Dashboard Ikan           | CRUD stok ikan, edit harga inline, upload gambar ke Supabase Storage     |
| Manajemen Pedagang       | Tambah/edit/hapus pedagang dengan foto dan kategori                      |
| Review Pelanggan         | Lihat semua review per pedagang (rating, komentar, foto bukti)           |
| Rekap Pesanan            | Statistik harian: volume (kg), revenue (Rp), jumlah transaksi            |
| Grafik Penjualan         | Bar chart ikan terpopuler, line chart tren harian                        |
| Analitik Lelang          | Pie/donut distribusi popularitas, stacked bar perbandingan ikan per hari |
| Realtime                 | Sinkronisasi stok dan pesanan secara langsung                            |

### Autentikasi

- Login / Register berbasis peran: **Pembeli** atau **Pengelola**
- Verifikasi email via OTP (6 digit)
- _Forgot password_ → OTP → ganti password
- Profil pengguna (nama, telepon, ganti password)

---

## Tech Stack

| Kategori          | Teknologi                                                                      |
|-------------------|--------------------------------------------------------------------------------|
| **Framework**     | [React](https://react.dev) 19                                                  |
| **Bahasa**        | [TypeScript](https://www.typescriptlang.org)                                   |
| **Build Tool**    | [Vite](https://vitejs.dev) 5                                                   |
| **Routing**       | [React Router DOM](https://reactrouter.com) 7                                  |
| **State Mgmt**    | [Zustand](https://zustand-demo.pmnd.rs) 5                                      |
| **Backend/BaaS**  | [Supabase](https://supabase.com) (Auth, PostgreSQL, Storage, Realtime)         |
| **HTTP Client**   | [Axios](https://axios-http.com)                                                |
| **Charts**        | [Recharts](https://recharts.org) 3                                             |
| **Icons**         | [Lucide React](https://lucide.dev)                                             |
| **Linting**       | ESLint + typescript-eslint + react-hooks + react-refresh                       |

---

## Struktur Direktori

```
frontend/
├── public/                    # Aset statis (favicon, icons SVG)
├── src/
│   ├── assets/                # Gambar (hero, logo)
│   ├── components/
│   │   └── AppLayout.tsx      # Layout utama (sidebar, navigasi, profil)
│   ├── pages/
│   │   ├── PortalAuth.tsx     # Login / Register / Lupa Password
│   │   ├── Home.tsx           # Bursa Ikan (katalog + checkout)
│   │   ├── UserDashboard.tsx  # Riwayat pesanan pembeli
│   │   ├── UserRatings.tsx    # Rating & ulasan pembeli
│   │   ├── MarketChart.tsx    # Grafik perbandingan harga pasar
│   │   ├── AdminDashboard.tsx # CRUD stok ikan (admin)
│   │   ├── AdminSales.tsx     # Manajemen pedagang & review
│   │   ├── AdminOrders.tsx    # Rekap pesanan & statistik
│   │   └── AdminAuction.tsx   # Analitik lelang lanjutan
│   ├── services/
│   │   ├── supabaseClient.ts  # Inisialisasi Supabase client
│   │   └── api.ts             # Axios instance (opsional, backend Express)
│   └── store/
│       ├── useAuthStore.ts    # Zustand store autentikasi
│       └── useOrderStore.ts   # Zustand store badge pesanan
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
├── eslint.config.js
└── .env                       # Environment variables
```

---

## Cara Menjalankan

### Prasyarat

- [Node.js](https://nodejs.org) 18+
- [npm](https://npmjs.com)

### Langkah-langkah

```bash
# 1. Clone repositori
git clone https://github.com/AribaSaniya/sistem-penjualan-ikan.git
cd sistem-penjualan-ikan/frontend

# 2. Install dependencies
npm install

# 3. Buat file .env (isi dengan kredensial Supabase kamu)
cp .env.example .env

# 4. Jalankan dev server
npm run dev
```

Aplikasi akan terbuka di `http://localhost:5173`.

### Build Produksi

```bash
npm run build     # TypeScript check + Vite build
npm run preview   # Preview hasil build
```

---

## Environment Variables

Buat file `.env` di `frontend/`:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

---

## Scripts

| Script    | Perintah                          | Deskripsi                              |
|-----------|-----------------------------------|----------------------------------------|
| `dev`     | `vite --host --open`              | Jalankan dev server                    |
| `build`   | `tsc -b && vite build`            | TypeScript check + build produksi      |
| `lint`    | `eslint .`                        | Jalankan ESLint                        |
| `preview` | `vite preview`                    | Preview hasil build                    |

---

## Akun Demo

| Role      | Email                          | Keterangan                     |
|-----------|--------------------------------|---------------------------------|
| Admin     | `pengelolatpi@gmail.com`       | Akun admin tetap                |
| Pembeli   | (daftar sendiri)               | Register via halaman login      |

---

## Database (Supabase)

Projek ini menggunakan Supabase sebagai backend dengan tabel-tabel utama:

- **profiles** — Profil pengguna (nama, role, telepon)
- **fish** — Data ikan (nama, harga/kg, stok, gambar)
- **orders** — Pesanan (user_id, total, status)
- **order_items** — Item per pesanan (ikan, quantity, harga)
- **merchants** — Data pedagang (nama, kategori, rating)
- **reviews** — Ulasan pembeli (rating, komentar, foto)

Storage bucket: **fish-images** (untuk foto ikan, pedagang, dan bukti review)

Realtime sync: tabel `fish` dan `orders` untuk update langsung.

---

## Lisensi

MIT
