# Riwayat Prompt & Panduan Implementasi — Kosaa v1.0.2

Dokumen ini menggantikan panduan vibe-coding awal. Prompt 1-6 di bawah disimpan sebagai
arsip sejarah; instruksinya sudah tidak dipakai apa adanya karena aplikasi telah berkembang.
Kondisi teknis terkini ada di [architecture.md](./architecture.md), perilaku AI di
[ai-agent.md](./ai-agent.md), dan UI di [design.md](./design.md).

## 1. Status Prompt Awal

| Prompt awal | Status v1.0.2 | Catatan |
| --- | --- | --- |
| 1. Inisialisasi Expo, router, NativeWind, SQLite, Zustand | Selesai | Schema sekarang v2 (parent_id, mime_type, end_date, tipe file) |
| 2. FloatingTabBar 4 tab | Selesai | Tab bar disembunyikan saat keyboard terbuka; tanpa haptics |
| 3. Graph SVG, node otak, tap aksi | Selesai | Ditambah hierarki utama/subnode, anti-tumpuk, batas drag, preview AI |
| 4. Chat UI + DeepSeek + 20 history | Selesai | Ditambah agent toggle, profil/personality, error handling, lampiran |
| 5. Function calling + snapshot + modal approval | Selesai, berevolusi | Modal diganti ApprovalDock + preview highlight di halaman |
| 6. File .md, PDF picker, ekstraksi PDF | Sebagian | Lampiran dan .md berjalan; konversi PDF -> .md masih coming soon |

Prompt 6 tidak boleh dianggap selesai: PDF hanya disimpan sebagai lampiran dan catatan
pendamping berisi pemberitahuan "coming soon". pdfParser.ts ada tetapi belum diimpor runtime.

## 2. Fitur Aktif

### Knowledge Graph
- Node md/pdf/image/file, satu lampiran utama per node.
- Node utama/subnode, satu tingkat; subnode dipromosikan jika induk dihapus.
- Tautan manual, drag dengan anti-tumpuk, zoom otak, batas radius kanvas.
- Side drawer dengan pencarian dan filter folder.
- Aksi node: buka, edit, tautkan, hapus.
- Hapus node tidak menghapus file fisik.
- Attachment viewer dengan batas preview 6000 karakter dan tombol Tampilkan semua.

### Chat AI
- DeepSeek chat dengan function calling 8 tool.
- 20 pesan terakhir, konteks metadata 100 node/80 jadwal.
- read_node membaca .md on-demand; file kosong dibuat jika belum ada.
- Profil/personality dan agent toggle.
- Lampiran PDF/gambar/file lain dari tombol +.
- Perubahan AI menjadi draft, dinavigasi ke halaman terkait, ditandai AI, lalu
  ApprovalDock Setuju/Batal.
- API error 401/402/429/5xx/timeout dipetakan ke pesan Indonesia.

### Kalender
- Grid bulanan dinamis, rentang tanggal, jam mulai/selesai, checkbox.
- AI dapat create/update/delete jadwal, termasuk end_date.
- Preview AI berupa kartu bertanda AI + banner.
- Pengingat harian lokal + tes notifikasi di Settings.

### Settings
- Profil: nama, personality preset/custom, agent toggle.
- API & Models: key SecureStore, model, tes koneksi.
- Pengingat: toggle, jam, tes 5 detik, jumlah notifikasi terjadwal.
- Riwayat: lihat, bagikan history.md, bersihkan.
- Zip Brain: coming soon.
- About: versi 1.0.2, kredit by @m.r.rio_, tagline
  "Untuk data perbendaharaan yang lebih baik".

## 3. Arsitektur Singkat

```text
UI (expo-router tabs + settings stack)
  -> Zustand working copy
     -> SQLite (nodes, edges, schedules) + vault (.md/.pdf/image/file)
AI chat
  -> DeepSeek tools -> AiDraft -> PendingChange
  -> navigasi + highlight -> ApprovalDock
  -> Setuju: tulis file + replaceBrain transaksi
  -> Batal: restore snapshot
```

Detail: [architecture.md](./architecture.md).

## 4. Alur Kerja Pengembangan

Persiapan:
```bash
npm install
npx expo start
```

Typecheck dan validasi:
```bash
npx tsc --noEmit
npx expo-doctor
npx expo export --platform android
```

Build APK preview (arm64):
```bash
npx eas login
npx eas build -p android --profile preview
```

Konfigurasi saat ini:
- app.json version 1.0.2, android.versionCode 3.
- eas.json preview: distribution internal, buildType apk.
- expo-build-properties: buildArchs ["arm64-v8a"].
- APK 1.0.2 sekitar 38 MB.
- Plugin kustom kosaa-devtools sudah dihapus dari project.

## 5. Perubahan Penting per Versi

### 1.0.0
- Rilis awal graph, chat, kalender, settings, approval modal.

### 1.0.1
- Tombol kirim/composer, impor lampiran via ContentResolver, notifikasi, profil/personality,
  hierarki, rentang tanggal, ApprovalDock, APK arm64 ~38 MB.

### 1.0.2
- Keyboard: useKeyboardInset menggantikan KeyboardAvoidingView untuk Android edge-to-edge.
  Tab bar disembunyikan saat keyboard terbuka.
- NativeWind: style fungsi pada komponen ber-interop dibuang; tombol kirim diperbaiki
  dengan style array dan press state manual.
- Graph: anti-tumpuk, slot kosong, batas drag, area otak bersih.
- PDF -> .md diparkir sebagai coming soon; PDF tetap lampiran; pdfParser.ts dormant.
- Perbaikan label versi/tagline/kredit.

## 6. Aturan Kontribusi

- Baca architecture.md sebelum mengubah schema atau alur approval.
- Schema change wajib menaikkan SCHEMA_VERSION dan menyediakan migrasi.
- Jangan menambah dependency native tanpa mempertimbangkan ukuran APK arm64.
- Gunakan useKeyboardInset untuk layar/sheet dengan input.
- Jangan memakai style={({ pressed }) => ...} pada komponen NativeWind.
- File yang dihapus user tidak boleh dihapus dari vault; hanya rollback create yang boleh
  membersihkan file baru.
- AI tidak boleh menulis langsung ke SQLite; semua lewat draft + approval.
- PDF belum boleh diklaim sebagai konversi selesai.

## 7. Batasan Saat Ini

- PDF -> .md: coming soon (pdfParser dormant).
- Zip Brain: coming soon.
- Audio: ditolak.
- Arm64-only APK.
- Tidak ada cloud sync/akun/restore.
- Pengingat harian manual; agent hanya mengelola jadwal.
- Scanned PDF/CID font belum ditangani sampai konversi diaktifkan.

Terakhir diperbarui untuk Kosaa 1.0.2.
