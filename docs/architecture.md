# Arsitektur Aplikasi Kosaa — v1.0.2

Dokumen ini menggambarkan kondisi aplikasi saat ini, bukan rencana awal. Versi aplikasi
adalah **1.0.2** (versionCode 3), dengan APK preview Android **arm64-v8a** sekitar 38 MB.
Dokumen pendamping: [ai-agent.md](./ai-agent.md), [design.md](./design.md),
[prompts.md](./prompts.md), dan [README.md](../README.md).

## 1. Prinsip Produk

- **Local-first**: catatan, lampiran, jadwal, dan riwayat disimpan di perangkat.
- **File nyata**: isi catatan adalah file Markdown di sandbox aplikasi, bukan blob database.
- **AI dengan persetujuan**: AI hanya menyiapkan draft perubahan; user melihat preview di
  halaman terkait lalu memilih Setuju atau Batal.
- **Hemat token**: konteks AI dibatasi ID, judul, tipe, induk, dan jadwal; isi file dibaca
  on-demand lewat tool read_node.
- **Satu sumber kebenaran**: Zustand adalah working copy; SQLite dan vault adalah
  persistence. Approval menulis file dengan backup, lalu database dalam satu transaksi.

## 2. Stack

| Lapisan | Teknologi |
| --- | --- |
| Framework | Expo SDK 58, React Native 0.88.1, React 19.3.0 |
| Routing | expo-router 58 (file-based, typed routes) |
| Styling | NativeWind 4.2.7 + Tailwind CSS 3.4 |
| State | Zustand 5 |
| Database | expo-sqlite 58 (WAL, foreign keys) |
| File | expo-file-system 58 (API baru + legacy ContentResolver untuk picker) |
| AI | DeepSeek Chat Completions via fetch, model default deepseek-chat |
| Graph | react-native-svg + PanResponder |
| Ikon/font | lucide-react-native, Inter 400/500/600/700 |
| Notifikasi | expo-notifications (daily reminder + test) |
| Rahasia | expo-secure-store |
| Build | EAS Build profile preview, expo-build-properties arm64-v8a |

NativeWind membutuhkan react-native-reanimated/worklets; react-native-screens dan
gesture-handler dipakai oleh navigasi. Paket yang sudah dihapus: expo-haptics dan jszip.
pako masih terpasang untuk pdfParser yang sedang diparkir.

## 3. Peta Modul

```text
app/
  _layout.tsx                  Root Stack, font, ErrorBoundary, NoticeToast
  +not-found.tsx
  (tabs)/
    _layout.tsx               Tabs + FloatingTabBar + ApprovalDock
    index.tsx                 Knowledge Graph + Vault Drawer
    chat.tsx                  Chat AI + lampiran + preview
    calendar.tsx              Kalender + rentang tanggal
    settings.tsx              Profil, agent toggle, menu
  settings/
    about.tsx  api.tsx  profile.tsx  reminder.tsx  history.tsx  zip.tsx
components/
  graph/                      GraphCanvas, GraphNode, GraphEdges, NodeSheets
  chat/                       ChatBubble, TypingIndicator
  calendar/                   CalendarGrid, ScheduleCard, ScheduleEditorModal
  vault/                      VaultDrawer
  settings/                   SettingsScaffold, SettingsRow
  ui/                         ApprovalDock, FloatingTabBar, GlowIconButton,
                              MarkdownText, NoticeToast, EmptyState
  system/                     ErrorBoundary
hooks/
  useKeyboardInset.ts         Pelacak keyboard untuk edge-to-edge Android
services/
  ai/                         deepseek.ts, agent.ts, tools.ts
  db/                         sqlite.ts, graph_queries.ts, calendar_queries.ts, sync.ts
  file/                       fileManager.ts, pdfParser.ts (dorman)
  settings/                   secureStore.ts, profile.ts
  notifications.ts
store/
  useAppStore.ts              Working copy, snapshot, approval, profile
utils/
  date.ts                     Rentang tanggal, format, validasi
  graphLayout.ts              Penempatan node, anti-tumpuk, batas radius
  id.ts
types/
  models.ts                   GraphNode, GraphEdge, Schedule, PendingChange, dll.
data/prompts/
  ai-system-prompt.ts
assets/                       Ikon, splash, favicon
```

## 4. Skema Database (SQLite v2)

Database: kosaa.db, WAL, foreign_keys ON. Versi skema disimpan di PRAGMA user_version.

