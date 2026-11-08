# Spesifikasi AI Agent Kosaa — v1.0.2

Dokumen ini menjelaskan perilaku agent DeepSeek yang berjalan di aplikasi Kosaa saat ini.
Untuk arsitektur data dan approval, lihat [architecture.md](./architecture.md).

## 1. Prinsip

- **Sekretaris, bukan chatbot umum**: jawaban maksimal dua kalimat, padat, dan hanya
  berdasarkan konteks Kosaa.
- **Tidak berhalusinasi**: isi catatan baru diketahui lewat tool read_node; jika tidak ada
  di konteks, agent harus mengatakan tidak tahu.
- **Tool-first**: setiap permintaan perubahan data wajib memanggil tool, bukan sekadar
  membalas teks.
- **Hemat token**: konteks hanya memuat metadata (ID, judul, tipe, induk, jadwal), bukan
  seluruh isi file.
- **Persetujuan manusia**: tool tidak langsung menulis database; perubahan menjadi draft
  dan menunggu Setuju/Batal.

## 2. Konfigurasi API

| Item | Nilai |
| --- | --- |
| Base URL | https://api.deepseek.com (dapat dioverride EXPO_PUBLIC_DEEPSEEK_BASE_URL) |
| Endpoint | POST /chat/completions, non-stream |
| Model default | deepseek-flash (bisa diubah di API & Models) |
| Model alternatif | deepseek-v4-pro |
| Temperature | 0.3 |
| Max token | 1400 pada putaran pertama, 700 pada putaran lanjutan |
| Timeout | 45 detik |
| Thinking | dimatikan (`thinking: { type: "disabled" }`) |
| Tool choice | auto, naik ke required saat permintaan perubahan dijawab teks |
| Auth | Bearer API key dari SecureStore atau EXPO_PUBLIC_DEEPSEEK_API_KEY |

Penting: `deepseek-chat` dan `deepseek-reasoner` sudah dipensiunkan DeepSeek
(2026-07-24). Dengan ID lama, request tetap dibalas teks tetapi definisi `tools`
diabaikan - agent jadi mengaku sudah menghapus atau menjadwalkan padahal tidak ada draft.
`getModel()` otomatis memigrasikan ID lama ke `deepseek-flash` / `deepseek-v4-pro`.

## 3. System Prompt Inti

Prompt tetap di data/prompts/ai-system-prompt.ts:

```text
Kamu adalah Kosaa, sekretaris AI dan penjaga Second Brain pengguna. Tugasmu HANYA membantu mengelola data di aplikasi.
ATURAN KETAT:
1. Jawablah dengan sangat singkat, padat, dan minimalis (maksimal 2 kalimat).
2. Jangan pernah berhalusinasi tentang isi file. Jika tidak ada di context, bilang tidak tahu.
3. JIKA pengguna meminta perubahan data (tambah/edit/hapus node atau jadwal), KAMU WAJIB memanggil fungsi (tool) yang sesuai. Jangan hanya membalas dengan teks.
4. Kamu memiliki akses ke maksimal 20 pesan terakhir di history.md.
5. Jangan pernah mengaku sudah membuat, mengubah, atau menghapus data sebelum tool yang sesuai benar-benar dipanggil dan mengembalikan ok: true.
```

Tiga system message tambahan dikirim saat runtime:

1. Profil: "Profil pengguna: <nama>. Personality yang diinginkan: <personality>. Sapa
   pengguna dengan namanya bila relevan."
2. Aturan tool: gunakan read_node untuk membaca isi .md; read_node membuat file kosong
   jika belum ada; setelah tool perubahan, data belum tersimpan dan harus menunggu
   persetujuan.
3. Konteks: waktu lokal, daftar catatan, daftar jadwal, dan ID yang valid.

## 4. Konteks yang Dikirim

Konteks dibatasi agar token tetap hemat:

- Waktu sekarang: format tanggal/jam lokal perangkat.
- PETUNJUK: id dipakai apa adanya, dilarang meminta id ke user, "gambar" = tipe image,
  judul duplikat diselesaikan lewat tipe/mime/induk (bukan dengan bertanya).
- CATATAN: maksimal 120 node, diurutkan dari updatedAt terbaru, format:
  id=<id> | judul="<judul>" | tipe=<type> (<label>) | mime=<mime> | induk=<judul|utama> |
  judul duplikat. Sisa node yang tidak ditampilkan disebut jumlahnya.
