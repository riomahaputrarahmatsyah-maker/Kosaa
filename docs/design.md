# Design System & UI Specification — Kosaa v1.0.2

Dokumen ini adalah acuan visual dan interaksi aplikasi Kosaa saat ini (Expo/React Native +
NativeWind). Untuk arsitektur dan alur data, lihat [architecture.md](./architecture.md).

## 1. Design Language

- **Premium, futuristik, minimalis, dark-only.** Belum ada light mode aktif.
- **Aturan 60-30-10**:
  - 60% Deep Black untuk kanvas dan latar.
  - 30% Dark Emerald untuk permukaan, kartu, bubble user, dan drawer.
  - 10% putih + mint untuk teks, ikon, garis aktif, dan glow.
- **Glow**: shadowColor mint pada iOS dan elevation pada Android. Glow dipakai hemat:
  elemen aktif, avatar AI, node preview, dan aksi utama.
- **Bentuk**: sudut besar (rounded-2xl/3xl/4xl), pill untuk tab bar dan composer,
  border tipis 1px untuk memisahkan permukaan.
- **Gerak**: transisi halus untuk drawer dan modal; tidak ada haptics saat pindah tab.

## 2. Token Warna

Sumber: tailwind.config.js dan constants/theme.ts.

| Token | Nilai | Pemakaian |
| --- | --- | --- |
| background | #0A0A0A | Layar, kanvas graph |
| surface | #0F3D2E | Kartu jadwal, bubble user, drawer |
| surface-light | #1A1A1A | Bubble AI, kartu sekunder |
| surface-deep | #071F17 | Avatar/otak, kartu gelap |
| primary | #FFFFFF | Teks utama, ikon |
| secondary | #A1A1AA | Caption, placeholder, ikon nonaktif |
| mint / brand-mint | #10B981 | Aksen, glow, status aktif |
| mint-soft | #34D399 | Gradien/aksen halus |
| mint-dim | #065F46 | Latar gelap bernuansa mint |
| subtle | #27272A | Border dan divider |
| danger | #F87171 | Hapus/error |
| warning | #FBBF24 | Peringatan API/agent |
| overlay | rgba(0,0,0,0.65) | Backdrop modal/drawer |

## 3. Tipografi

- Font: **Inter**, dimuat per weight: 400 Regular, 500 Medium, 600 SemiBold, 700 Bold.
- Kelas Tailwind: font-sans, font-inter-medium, font-inter-semibold, font-inter-bold.
- Skala:
  - Judul layar: 20-22px, bold.
  - Judul kartu/section: 15-18px, semibold/bold.
  - Body: 13-14px, regular, line-height 20-24px.
  - Caption/meta: 9-11px, secondary, letter-spacing untuk label uppercase.
- Angka statistik memakai bold agar menonjol.

## 4. Komponen Inti

### FloatingTabBar
- Pill mengambang, absolute, left/right 16, bottom safe-area + 12.
- Background #101010, border subtle, shadow hitam + elevation.
- 4 tab: Graph, Chat, Kalender, Setelan.
- Item aktif: background mint 12%, ikon/label mint, glow, garis bawah 2px.
- Item nonaktif: ikon/label secondary.
- Tab bar **disembunyikan saat keyboard terbuka** (TabsLayout memantau
  useKeyboardInset) agar tidak menabrak composer.

### ApprovalDock
- Muncul hanya saat ada pending AI change.
- Kartu 286px di kanan bawah, di atas tab bar; di tab Chat dinaikkan (bottom 176)
  agar tidak menabrak composer.
- Isi: ikon Sparkles, "Pratinjau AI", badge jumlah perubahan, ringkasan 2 baris,
  tombol Batal dan Setuju.
- Tidak memakai Modal; perubahan sudah terlihat di halaman dengan badge AI.
- Disembunyikan saat drawer vault terbuka.

### GlowIconButton
- Tombol bulat 36-44px, border subtle, background gelap transparan.
- Varian aktif: background/border mint + glow.
- Status tekan ditangani tanpa style fungsi (lihat bagian NativeWind).

### NoticeToast
- Toast atas, background #141414/95, border subtle, ikon sesuai tone.
- Dipakai untuk sukses/error/info singkat; auto-dismiss.