### nodes
- id TEXT PRIMARY KEY
- title TEXT
- type TEXT CHECK IN ('md', 'pdf', 'image', 'file')
- file_path TEXT
- x REAL, y REAL
- parent_id TEXT NULL (relasi hierarki, tanpa FK)
- mime_type TEXT
- created_at INTEGER, updated_at INTEGER
- Index: idx_nodes_parent

### edges
- id TEXT PRIMARY KEY
- source_id TEXT, target_id TEXT
- created_at INTEGER
- FOREIGN KEY ... ON DELETE CASCADE, UNIQUE(source_id, target_id)
- Index: idx_edges_source, idx_edges_target

### schedules
- id TEXT PRIMARY KEY
- title TEXT
- date TEXT (YYYY-MM-DD)
- end_date TEXT (kosong = satu hari)
- start_time TEXT, end_time TEXT (HH:mm, boleh kosong)
- is_completed INTEGER (0/1)
- created_at INTEGER
- Index: idx_schedules_date (date, end_date)

### Migrasi
- Versi 0: membuat ketiga tabel beserta index.
- Versi 1 -> 2: rebuild tabel nodes untuk menambah parent_id/mime_type dan tipe file,
  lalu ALTER schedules ADD COLUMN end_date. Foreign keys dimatikan di luar transaksi,
  seluruh perubahan dibungkus satu transaksi, dan foreign_keys dihidupkan kembali.
- Kolom filePath di dokumen lama dipetakan menjadi file_path.

## 5. State, Working Copy, dan Approval

Manual (UI):
- createNote/createNoteWithAttachment/updateNote/deleteNote/linkNodes/moveNode langsung
  menulis file dan/atau SQLite.
- deleteNote menghapus baris database dan tautan, mempromosikan subnode menjadi node utama,
  tetapi TIDAK menghapus file fisik. Lampiran tetap ada di perangkat.
- moveNode memperbarui posisi di store lalu SQLite.

AI:
- Agent membuat AiDraft dari snapshot: nodes, edges, schedules, summaries,
  changedScreens, changedNodeIds, changedScheduleIds.
- stageAiChange menyimpan PendingChange berisi snapshot lengkap, ringkasan, layar yang
  berubah, dan ID yang berubah. Draft langsung menjadi working copy agar terlihat di UI.
- Chat menavigasi ke tab Graph atau Kalender yang berubah.
- Highlight "AI" muncul pada node/jadwal yang berubah; banner preview tampil di halaman.
- ApprovalDock (bukan modal) berada di kanan bawah, di atas tab bar. Di chat posisinya
  dinaikkan agar tidak menabrak composer. Dock disembunyikan saat drawer terbuka.
- Setuju: tulis file .md yang berubah (dengan backup untuk rollback), lalu replaceBrain
  dalam satu transaksi SQLite (nodes + edges + schedules). Files dari node yang dihapus
  tidak dihapus.
- Batal: kembalikan snapshot ke Zustand dan kosongkan focusDate.
- Jika penulisan gagal: file dikembalikan dari backup, database dikembalikan ke snapshot,
  pending dibersihkan, dan pengguna mendapat notice error.

## 6. Vault, Lampiran, dan Riwayat

- Vault: document/vault.
- Isi catatan: vault/<node-id>.md.
- Lampiran: satu lampiran utama per node, disalin ke vault/<node-id>.<ext>.
  Tipe yang didukung: md, pdf, image, file. Audio ditolak.
- DocumentPicker memakai copyToCacheDirectory=false. URI content:// disalin melalui
  legacy copyAsync (ContentResolver), dengan fallback File.copy dan base64 bytes.
- PDF: file biner tetap tersimpan dan bisa dibuka. Konversi PDF -> .md masih coming soon.
  Catatan pendamping berisi pemberitahuan status, bukan teks hasil ekstraksi.
  services/file/pdfParser.ts ada untuk pengembangan berikutnya dan belum diimpor runtime.
- Membuka lampiran: File.canPreview lalu File.preview, fallback share sheet.
- Preview catatan lampiran dibatasi 6000 karakter; ada tombol Tampilkan semua.
  Gambar memakai resizeMethod/resizeMultiplier agar hemat memori.
- history.md: riwayat percakapan format Markdown, maksimal 500 pesan disimpan;
  AI hanya menerima 20 pesan terakhir.
- SecureStore: API key DeepSeek, model, profile (nama/personality/agentEnabled),
  pengaturan reminder.

## 7. Pipeline AI (ringkas)

1. Chat memeriksa agentEnabled, API key, dan pending.
2. Pesan user disimpan ke Zustand + history.md.
3. runKosaaAgent mengirim system prompt, profil, instruksi read_node/approval, konteks
   (100 node, 80 jadwal), dan 20 pesan terakhir.
