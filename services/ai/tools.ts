export const KOSAA_TOOLS = [
  {
    type: "function",
    function: {
      name: "create_node",
      description:
        "Buat catatan baru di Knowledge Graph. Gunakan parent_id jika catatan ini adalah subnode dari node utama.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Judul catatan, singkat dan jelas." },
          content: { type: "string", description: "Isi catatan dalam format markdown." },
          parent_id: {
            type: "string",
            description: "ID node utama untuk subnode. Kosongkan jika node ini berdiri sendiri.",
          },
        },
        required: ["title", "content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_node",
      description:
        "Edit judul, isi, atau induk catatan yang sudah ada. parent_id kosong berarti jadikan node utama.",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string", description: "ID node yang akan diedit." },
          title: { type: "string", description: "Judul baru (opsional)." },
          content: { type: "string", description: "Isi markdown baru (opsional)." },
          parent_id: {
            type: "string",
            description: "ID node utama baru, atau string kosong untuk menjadikannya utama (opsional).",
          },
        },
        required: ["id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_node",
      description: "Hapus catatan dari graph. File fisik tetap tersimpan di perangkat.",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string", description: "ID node yang akan dihapus." },
        },
        required: ["id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_link",
      description: "Hubungkan dua catatan di Knowledge Graph dengan garis tautan.",
      parameters: {
        type: "object",
        properties: {
          source_id: { type: "string", description: "ID node asal." },
          target_id: { type: "string", description: "ID node tujuan." },
        },
        required: ["source_id", "target_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "read_node",
      description:
        "Baca isi file .md dari sebuah catatan. Gunakan sebelum menjawab pertanyaan tentang isi catatan. Jika .md belum ada, tool ini akan membuatkannya.",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string", description: "ID node yang akan dibaca." },
        },
        required: ["id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_schedule",
      description: "Tambahkan jadwal atau tugas baru ke kalender, termasuk rentang tanggal.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Nama kegiatan." },
          date: { type: "string", description: "Tanggal mulai format YYYY-MM-DD." },
          end_date: {
            type: "string",
            description: "Tanggal selesai format YYYY-MM-DD (opsional, untuk rentang).",
          },
          start_time: { type: "string", description: "Jam mulai format HH:mm, boleh kosong." },
          end_time: { type: "string", description: "Jam selesai format HH:mm, boleh kosong." },
        },
        required: ["title", "date", "start_time"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_schedule",
      description: "Edit jadwal yang sudah ada, termasuk tanggal selesai.",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string", description: "ID jadwal." },
          title: { type: "string", description: "Nama kegiatan baru (opsional)." },
          date: { type: "string", description: "Tanggal mulai baru YYYY-MM-DD (opsional)." },
          end_date: { type: "string", description: "Tanggal selesai baru YYYY-MM-DD (opsional)." },
          start_time: { type: "string", description: "Jam mulai baru HH:mm (opsional)." },
          end_time: { type: "string", description: "Jam selesai baru HH:mm (opsional)." },
          is_completed: { type: "boolean", description: "Tandai selesai atau belum (opsional)." },
        },
        required: ["id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_schedule",
      description: "Hapus jadwal dari kalender. Butuh id jadwal dari konteks.",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string", description: "ID jadwal yang akan dihapus." },
        },
        required: ["id"],
      },
    },
  },
];
