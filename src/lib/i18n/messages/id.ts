import type { Messages } from "./types";

export const id: Partial<Messages> = {
  meta: { title: "Explainer — Video penjelasan", description: "Ubah konsep menjadi Reels, clips pemasaran, dan video presentasi. Pilih gaya, setujui storyboard, lalu ekspor clips." },
  nav: { projects: "Proyek", characters: "Karakter", billing: "Tagihan", pricing: "Harga", signIn: "Masuk", workspace: "Ruang kerja", language: "Bahasa" },
  common: { credits: "credits", perMonth: "/ bln", cancel: "Batal", save: "Simpan", close: "Tutup", create: "Buat", loading: "Memuat…", popular: "Paling populer", subscribe: "Berlangganan" },
  landing: {
    hero: { kicker: "Explainer", title: "Jelaskan ide dengan gamblang melalui Reels, video pemasaran, dan presentasi.", subtitle: "Pilih gaya, setujui storyboard, lalu ekspor clips untuk video pendek, pemasaran produk, dan presentasi.", ctaStart: "Mulai", ctaWorkspace: "Buka ruang kerja", ctaPricing: "Lihat paket", artLabel: "Ilustrasi konsep storyboard dan penyuntingan" },
    steps: {
      step1Title: "Pilih gaya", step1Body: "Pilih gaya penyutradaraan untuk video pendek, pemasaran, presentasi, dan lainnya.",
      step2Title: "Setujui storyboard", step2Body: "AI mengusulkan judul, kalimat pembuka, adegan, dan sulih suara. Sunting hingga Anda puas.",
      step3Title: "Ekspor video", step3Body: "Setelah disetujui, kami membuat gambar diam karakter dan clips untuk Reels, iklan, dan presentasi.",
    },
    pricing: { title: "Berlangganan untuk merender video", subtitle: "Setiap clip menggunakan 3 credits (frame awal, frame akhir, dan rendering). Storyboard gratis hingga Anda menyetujuinya.", clipsApprox: "clips", subscribePlan: "Berlangganan {plan}" },
  },
  dashboard: { title: "Proyek", subscribed: "Paket Anda dapat merender video. Tersisa {credits} credits.", notSubscribed: "Tidak ada langganan aktif. Anda dapat menyusun storyboard, tetapi perlu paket sebelum merender.", noSubscriptionBanner: "Tidak ada langganan aktif.", goBilling: "Buka tagihan" },
  folder: {
    create: "Proyek baru", createTitle: "Proyek baru", createHint: "Beri nama dulu, lalu tambahkan video.", createSubmit: "Buat proyek", nameLabel: "Nama proyek", namePlaceholder: "mis. peluncuran produk kuartal 4",
    emptyTitle: "Belum ada proyek", emptyBody: "Beri nama kampanye ini terlebih dahulu, lalu tambahkan video di dalamnya.",
    noMatch: "Tidak ada proyek yang cocok. Coba filter atau kata kunci lain.",
    searchPlaceholder: "Cari nama atau topik proyek…", searchLabel: "Cari nama atau topik proyek", filterLabel: "Filter status",
  },
  project: {
    steps: { input: "Input", scene: "Adegan", production: "Produksi" },
    status: { draft: "Draf", phase_a: "Menulis storyboard", awaiting_approval: "Peninjauan storyboard", production: "Dalam produksi", ready: "Selesai", failed: "Gagal" },
    filters: { all: "Semua", action: "Perlu tindakan", active: "Sedang berlangsung", ready: "Selesai", failed: "Gagal" },
  },
  characters: { title: "Karakter", create: "Karakter baru", empty: "Belum ada karakter." },
  billing: { title: "Tagihan" },
  styles: { doodle: "Coretan papan tulis", "flat-vector": "Vektor datar", "paper-cutout": "Guntingan kertas", chalkboard: "Papan kapur", watercolor: "Buku cerita cat air", clay: "Animasi tanah liat", pixel: "Seni piksel", "ink-manga": "Manga tinta", realistic: "Realistis sinematik" },
  plans: {
    starter: { name: "Pemula", blurb: "30 credits/bln (sekitar 10 clips / 2 video pendek). Cocok untuk mencoba Reels." },
    pro: { name: "Pro", blurb: "90 credits/bln (sekitar 30 clips). Produksi pemasaran dan presentasi yang konsisten." },
    studio: { name: "Studio", blurb: "200 credits/bln (sekitar 66 clips). Untuk tim kecil yang menerbitkan konten setiap minggu." },
    scale: { name: "Skala", blurb: "400 credits/bln (sekitar 133 clips). Untuk produksi bervolume tinggi." },
  },
} as unknown as Messages;