4. Maksimal 3 putaran model. Tool call dieksekusi di aplikasi; error tool dikembalikan
   sebagai hasil tool, bukan crash.
5. Draft dengan perubahan menuju stageAiChange; tanpa perubahan hanya balasan chat.
6. Detail tool, konteks, dan alur ada di [ai-agent.md](./ai-agent.md).

## 8. Keyboard dan Layout (v1.0.2)

Android edge-to-edge tidak selalu mengecilkan window saat keyboard muncul. Karena itu
KeyboardAvoidingView tidak dipakai. Semua layar dengan input memakai
hooks/useKeyboardInset.ts:

- Mendengar keyboardDidShow/DidHide (iOS: keyboardWill*).
- Mengukur layout lewat onLayout; jika window sudah mengecil sendiri, bottomInset = 0
  agar konten tidak naik dua kali.
- Menambahkan tinggi navigation bar (maksimal 48) agar baris terakhir composer tidak
  setengah tertutup.
- Dipakai di Chat, TabsLayout, VaultDrawer, SettingsScaffold, NodeEditorSheet, dan
  ScheduleEditorModal.
- Tab bar mengambang disembunyikan saat keyboard terbuka agar tidak menabrak composer.

Catatan: ApprovalDock memakai offset statis; saat keyboard terbuka di chat, dock bisa
tertutup keyboard sampai keyboard ditutup.

## 9. NativeWind: Jebakan style sebagai Fungsi

Jangan mengirim style={({ pressed }) => [...]} ke komponen yang dibungkus NativeWind
(View, Pressable, Text, TextInput, ScrollView, SafeAreaView). cssInterop membaca style
lewat getOpaqueStyles lalu assignToTarget; fungsi style dapat ditimpa menjadi objek kosong
sehingga seluruh ukuran, latar, dan border hilang. Efek nyata: tombol kirim kehilangan
latar mint dan ikon panah menjadi gelap di atas gelap.

Aturan saat ini:
- Gunakan style array/objek biasa.
- Untuk status tekan, gunakan onPressIn/onPressOut + useState (contoh GlowIconButton).
- Jangan mencampur className dengan style fungsi pada komponen NativeWind.

## 10. Graph Layout

utils/graphLayout.ts:
- NODE_MIN_DISTANCE = 108 (jarak minimum pusat node).
- BRAIN_CLEARANCE = 110 (area otak Kosaa).
- GRAPH_SAFE_RADIUS = 148 (masih terlihat di layar tanpa pan).
- searchAround mencari slot kosong di cincin konsentris.
- resolveNodePosition memindahkan drop yang menumpuk/keluar kanvas ke slot terdekat.
- positionForNewNode memakai parent untuk subnode atau cincin kosong untuk node utama.
- GraphCanvas membatasi drag pada radius kanvas; brain ikut zoom; garis subnode menuju
  induknya, node utama menuju brain; tautan manual memakai garis putih.

## 11. Build dan Rilis

- expo-router entry, EAS project sudah terhubung.
- eas.json profile preview: distribution internal, Android buildType apk.
- expo-build-properties: buildArchs hanya arm64-v8a. APK 1.0.2 sekitar 38 MB dan hanya
  untuk perangkat arm64.
- Versi saat ini: app.json 1.0.2, versionCode 3, package.json 1.0.2.
- Perintah:
```bash
npx tsc --noEmit
npx expo-doctor
npx expo export --platform android
npx eas build -p android --profile preview
```
- EAS login diperlukan. APK lama 1.0.1 sudah tidak dipakai.

## 12. Batasan dan Roadmap

- PDF -> .md: coming soon; PDF tetap lampiran yang bisa dibuka. pdfParser.ts belum aktif.
- Zip Brain: coming soon; tidak ada ekspor/restore ZIP saat ini.
- Audio: belum didukung dan ditolak oleh picker.
- APK preview hanya arm64-v8a.
- Tidak ada sinkronisasi cloud, akun, atau enkripsi vault tingkat aplikasi.
- Agent mengelola catatan/tautan/hierarki/jadwal; pengingat harian diatur manual di
  Settings, bukan lewat tool AI.
- Scanned PDF/CID font belum menjadi target ekstraksi teks saat konversi diaktifkan nanti.

## 13. Verifikasi

```bash
npx tsc --noEmit
npx expo-doctor
npx expo export --platform android
```

Terakhir diperbarui untuk Kosaa 1.0.2.
