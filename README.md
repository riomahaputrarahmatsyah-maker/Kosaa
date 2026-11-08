# Kosaa — Local-First Second Brain

> ⚠️ **Masih tahap pengembangan (beta)** — fitur, UI, dan format data masih bisa berubah; jangan jadikan satu-satunya tempat menyimpan data penting.

Kosaa adalah aplikasi mobile yang menggabungkan catatan lokal (file markdown + SQLite),
Knowledge Graph yang bisa diedit manual maupun oleh AI, chatbot DeepSeek, dan kalender.
Semua data tinggal di perangkat.

Dokumentasi teknis: [arsitektur](docs/architecture.md) · [AI agent](docs/ai-agent.md) ·
[design system](docs/design.md) · [riwayat prompt](docs/prompts.md).

## Download APK

| Versi | APK (arm64-v8a) | Ukuran |
| --- | --- | --- |
| **1.0.2** (terbaru) | [Kosaa-1.0.2-arm64.apk](https://raw.githubusercontent.com/riomahaputrarahmatsyah-maker/Kosaa/master/builds/Kosaa-1.0.2-arm64.apk) | 38.176.239 byte (36,4 MB) |
| 1.0.1 (arsip) | [Kosaa-1.0.1-arm64.apk](https://raw.githubusercontent.com/riomahaputrarahmatsyah-maker/Kosaa/master/builds/Kosaa-1.0.1-arm64.apk) | 38.232.347 byte (36,5 MB) |

Link unduh langsung (raw): klik nama file di atas, atau buka folder
[`builds/`](builds/README.md) untuk riwayat build dan link EAS tiap iterasi 1.0.2.
Pasang dengan mengaktifkan "Install unknown apps" untuk browser/file manager yang dipakai.

## Fitur

- **Knowledge Graph** — node utama/subnode, tautan bebas, drag untuk menata posisi, zoom
  (termasuk brain di tengah), preview AI, dan vault drawer.
- **Lampiran** — catatan bisa membawa PDF, gambar, atau file dokumen lain. PDF tetap
  tersimpan sebagai lampiran, sedangkan konversi PDF → .md masih *coming soon* (catatan
  pendamping .md menyebutkannya). Audio belum didukung.
- **AI Secretary** — chat DeepSeek dengan function calling untuk membuat/mengedit/menghapus
  catatan, tautan, hierarki, dan jadwal; agent bisa membaca isi .md lewat tool read_node.
- **Approval & Revert** — perubahan AI ditahan di Zustand dan ditampilkan sebagai preview
  pada tab Graph/Kalender dengan highlight. Tombol Batal/Setuju mengambang di kanan bawah
  di atas tab bar; Batal mengembalikan snapshot.
- **Calendar** — grid bulanan bertitik, tugas per hari, rentang tanggal, checkbox, dan
  pengingat harian lokal.
- **Profil** — nama dan personality bisa diubah, agent bisa dinonaktifkan dari Settings.
- **Vault lokal** — file .md, PDF/gambar/lampiran, dan history.md di sandbox aplikasi.
- **Zip Brain** — coming soon.
- **Keyboard-aware UI** — kolom chat, editor catatan, dan editor jadwal naik mengikuti
  keyboard (Android edge-to-edge), dan node graph tidak lagi bisa ditumpuk atau terlempar
  ke luar kanvas.
- **Dark premium UI** — palet deep black/emerald/mint, glow, Inter, floating tab bar.

## Menjalankan

```bash
npm install
npx expo start
```

Scan QR dengan Expo Go, atau buat APK:

```bash
npx eas login
npx eas init
npx eas build -p android --profile preview
```

Profil preview di eas.json menghasilkan APK internal.

### API key

Buka **Pengaturan → API & Models**, tempel key DeepSeek, lalu tes koneksi. Key disimpan
di SecureStore. Alternatif build-time: isi EXPO_PUBLIC_DEEPSEEK_API_KEY di environment.

## Struktur

```
app/                 expo-router: tabs + settings stack
components/          graph, chat, calendar, vault, settings, ui
services/ai/         deepseek.ts, tools.ts, agent.ts
services/db/         sqlite.ts, graph_queries.ts, calendar_queries.ts, sync.ts
services/file/       fileManager.ts, pdfParser.ts (dorman sampai PDF→.md rilis)
services/settings/   secureStore.ts, profile.ts
hooks/               useKeyboardInset.ts (pelacak keyboard)
store/               useAppStore.ts (working copy + snapshot approval)
data/prompts/        ai-system-prompt.ts
```

## Data lokal

- document/vault/*.md — isi catatan dan catatan pendamping lampiran
- document/vault/*.pdf, *.jpg, *.bin — lampiran asli
- document/history.md — riwayat chat (AI membaca 20 pesan terakhir)
- SQLite/kosaa.db — nodes, edges, schedules (schema v2: parent_id, mime_type, end_date)

## Verifikasi

```bash
npx tsc --noEmit
npx expo-doctor
npx expo export --platform android
```

## Changelog

### 1.0.2
- **Keyboard** — kolom chat, editor catatan, editor jadwal, pengaturan, dan drawer vault
  memakai `useKeyboardInset` (langsung dari event keyboard + deteksi window resize).
  `KeyboardAvoidingView` dilepas karena tidak bekerja di Android edge-to-edge. Tab bar
  mengambang disembunyikan selama keyboard terbuka supaya tidak menabrak composer.
- **Panah kirim & ikon composer** — akar masalahnya ternyata NativeWind: `style={({ pressed }) => ...}`
  dibuang seluruhnya oleh cssInterop (`assignToTarget` menimpa style fungsi dengan `{}`), sehingga
  tombol kirim kehilangan latar mint + kotak 44px dan panah berwarna gelap jadi tak terlihat.
  Semua tombol penting kini memakai style array biasa (status tekan dilacak `onPressIn/onPressOut`).
- **Node graph** — node baru dicari di slot kosong, node yang di-drop di atas node lain
  dipindah ke slot terdekat (`resolveNodePosition`), drag dibatasi radius kanvas, dan area
  otak Kosaa selalu bersih.
- **PDF → .md** — konversi ditandai *coming soon*: PDF tetap tersimpan sebagai lampiran,
  catatan pendamping .md menjelaskan statusnya, dan `pdfParser.ts` untuk sementara tidak dipakai.
- **Agent benar-benar memanggil tool** — ID model `deepseek-chat` sudah dipensiunkan DeepSeek
  (2026-07-24) sehingga definisi `tools` diabaikan dan agent hanya mengaku sudah menghapus/
  menjadwalkan. Default kini `deepseek-flash` (+ migrasi otomatis ID lama), `thinking` dimatikan,
  dan bila model menjawab teks padahal user minta perubahan, agent di-nudge lalu dipaksa
  `tool_choice: "required"`. Balasan yang mengaku berubah tanpa draft diganti dengan jujur.
- **Outline kolom chat** — pill dibuat lebih pendek (tombol 40px, padding tipis) dan placeholder
  dipendekkan supaya tidak pecah dua baris.
- **Agent tidak gampang lupa** — konteks kini menampilkan tipe/mime, menandai judul duplikat,
  dan mengurutkan 120 catatan terbaru; kata kerja colloquial (jadiin, hapusin, ingetin, …)
  ikut dikenali; saat agent bertanya lalu user menjawab singkat ("dua-duanya"), tugas semula
  dikirim ulang sebagai system message sehingga putaran lanjutan tetap memanggil tool.
  Judul lampiran berupa hash diganti "Gambar/PDF/Lampiran <tanggal>".

Versi 1.0.2 · APK preview dibangun untuk arm64-v8a.

Dibangun dengan Expo SDK 58, React Native 0.88, Expo Router, NativeWind 4, Zustand,
expo-sqlite, expo-file-system, react-native-svg, expo-notifications, dan DeepSeek API.