- JADWAL: maksimal 80 jadwal, format:
  id | judul | tanggal mulai [s/d tanggal selesai] | jam mulai–selesai | selesai.
- History: maksimal 20 pesan terakhir dari history.md.
- Tugas tertunda: bila balasan assistant terakhir berupa pertanyaan dan user menjawab
  singkat ("dua-duanya", "semua"), system message berisi tugas semula dikirim ulang agar
  agent tidak lupa dan langsung memanggil tool.
- Tidak ada isi file pada konteks awal; isi hanya lewat read_node.

ID node dan jadwal harus dipakai apa adanya. Jika agent mengarang ID, tool mengembalikan
error dan agent dapat mencoba lagi.

## 5. Daftar Tool (8)

### create_node
Membuat catatan Markdown baru.
- title (wajib): judul.
- content (wajib): isi Markdown.
- parent_id (opsional): ID node utama jika ini subnode; kosong = node utama.
- Efek: node baru, posisi otomatis, changedNodeIds, layar graph.

### update_node
Mengedit judul/isi/induk catatan.
- id (wajib).
- title, content (opsional).
- parent_id (opsional): ID induk baru, atau string kosong untuk menjadikan node utama.
- Ditolak jika node punya subnode lalu dijadikan subnode, atau induk bukan node utama.
- Efek: changedNodeIds, layar graph.

### delete_node
Menghapus catatan dari graph.
- id (wajib).
- Subnode langsung dipromosikan menjadi node utama.
- Tautan ke node dihapus.
- File fisik TIDAK dihapus; ini disengaja.
- Efek: changedNodeIds, layar graph.

### create_link
Menautkan dua catatan dengan garis tautan.
- source_id, target_id (wajib, tidak boleh sama).
- Duplikat/self-link ditolak.
- Efek: edge baru, layar graph.

### read_node
Membaca isi .md secara on-demand.
- id (wajib).
- Jika file .md belum ada, file kosong dibuat otomatis.
- Hasil: title, type, parent, attachment, content (maksimal 6000 karakter), truncated.
- Tool ini tidak mengubah data dan tidak memicu approval.

### create_schedule
Menambah jadwal/tugas.
- title, date (YYYY-MM-DD), dan start_time wajib ada; start_time boleh string kosong.
- end_date (YYYY-MM-DD, opsional untuk rentang).
- end_time (HH:mm, opsional).
- Validasi tanggal nyata, urutan tanggal, dan format jam.
- Efek: schedule baru, changedScheduleIds, layar calendar.

### update_schedule
Mengedit jadwal.
- id wajib; title/date/end_date/start_time/end_time/is_completed opsional.
- Jika tanggal mulai digeser melewati end_date lama, end_date dikosongkan.
- Efek: changedScheduleIds, layar calendar.

### delete_schedule
Menghapus jadwal.
- id wajib.
- Efek: changedScheduleIds, layar calendar.

## 6. Loop Eksekusi

```text
user message
  -> system prompt + profil + aturan tool + konteks + 20 history
  -> DeepSeek (tools, tool_choice auto, thinking disabled)
  -> jika tool_calls:
       eksekusi tool di aplikasi terhadap AiDraft
       kirim tool result (ok/error + data) kembali ke model
       ulangi maksimal 4 putaran
  -> jika tidak ada tool_calls tetapi user meminta perubahan:
       putaran 1: kirim system nudge "panggil tool sekarang"
       putaran 2: tool_choice="required" (wajib memanggil tool)
  -> balasan final
  -> jika ada perubahan: stageAiChange + navigasi + ApprovalDock
  -> jika tidak ada draft tetapi balasan mengaku berubah: balasan diganti jujur
```

Catatan:
- Tool call dijalankan aplikasi, bukan model.
- Deteksi niat ubah data memakai kata kerja (formal dan colloquial: bikin, jadiin, hapusin,
  ingetin, ...) pada pesan user terakhir, dan dilewati bila pesan berupa pertanyaan.
- Niat itu juga diwarisi ketika agent baru saja bertanya dan user menjawab singkat
  ("dua-duanya"), sehingga jaring pengaman tetap aktif pada putaran lanjutan.