### Kartu dan Bubble
- Kartu jadwal: surface emerald, border putih 10%, radius 16px, checkbox mint.
- Bubble user: surface emerald, rounded-2xl dengan sudut kanan bawah lebih kecil.
- Bubble AI: surface-light, avatar otak kecil di kiri.
- Bubble memiliki timestamp kecil di kanan bawah.

## 5. Layar

### A. Knowledge Graph (Home)
Header:
- Kiri: tombol menu (buka Vault Drawer).
- Tengah: wordmark "Kosaa" + "SECOND BRAIN" mint.
- Kanan: chip jumlah catatan + tombol Plus bulat dengan glow.

Kanvas:
- Latar dot grid halus dan glow mint di belakang otak.
- Otak Kosaa di tengah: lingkaran 92px, border mint, glow kuat, ikon Brain.
- Zoom mengubah ukuran otak; label "Kosaa / SECOND BRAIN" mengikuti posisi tepi.
- Node: lingkaran 60px, ikon sesuai tipe (md/pdf/image/file), label 1 baris.
- Node utama terhubung ke otak; subnode terhubung ke induk; tautan manual berupa garis
  putih transparan.
- Node preview AI: border mint, badge "AI", glow.
- Banner preview di bawah header: "Pratinjau AI · N catatan berubah".
- Drag node dibatasi radius kanvas dan tidak boleh menumpuk; posisi disimpan.
- Kontrol zoom + / − / reset di kanan bawah; saat preview dipindah ke kiri agar tidak
  tertutup ApprovalDock.
- Tap node membuka bottom sheet aksi.

Node action sheet:
- Judul, tipe, jumlah tautan, tanggal update.
- Aksi: Buka catatan, Edit catatan, Tautkan, Hapus (danger).
- Hapus memperingatkan bahwa file fisik tetap tersimpan dan subnode dipromosikan.

Node editor:
- Judul, posisi node (Utama/Subnode), pemilih induk (chip horizontal), isi Markdown.
- Lampiran opsional saat membuat: PDF, gambar, file lain; audio ditolak.
- PDF menampilkan catatan "konversi coming soon"; gambar/file menyimpan lampiran.
- ScrollView agar aman saat keyboard terbuka.

Node viewer:
- Header tipe + induk.
- Kartu lampiran: thumbnail gambar atau ikon, nama file, tombol Buka.
- Isi catatan Markdown; preview dibatasi 6000 karakter dengan tombol "Tampilkan semua".
- Tombol Edit catatan.

### B. Vault Drawer
- Drawer dari kiri, background surface emerald, sudut kanan 30px.
- Header: otak glow, "Vault", jumlah catatan, tombol Plus.
- Search bar gelap dengan ikon kaca pembesar.
- Folder filter: Semua catatan, Markdown, PDF, Gambar, File lain (dengan jumlah).
- File list: ikon tipe, judul, tipe, tombol More untuk aksi.
- Footer: Pengaturan + status "Dark mode AKTIF".
- Backdrop gelap, animasi slide, Android back menutup drawer.
- Drawer memakai useKeyboardInset agar search tidak tertutup keyboard.

### C. Chat AI
Header:
- Avatar otak glow, "Kosaa", subtitle "Sekretaris AI · model" atau "Agent nonaktif".
- Tombol More: bersihkan riwayat, API & Models.

Konten:
- Banner API key bila belum diatur.
- Banner agent nonaktif + tombol menuju Profil.
- Daftar bubble; empty state halo + nama user + 3 saran prompt.
- Typing indicator tiga titik saat menunggu DeepSeek.
- Composer berada di aliran layout (bukan absolute), padding bawah safe-area + tab bar.
- Composer pill: tombol lampiran kiri, TextInput multiline, tombol kirim bulat 44px.
- Tombol kirim: ikon panah; background mint saat ada teks, border mint transparan saat kosong.
- Attachment picker: PDF/gambar/file lain; audio ditolak; agent disabled menyembunyikan composer.
- ApprovalDock tampil di atas composer saat ada pending.

### D. Kalender
Header:
- Judul "Kalender", ringkasan jumlah jadwal dan yang belum selesai.
- Tombol "Hari ini" bila bukan bulan berjalan, tombol Plus.

Calendar widget:
- Kartu gelap dengan border, grid 7 kolom; jumlah baris 4-6 mengikuti bulan.
- Hari dipilih: lingkaran mint glow; hari ini: border mint tipis.
- Titik di bawah tanggal menunjukkan jadwal (hingga 3), warna berbeda untuk selesai.
- Panah kiri/kanan untuk pindah bulan.

