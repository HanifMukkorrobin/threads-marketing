# Design Specification: 6-Digit Numeric PIN Authentication & Security Settings

## 1. Overview & Objective
Menambahkan sistem autentikasi sederhana berbasis PIN 6 digit angka untuk mengamankan antarmuka dashboard Threads Marketing Engine. Sistem mencakup:
- Proteksi seluruh rute web dashboard (`/`, `/products`, `/drafts`, `/settings`) dan internal API routes via Next.js Middleware.
- Halaman Login interaktif (`/login`) dengan 6-box PIN digit input, keypad virtual, paste support, dan efek visual Threads dark theme.
- Penyimpanan hash PIN aman di database (`SystemConfig` model) dengan default awal `123456`.
- Sesi login aman menggunakan signed/encrypted `httpOnly` cookie (`threads_admin_session`) dengan durasi 7 hari.
- Fitur ganti PIN di menu Pengaturan (`/settings`) dengan verifikasi PIN lama.
- Tombol Kunci / Keluar (Lock/Logout) di Navbar.
- Isolasi penuh rute Hermes Autonomous Agent (`/api/hermes/*`) yang tetap menggunakan Bearer API Key tanpa terganggu oleh proteksi PIN web.

---

## 2. Architecture & Data Model

### 2.1 Database Configuration (`SystemConfig` Model)
PIN disimpan dalam tabel `SystemConfig` dengan key-value:
- `ADMIN_PIN_HASH`: Nilai hash heksadesimal dari PIN (PBKDF2 atau HMAC-SHA256 dengan salt unik).
- `ADMIN_PIN_SALT`: Random hex salt (32 bytes).
- Default jika belum terkonfigurasi di DB: Default PIN `123456`.

### 2.2 Security Utility (`src/lib/pin-auth.ts`)
Fungsi inti keamanan:
- `hashPin(pin: string, salt: string): string`: Menghasilkan string hash dari PIN 6 digit dengan salt.
- `verifyPin(inputPin: string): Promise<boolean>`: Membaca hash & salt dari `SystemConfig`, membandingkan dengan input pengguna.
- `updatePin(currentPin: string, newPin: string): Promise<{ success: boolean; error?: string }>`: Memvalidasi `currentPin`, memvalidasi format `newPin` (`/^\d{6}$/`), men-generate salt baru, dan memperbarui `SystemConfig`.
- `createSessionToken(): string`: Membuat token sesi bertanda tangan HMAC dengan timestamp kedaluwarsa 7 hari.
- `verifySessionToken(token: string): boolean`: Memvalidasi integritas dan masa aktif token sesi.
- `SESSION_COOKIE_NAME = 'threads_admin_session'`.

---

## 3. Middleware & Route Protection (`src/middleware.ts`)

### 3.1 Public Routes (Bypass Middleware)
- `/login`: Halaman input PIN.
- `/api/auth/pin`: Endpoint verifikasi PIN.
- `/api/auth/status`: Endpoint pemeriksaan status sesi aktif.
- `/api/hermes/*`: Rute Hermes Agent eksternal (dijaga oleh validasi Bearer Token `validateHermesApiKey`).
- `/_next/*`, `/favicon.ico`, static files (`.png`, `.jpg`, `.svg`, `.css`, `.js`).

### 3.2 Protected Routes
- **Web Pages** (`/`, `/products`, `/drafts`, `/settings`, dll):
  Jika cookie `threads_admin_session` tidak ada atau tidak valid $\rightarrow$ redirect HTTP 307 ke `/login`.
  Jika pengguna yang sudah login mengakses `/login` $\rightarrow$ redirect ke `/`.
- **Dashboard Internal APIs** (`/api/products/*`, `/api/drafts/*`, `/api/settings/*`, `/api/overview/*`, `/api/auth/change-pin`, `/api/auth/logout`):
  Jika cookie `threads_admin_session` tidak ada atau tidak valid $\rightarrow$ kembalikan HTTP 401 `{ success: false, error: "Unauthorized: PIN session required" }`.

---

## 4. API Endpoints Specification

### 4.1 `POST /api/auth/pin`
- **Tujuan**: Verifikasi PIN saat login dan mengeluarkan session cookie.
- **Request Body**:
  ```json
  {
    "pin": "123456"
  }
  ```
- **Validasi**:
  - `pin` harus berupa string 6 karakter angka (`/^\d{6}$/`).
- **Response Sukses (200)**:
  - Header: `Set-Cookie: threads_admin_session=<TOKEN>; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`
  - Body:
    ```json
    {
      "success": true,
      "message": "Autentikasi PIN berhasil"
    }
    ```
- **Response Gagal (401 / 400)**:
  ```json
  {
    "success": false,
    "error": "PIN salah atau format tidak valid"
  }
  ```

