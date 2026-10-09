// Mengecek environment variable dari sistem operasi/server.
// Jika NODE_ENV bernilai "production", berarti aplikasi sedang online dan dirilis ke publik.
// Jika bukan, berarti aplikasi sedang dalam mode "development" (dijalankan di laptop programmer untuk dites).
const isProduction = (process.env.NODE_ENV == "production");

/**
 * Objek Variables bertindak sebagai kamus konfigurasi global (Global Constants Object).
 * Berisi sekumpulan variabel statis yang mengatur identitas dan alamat (URL) aplikasi.
 */
const Variables = 
{
    Production: isProduction, // Flag penanda status server (digunakan di rute untuk menyalakan/mematikan cache)
	Version: "1.0.0", // Versi rilis aplikasi saat ini

	// Konfigurasi Icon Aplikasi (Paths untuk ikon dan logo)
	AppIcon: "/assets/icon_logo.webp",
	AppIconMonochrome: "/assets/icon_logo_monochrome.webp",

	// Konfigurasi Teks/Judul Website (Akan diinject ke dalam tag <title> di HTML oleh Template Engine)
	AppTitle: "DW Car Rental", // Judul untuk halaman pelanggan (Member)
	AppTitleAdmin: "DW Car Rental for Admin", // Judul khusus untuk halaman panel kendali pegawai (Staff)

	AppThumbnail: "", // Path untuk gambar thumbnail default website saat dibagikan ke media sosial (Meta Tags)

	// Base URL untuk memuat aset-aset eksternal yang berat (seperti gambar mobil atau library CSS/JS pihak ketiga).
    // Menggunakan domain terpisah agar beban server utama berkurang.
	AppAssets: "https://assets.agapedimas.com",
	// AppAssets: "http://aga.pe:1202",
	
	// Konfigurasi Routing (Alamat Utama)
	WebHost: "https://mibd.agapedimas.com", // Alamat URL utama tempat aplikasi ini di-hosting
	WebHomepage: "/", // Rute root yang akan dibuka pertama kali saat pengunjung mengakses WebHost

	ThrottleDuration: 1000,
	IsThrottleEnabled: false
}

// Mengekspor objek Variables agar nilainya bisa dibaca oleh file lain (terutama oleh route.js dan template.js)
module.exports = Variables;