- Judul lampiran berupa hash (mis. hasil DocumentPicker) diganti "Gambar/PDF/Lampiran
  <tanggal>" agar tidak tertukar dengan id.
- `tool_choice="required"` adalah jaring pengaman: model tidak bisa lagi menjawab
  teks lalu mengaku sudah menyimpan. Jika deployment menolak `required`, request
  diulang dengan `auto`.
- Error tool (JSON invalid, ID tidak ada, validasi gagal) dikembalikan sebagai
  { ok: false, error } dan tidak membuat chat crash.
- Jika model tidak menghasilkan teks final, dipakai fallback:
  "Aku sudah menyiapkan N perubahan. Periksa lalu setujui." atau
  "Aku sudah membaca catatannya."
- Draft hanya menandai layar graph/calendar; balasan chat tetap tersimpan.

## 7. Persetujuan dan Revert

- Draft disimpan sebagai PendingChange: snapshot, summary, changedScreens,
  changedNodeIds, changedScheduleIds.
- UI menampilkan perubahan di halaman terkait dengan badge AI.
- ApprovalDock di kanan bawah (di atas tab bar) berisi Batal/Setuju.
- Setuju: tulis file .md yang berubah, lalu replaceBrain (nodes + edges + schedules)
  dalam satu transaksi SQLite. Node yang dihapus tidak menghapus file fisik.
- Batal: snapshot dikembalikan; focusDate dibersihkan.
- Gagal simpan: file baru dihapus, file lama dipulihkan dari backup, database dikembalikan.
- Belum ada modal approval; alur ini menggantikan ModalApproval pada spesifikasi awal.

## 8. Profil, Personality, dan Agent Toggle

- Profil disimpan di SecureStore: name, personality, agentEnabled.
- Preset personality: Ringkas & profesional, Ramah & santai, Tegas & to the point, Analitis;
  teks bebas juga diizinkan.
- Nama dan personality dikirim ke DeepSeek sebagai system message saat chat.
- agentEnabled=false:
  - Chat tidak mengirim request dan composer diganti kartu "Agent dinonaktifkan".
  - runKosaaAgent juga menolak jika dipanggil.
- Toggle tersedia di Settings utama dan halaman Profil & Personality.

## 9. Batasan Saat Ini

- PDF -> Markdown belum aktif. PDF tetap lampiran yang bisa dibuka; catatan pendamping
  berisi "coming soon", bukan teks hasil ekstraksi. read_node pada node PDF hanya membaca
  catatan pendamping tersebut.
- Audio belum didukung.
- Agent belum bisa mengubah pengingat harian; pengingat diatur manual di Settings.
- Zip Brain belum tersedia.
- Isi .md yang sangat panjang dipotong 6000 karakter di read_node dan preview lampiran.

## 10. Privasi dan Keamanan

- API key disimpan di SecureStore dan tidak pernah ditulis ke database/vault.
- Data hanya dikirim ke DeepSeek saat pengguna mengirim chat: system prompt, profil,
  konteks metadata, 20 pesan terakhir, dan hasil read_node bila dipanggil.
- Tidak ada upload file ke cloud; lampiran tetap di sandbox aplikasi.
- File ZIP/ekspor belum ada sehingga tidak ada jalur ekspor API key.
- Pesan error DeepSeek dipetakan ke bahasa Indonesia (401, 402, 429, 5xx, timeout).

## 11. Error yang Sering Muncul

| Kondisi | Perilaku |
| --- | --- |
| API key kosong | Alert "API key belum diatur", arahkan ke Settings |
| 401 | "API key DeepSeek tidak valid..." |
| 402 | "Saldo DeepSeek tidak mencukupi..." |
| 429 | "Terlalu banyak permintaan..." |
| Timeout 45 detik | "DeepSeek tidak merespons tepat waktu..." |
| Tool gagal | Hasil tool error; model dapat mencoba lagi |
| Model mengaku berubah tanpa draft | Balasan diganti "Aku belum mengubah apa pun..." |
| Model lama (deepseek-chat) tersimpan | Dimigrasikan otomatis ke deepseek-flash |
| ID model tidak dikenal | "Model DeepSeek tidak dikenali..." + arahkan ke Settings |
| Agent nonaktif | Alert + instruksi mengaktifkan |
| PDF belum dikonversi | Pesan coming soon, PDF tetap tersimpan |

Terakhir diperbarui untuk Kosaa 1.0.2.
