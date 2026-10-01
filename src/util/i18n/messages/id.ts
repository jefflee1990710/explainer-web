import type { Messages } from "@/util/i18n/messages/types";

export const id: Partial<Messages> = {
  meta: { title: "Scro — Video penjelasan", description: "Ubah konsep menjadi Reels, clips pemasaran, dan video presentasi. Pilih gaya, setujui storyboard, lalu ekspor clips." },
  nav: { projects: "Video", characters: "Karakter", tasks: "Tugas", mcp: "MCP", affiliate: "Affiliate", billing: "Tagihan", examples: "Contoh", pricing: "Harga", signIn: "Masuk", workspace: "Ruang kerja", language: "Bahasa" },
  common: { credits: "credits", pending: "tertunda", perMonth: "/ bln", cancel: "Batal", save: "Simpan", close: "Tutup", create: "Buat", loading: "Memuat…", popular: "Paling populer", subscribe: "Berlangganan" },
  landing: {
    hero: { kicker: "Scro", title: "Jelaskan ide dengan gamblang melalui Reels, video pemasaran, dan presentasi.", subtitle: "Pilih gaya, setujui storyboard, lalu ekspor clips untuk video pendek, pemasaran produk, dan presentasi.", ctaStart: "Mulai", ctaWorkspace: "Buka ruang kerja", ctaPricing: "Lihat paket", artLabel: "Ilustrasi konsep storyboard dan penyuntingan" },
    steps: {
      step1Title: "Pilih gaya", step1Body: "Pilih gaya penyutradaraan untuk video pendek, pemasaran, presentasi, dan lainnya.",
      step2Title: "Setujui storyboard", step2Body: "AI mengusulkan judul, kalimat pembuka, adegan, dan sulih suara. Sunting hingga Anda puas.",
      step3Title: "Ekspor video", step3Body: "Setelah disetujui, kami membuat gambar diam karakter dan clips untuk Reels, iklan, dan presentasi.",
    },
    pricing: { title: "Berlangganan untuk merender video", subtitle: "Pilih paket sesuai cara Anda memakai Scro.", clipsApprox: "clips", subscribePlan: "Berlangganan {plan}" },
    enterprise: { title: "Butuh lebih dari Scale?", body: "Credits, faktur, dan kontrak khusus untuk tim yang melebihi paket yang tercantum.", cta: "Hubungi kami" },
    showcase: { title: "Lihat hasil", subtitle: "Empat kombinasi di platform yang sama: topik, gaya, dan rasio.", reel: "Reel", deck: "Presentasi", marketing: "Pemasaran", scro: "Cara kerja Scro", product: "Demo produk", story: "Cerita pendek" },
    cast: { eyebrow: "Karakter", title: "Buat karakternya sekali. Pakai wajah yang sama di setiap video.", body: "Tentukan karakter dan gaya dulu. Lalu buat Reel, klip pemasaran, dan video penjelasan yang konsisten — untuk produk, fitur layanan, atau pengetahuan.", product: "Produk", service: "Layanan", knowledge: "Pengetahuan", cta: "Buat karakter" },
    persona: { eyebrow: "Personal brand", title: "Tidak perlu tampil di kamera. Versi virtualmu yang memandu Reel.", body: "Unggah fotomu. Scro menggambar ulang kamu sebagai karakter virtual dengan gaya yang sama, lalu memakainya untuk video personal brand.", cta: "Pakai fotomu" },
    director: { eyebrow: "Biaya generasi", title: "Yang mahal adalah percobaan ulang.", body: "Video AI membengkak karena setiap meleset berarti render lagi. Sutradara AI Scro mengubah idemu menjadi storyboard yang kamu setujui dulu. Videonya tepat dalam beberapa take, dan biaya generasi tetap rendah.", idea: "Idemu", takes: "Sedikit take", cost: "Biaya lebih rendah", cta: "Tulis storyboard" },
  },
  examples: {
    title: "Lihat hasilnya",
    heroTitle: "Lihat cara kerja Scro",
    subtitle: "Setiap jenis punya pekerjaan sendiri: rasio, gaya, dan di mana videonya diputar.",
    cta: "Lihat hasilnya",
    scroReel: { title: "Cara kerja Scro, sebagai Reel", body: "Doodle vertikal 9:16 untuk media sosial. Satu adegan: pilih gaya, sematkan storyboard, frame menjadi video pendek. Saat ide harus sampai dalam beberapa detik di ponsel." },
    scroDeck: { title: "Cara kerja Scro, untuk presentasi", body: "Cerita yang sama dalam flat vector 16:9 untuk slide. Tiga langkah dalam satu bidikan: gaya, storyboard, ekspor. Saat video hidup di dalam presentasi." },
    productMarketing: { title: "Demo produk untuk unggahan persegi", body: "Klip claymation 1:1. Satu produk, satu momen: botol keluar dari kotak dan menyala. Untuk iklan feed yang menempatkan produk sebagai tokoh utama." },
    productReel: { title: "Cerita pixel di panggung lebar", body: "Cerita pixel 16:9. Robot kecil mengantar selembar catatan yang menyala. Bingkai lebar memberi panggung pada adegan. Untuk hero situs atau short horizontal." },
  },
  dashboard: { title: "Video", subscribed: "Paket Anda dapat merender video. Tersisa {credits} credits.", notSubscribed: "Tidak ada langganan aktif. Anda dapat menyusun storyboard, tetapi perlu paket sebelum merender.", noSubscriptionBanner: "Tidak ada langganan aktif.", goBilling: "Buka tagihan" },
  folder: {
    create: "Proyek baru", createTitle: "Proyek baru", createHint: "Beri nama dulu, lalu tambahkan video.", createSubmit: "Buat proyek", nameLabel: "Nama proyek", namePlaceholder: "mis. peluncuran produk kuartal 4",
    emptyTitle: "Belum ada proyek", emptyBody: "Beri nama kampanye ini terlebih dahulu, lalu tambahkan video di dalamnya.",
    noMatch: "Tidak ada proyek dengan nama itu.",
    searchPlaceholder: "Cari berdasarkan nama proyek…", searchLabel: "Cari berdasarkan nama proyek", filterLabel: "Filter status",
  },
  project: {
    steps: { input: "Input", scene: "Adegan", production: "Produksi", export: "Video" },
    status: { draft: "Draf", phase_a: "Menulis storyboard", awaiting_approval: "Peninjauan storyboard", production: "Dalam produksi", ready: "Selesai", failed: "Gagal" },
    filters: { all: "Semua", action: "Perlu tindakan", active: "Sedang berlangsung", ready: "Selesai", failed: "Gagal" },
  },
  characters: { title: "Karakter", create: "Karakter baru", empty: "Belum ada karakter." },
  billing: { title: "Tagihan" },
  styles: { doodle: "Coretan papan tulis", "flat-vector": "Vektor datar", "paper-cutout": "Guntingan kertas", chalkboard: "Papan kapur", watercolor: "Buku cerita cat air", clay: "Animasi tanah liat", pixel: "Seni piksel", "ink-manga": "Manga tinta", realistic: "Realistis sinematik" },
  plans: {
    starter: { name: "Pemula", blurb: "Cocok untuk mencoba Scro." },
    pro: { name: "Pro", blurb: "Untuk orang yang menjalankan bisnis sendiri." },
    studio: { name: "Studio", blurb: "Untuk orang yang memakai Scro untuk mendapat penghasilan." },
    scale: { name: "Skala", blurb: "Untuk agensi dan tim yang membuat video bagi banyak klien." },
  },
} as unknown as Messages;
