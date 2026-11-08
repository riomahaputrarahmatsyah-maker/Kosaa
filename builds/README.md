# Build Android

Folder ini menyimpan APK rilis Kosaa (arm64-v8a, profil EAS `preview`, keystore sama
sehingga bisa dipasang menimpa versi sebelumnya tanpa menghapus data).

| File | Versi | versionCode | Tanggal | Isi |
| --- | --- | --- | --- | --- |
| `Kosaa-1.0.1-arm64.apk` | 1.0.1 | 2 | 2026-11-07 | Rilis awal yang dilaporkan masih bermasalah (keyboard menutup composer, panah kirim hilang, node bertumpuk) |
| `Kosaa-1.0.2-arm64.apk` | 1.0.2 | 3 | 2026-11-08 | Rilis terbaru: keyboard-aware, panah kirim selalu tampak, posisi node aman, PDF → .md "coming soon", agent benar-benar memanggil tool + ingat konteks |

## Riwayat build 1.0.2

Beberapa iterasi dibangun di bawah nomor versi yang sama sebelum menjadi APK final di atas.
Artefaknya tersimpan di EAS (halaman build memuat tombol *Download*):

| Iterasi | Build EAS | Perubahan |
| --- | --- | --- |
| 1 | [a73611c5](https://expo.dev/accounts/riomahaputrarahmatsyah-maker/projects/kosaa/builds/a73611c5-a01f-40cf-91df-21c165cc67d9) | Composer & sheet naik di atas keyboard, tab bar disembunyikan saat mengetik, tata letak node anti-tumpuk |
| 2 | [bffbfabf](https://expo.dev/accounts/riomahaputrarahmatsyah-maker/projects/kosaa/builds/bffbfabf-5d2e-4370-92da-2c14f619633f) | Tombol kirim/lampiran memakai style array (NativeWind membuang `style` fungsi), panah tidak hilang lagi |
| 3 | [b6b725fc](https://expo.dev/accounts/riomahaputrarahmatsyah-maker/projects/kosaa/builds/b6b725fc-061d-48a1-b0d1-622fdac3f4d7) | Model `deepseek-flash` + `thinking: disabled`, `tool_choice` naik ke `required` saat model hanya membalas teks |
| 4 | [559aab9d](https://expo.dev/accounts/riomahaputrarahmatsyah-maker/projects/kosaa/builds/559aab9d-925f-4077-89eb-ca0f571d5683) | Konteks graph lebih jelas (tipe/mime/duplikat), memori tugas antar-putaran, judul lampiran hash dirapikan |

## Membangun ulang

```bash
npx eas build -p android --profile preview
```

APK muncul di halaman build EAS. Pasang di perangkat dengan mengaktifkan
"Install unknown apps" untuk file manager/browser yang dipakai.