Tugas:
- Judul "Tugas" + tanggal panjang.
- Kartu jadwal surface emerald: checkbox, judul, waktu, rentang tanggal, chevron edit.
- Jadwal multi-hari tampil di setiap tanggal dalam rentang.
- Preview AI: border mint, badge AI, banner "Pratinjau AI · N jadwal berubah".
- Empty state "Tanggal ini masih lapang" + tombol tambah.

Editor jadwal:
- Judul, tanggal mulai, tanggal selesai opsional (Satu hari/+1/+7), waktu mulai/selesai,
  preset jam.
- Validasi format dan urutan tanggal.
- Tombol hapus saat edit.

Pengingat harian ada di Settings, bukan di layar kalender.

### E. Settings
Header: judul + tombol gear menuju About.
Profil card:
- Gradien emerald gelap, avatar otak glow, nama user, "Local-first Second Brain",
  badge PRIVATE.
- Statistik: catatan, tautan, jadwal.

Menu:
- AI & Preferensi: Profil & Personality, API & Models, Pengingat, toggle Aktifkan Agent.
- Data & Aplikasi: Riwayat, Zip Brain (Segera hadir), Tentang Kosaa.
- Footer versi "Kosaa v1.0.2" + tagline "Untuk data perbendaharaan yang lebih baik".

Subpages:
- Profil: nama, preset/custom personality, toggle agent, simpan.
- API: API key, show/hide, model, tes koneksi, simpan, catatan SecureStore.
- Pengingat: toggle harian, jam + preset, tes notifikasi 5 detik, jumlah terjadwal.
- Riwayat: daftar pesan, bagikan history.md, bersihkan.
- Zip Brain: coming soon.
- About: logo/otak, versi, pilar offline/privat/AI, teknologi, tautan, kredit
  "by @m.r.rio_".

## 6. State dan Feedback

- Loading boot: layar gelap dengan otak glow + "Menyiapkan vault lokal...".
- Boot error: kartu error + tombol Coba lagi.
- ErrorBoundary: layar "Ada yang tidak beres" + Coba lagi.
- Empty: graph, chat, kalender, riwayat, pencarian drawer.
- Pending AI: banner + badge AI + ApprovalDock.
- Notice toast untuk sukses/gagal; Alert untuk konfirmasi destruktif.
- Tidak ada skeleton; loading memakai spinner mint.

## 7. Keyboard dan Performa

- Input memakai useKeyboardInset; tidak ada KeyboardAvoidingView.
- Composer chat berada di aliran layout; tab bar disembunyikan saat keyboard terbuka.
- Editor catatan/jadwal memakai bottomInset untuk mengangkat sheet.
- Preview lampiran dibatasi 6000 karakter; gambar memakai resize decode.
- Node graph memakai SVG untuk garis, View untuk node; drag dibatasi.
- APK preview arm64-only; hindari menambah library native yang tidak perlu.

## 8. Implementasi NativeWind

- NativeWind memetakan className ke style untuk komponen inti dan SafeAreaView.
- JANGAN memakai style={({ pressed }) => ...} pada komponen NativeWind. cssInterop dapat
  menimpa style fungsi dengan objek kosong; akibatnya ukuran/latar/border hilang.
- Gunakan style array/objek; untuk status tekan gunakan onPressIn/onPressOut + useState.
- LinearGradient tidak diinterop otomatis: gunakan style object, bukan className.
- Animated.View tidak diinterop otomatis: pindahkan style ke prop style.
- Ikon dari lucide-react-native; SVG untuk graph.

## 9. Aksesibilitas

- Tombol penting punya accessibilityRole dan accessibilityLabel.
- Checkbox jadwal memakai accessibilityRole checkbox + state checked.
- Tab bar memakai role tab + state selected.
- Touch target utama minimal 36-44px, hitSlop pada ikon kecil.
- Teks kontras: primary di background gelap, secondary untuk meta.

## 10. Batasan Visual Saat Ini

- Dark-only; tombol/toggle light mode belum aktif (drawer hanya menampilkan status).
- PDF belum menghasilkan teks Markdown; kartu lampiran tetap ada.
- Zip Brain masih halaman coming soon.
- ApprovalDock memakai offset statis; saat keyboard chat terbuka dock bisa tertutup
  keyboard sampai keyboard ditutup.

Terakhir diperbarui untuk Kosaa 1.0.2.
