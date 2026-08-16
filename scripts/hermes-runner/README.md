# Hermes Agent Runner Scripts

Skrip otomasi untuk menjalankan siklus **Hermes Agent** secara periodik (cron job) atau on-demand. Skrip ini bertugas:
1. **Generate**: Mengambil katalog produk aktif dari Threads Marketing Engine, menghasilkan draft postingan Threads multi-post dengan hook angle berbasis copywriting psikologis (PAS, Cost Comparison, Hack), lalu menyimpannya ke database dengan status `PENDING_REVIEW`.
2. **Post**: Mengambil antrean draft yang telah disetujui (`APPROVED`) oleh manusia, melakukan simulasi publikasi ke Threads API, dan memperbarui statusnya menjadi `PUBLISHED` beserta link live thread.

Tersedia dalam 2 varian bahasa: **TypeScript (`hermes_mock_cron.ts`)** dan **Python 3 (`hermes_mock_cron.py`)**.

---

## 🚀 Persyaratan Sistem

- **Node.js**: v18.0.0+ (untuk varian TypeScript dengan `tsx`)
- **Python**: v3.8+ (untuk varian Python 3, tanpa perlu install library tambahan / zero dependencies)

---

## 🔑 Konfigurasi Environment Variables

Anda dapat mengatur variabel berikut di environment OS atau file `.env`:

```bash
# URL utama aplikasi web Threads Marketing Engine
export HERMES_BASE_URL="http://localhost:3000"

# API Key Hermes yang terdaftar di menu Pengaturan (/settings)
export HERMES_API_KEY="hermes-secret-key-2026"
```

---

## 💻 Penggunaan CLI

### 1. Varian TypeScript (`hermes_mock_cron.ts`)

```bash
# Jalankan seluruh siklus (Generate + Post)
npx tsx scripts/hermes-runner/hermes_mock_cron.ts --action=all

# Hanya generate draft konten baru dari produk aktif
npx tsx scripts/hermes-runner/hermes_mock_cron.ts --action=generate

# Hanya posting draft yang sudah berstatus APPROVED
npx tsx scripts/hermes-runner/hermes_mock_cron.ts --action=post

# Menentukan Base URL dan API Key khusus
npx tsx scripts/hermes-runner/hermes_mock_cron.ts --base-url=http://localhost:3000 --api-key=hermes_mysecretkey --action=all
```

---

### 2. Varian Python 3 (`hermes_mock_cron.py`)

```bash
# Beri izin eksekusi
chmod +x scripts/hermes-runner/hermes_mock_cron.py

# Jalankan seluruh siklus (Generate + Post)
python3 scripts/hermes-runner/hermes_mock_cron.py --action all

# Hanya generate draft konten baru
python3 scripts/hermes-runner/hermes_mock_cron.py --action generate

# Hanya posting draft yang sudah APPROVED
python3 scripts/hermes-runner/hermes_mock_cron.py --action post

# Menentukan Base URL dan API Key khusus
python3 scripts/hermes-runner/hermes_mock_cron.py --base-url http://localhost:3000 --api-key hermes_mysecretkey --action all
```

---

## ⏰ Konfigurasi Linux Crontab (Automated Scheduling)

Untuk menjalankan agent secara terjadwal otomatis di background server:

1. Buka konfigurasi crontab:
   ```bash
   crontab -e
   ```

2. Tambahkan baris jadwal berikut:

   ```bash
   # Generate draft konten baru setiap 4 jam (pada menit ke-0)
   0 */4 * * * cd /path/to/threads-marketing && HERMES_API_KEY="hermes-secret-key-2026" /usr/bin/python3 scripts/hermes-runner/hermes_mock_cron.py --action generate >> /var/log/hermes-cron.log 2>&1

   # Periksa dan posting draft yang sudah di-approve setiap 15 menit
   */15 * * * * cd /path/to/threads-marketing && HERMES_API_KEY="hermes-secret-key-2026" /usr/bin/python3 scripts/hermes-runner/hermes_mock_cron.py --action post >> /var/log/hermes-cron.log 2>&1
   ```

---

## 📡 API Endpoints yang Digunakan

| Endpoint | Method | Fungsi |
| :--- | :--- | :--- |
| `/api/hermes/products/active` | `GET` | Mengambil katalog produk aktif |
| `/api/hermes/drafts` | `POST` | Menyimpan draft hasil generate AI |
| `/api/hermes/drafts/approved` | `GET` | Mengambil antrean posting siap terbit |
| `/api/hermes/drafts/:id/status` | `PATCH` | Memperbarui status hasil publikasi |

Semua request wajib menyertakan header otentikasi `Authorization: Bearer <HERMES_API_KEY>` atau `x-api-key: <HERMES_API_KEY>`.