### 4.2 `POST /api/auth/logout`
- **Tujuan**: Mengakhiri sesi pengguna.
- **Response Sukses (200)**:
  - Header: `Set-Cookie: threads_admin_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`
  - Body:
    ```json
    {
      "success": true,
      "message": "Sesi berhasil diakhiri"
    }
    ```

### 4.3 `GET /api/auth/status`
- **Tujuan**: Memeriksa status login klien.
- **Response (200)**:
  ```json
  {
    "success": true,
    "authenticated": true
  }
  ```

### 4.4 `POST /api/auth/change-pin`
- **Tujuan**: Mengubah PIN akses dari menu Pengaturan.
- **Proteksi**: Wajib memiliki session aktif.
- **Request Body**:
  ```json
  {
    "currentPin": "123456",
    "newPin": "654321",
    "confirmPin": "654321"
  }
  ```
- **Validasi**:
  - `currentPin` diverifikasi ke database.
  - `newPin` harus 6 digit angka (`/^\d{6}$/`).
  - `newPin === confirmPin`.
- **Response Sukses (200)**:
  ```json
  {
    "success": true,
    "message": "PIN berhasil diperbarui"
  }
  ```
- **Response Gagal (400 / 401)**:
  ```json
  {
    "success": false,
    "error": "PIN saat ini salah atau konfirmasi PIN tidak cocok"
  }
  ```

---

## 5. UI/UX Specifications

### 5.1 Login / Lock Screen (`src/app/login/page.tsx`)
- Desain minimalis Threads Dark (`bg-[#101010]`, centered card).
- Header dengan avatar Threads Marketing Engine & badge gembok terkunci.
- **6-Digit Discrete Input Box**:
  - Input field 0-5 dengan auto-focus maju saat diketik.
  - Penanganan tombol Backspace (mundur ke kotak sebelumnya).
  - Penanganan Paste event (`Ctrl+V` atau klik kanan paste 6 digit).
  - Virtual On-Screen Keypad (angka 0-9, clear, delete) untuk perangkat mobile / tablet.
  - Toggle mask/unmask (titik bullet vs angka asli).
- Feedback visual error berupa shake animation dan pesan peringatan jika PIN salah.

### 5.2 Navbar Lock / Logout Button (`src/components/Navbar.tsx`)
- Menambahkan tombol gembok / logout di sisi kanan navbar desktop & mobile.
- Tooltip/label: "Kunci Dashboard" / "Keluar".
- Memanggil `POST /api/auth/logout` lalu me-redirect ke `/login`.

### 5.3 Settings Page - PIN Management Card (`src/app/settings/page.tsx`)
- Kartu baru "Keamanan & PIN Akses" dengan ikon `ShieldCheck` / `Lock`.
- Tiga input terstruktur:
  - PIN Saat Ini (6 digit).
  - PIN Baru (6 digit).
  - Konfirmasi PIN Baru (6 digit).
- Indikator validasi realtime (apakah sudah 6 digit angka, apakah konfirmasi cocok).
- Tombol "Perbarui PIN" dengan loading state dan toast notification.

---

## 6. Testing & Quality Assurance Plan

### 6.1 Test Cases (`tests/auth-pin.test.ts`)
1. **Security & Hashing Unit Tests**:
   - Menghitung hash dengan salt acak dan memverifikasi kecocokan.
   - Verifikasi fallback default PIN `123456`.
   - Pembuatan dan verifikasi token sesi HMAC.
2. **API Route Tests**:
   - `POST /api/auth/pin`:
     - Menolak PIN < 6 digit atau berisi huruf (HTTP 400).
     - Menolak PIN salah (HTTP 401).
     - Menerima PIN benar dan mengirim `Set-Cookie` (HTTP 200).
   - `POST /api/auth/change-pin`:
     - Menolak request tanpa session (HTTP 401).
     - Menolak jika PIN lama salah (HTTP 400).
     - Menolak jika PIN baru dan konfirmasi tidak sama (HTTP 400).
     - Sukses memperbarui PIN baru ke database.
     - Login berikutnya sukses dengan PIN baru dan gagal dengan PIN lama.
   - `POST /api/auth/logout`:
     - Mengirim cookie expiry `Max-Age=0`.
   - `GET /api/auth/status`:
     - Mengembalikan `authenticated: false` tanpa cookie dan `authenticated: true` dengan cookie.
3. **Isolation Verification**:
   - Hermes endpoint `/api/hermes/products/active` tetap sukses dengan Bearer Token tanpa session cookie.

---

## 7. Non-Regression & Verification
- Menjalankan `npm test` untuk memverifikasi 100% tes lama dan baru lulus.
- Menjalankan `npm run build` untuk memverifikasi Next.js compilation bersih tanpa tipe/lint error.
