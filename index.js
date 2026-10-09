console.log("Starting server"); // Menampilkan pesan di terminal bahwa server mulai dijalankan

// Bagian untuk import modul internal
// Memanggil file-file buatan sendiri yang mengatur database, variabel, fungsi bantuan, template UI, dan rute URL
const SQL = require("./sql");
const Variables = require("./modules/variables");
const Functions = require("./functions");
const Template = require("./modules/template");
const Route = require("./route");

// Bagian untuk import library external
const Express = require("express"); // Framework utama untuk membuat server web (menangani HTTP request HTTP/GET/POST)
const Server = Express(); // Membuat instance (objek) server Express baru
const Session = require("express-session"); // Library untuk mengatur sesi login (agar user tidak perlu login berulang kali)
const MySQLStore = require("express-mysql-session")(Session); // Library agar data sesi login tersimpan langsung ke dalam tabel MySQL
const BodyParser = require("body-parser"); // Middleware untuk membaca data yang dikirim dari form (HTML) maupun JSON
const FileUpload = require("express-fileupload"); // Middleware khusus untuk menangani proses unggah file (misal: foto avatar)

Configure(); // Memanggil fungsi utama untuk merakit dan menyalakan server

// Fungsi asynchronous untuk mengatur konfigurasi server sebelum siap menerima request
async function Configure()
{
	// 1. Menyalakan Database dan Template UI
    await SQL.Initialize(); // Membangun koneksi MySQL dan menjalankan auto-build tabel (mengeksekusi file .sql)
    await Template.Initialize(); // Membaca potongan file HTML (seperti header/footer) ke dalam memori
    
    // 2. Mengatur Penyimpanan Sesi (Session Store)
    // Menyambungkan sistem sesi Express dengan koneksi MySQL yang sudah dibuat sebelumnya
    const Session_Store = new MySQLStore(SQL.Configuration, SQL.Connection);
    
    // 3. Memasang Middleware Utama (Penjaga di tengah-tengah alur request)
    // Mengizinkan server menerima data form (URL-encoded) dan JSON dengan batas ukuran maksimal 50 Megabyte
    Server.use(BodyParser.urlencoded({ limit: "50mb", extended: true }));
    Server.use(BodyParser.json({ limit: "50mb" }));

	Server.use(FileUpload()); // Mengaktifkan fitur penerimaan file
    Server.set("trust proxy", true); // Pengaturan keamanan jika server berjalan di belakang proxy (seperti Nginx/Cloudflare)
	
    // Mengatur bagaimana sesi login dan "Kue" (Cookie) diamankan dan disimpan di browser pengguna
    Server.use(Session({
        // Kunci rahasia untuk mengenkripsi ID sesi (diambil dari file environment/.env demi keamanan)
        secret: process.env.SESSION_KEY,
        // Mencegah penyimpanan sesi kosong yang belum dimodifikasi (menghemat ruang penyimpanan database)
        saveUninitialized: false,
        cookie: 
        { 
            httpOnly: "auto", // Mencegah akses cookie lewat JavaScript di sisi client (mencegah pencurian sesi/XSS)
            secure:  "auto",  // Memaksa penggunaan HTTPS jika memungkinkan
            // Usia cookie disetel selama 1 tahun (12 bulan * 30 hari * 24 jam * 60 menit * 60 detik * 1000 ms)
            maxAge: 12 * 30 * 24 * 60 * 60 * 1000
        },
        store: Session_Store, // Menentukan tempat menyimpan data sesi (merujuk ke MySQLStore di atas)
        resave: false // Jangan menyimpan ulang sesi ke database jika tidak ada perubahan data
    }));

	
    // 4. Middleware Kustom untuk Optimasi Kecepatan (Caching File Statis)
    Server.use(async (req, res, next) => 
    {
        // Mendefinisikan format file statis (desain) yang ukurannya cukup berat
        const file = 
        {
            icons: /\.(?:ico)$/i,
            fonts: /\.(?:ttf|woff2)$/i
        }
        
        // Mengecek apakah URL yang diminta oleh pengguna adalah file gambar/font/ikon
        for (const [key, value] of Object.entries(file)) 
        {
            // Jika dalam mode "Production" (sudah dirilis) dan tidak ada perintah larangan cache
            if (value.test(req.url) && req.query.cache != "false" && Variables.Production)
            {
                // Suruh browser pengguna menyimpan file ini di memori lokal (cache) selama 7 hari (604800 detik) 
                // Ini akan sangat menghemat bandwidth server dan mempercepat loading website
                res.header("Cache-Control", "public, max-age=604800"); 
            }
            // Jika pengguna secara spesifik meminta data terbaru (misal URL diakhiri dengan ?cache=false)
            else if (req.query.cache == "false")
            {
                // Paksa browser untuk mengunduh ulang file tersebut dari server
                res.header("Cache-Control", "no-cache, no-store, must-revalidate");
                res.header("Pragma", "no-cache");
                res.header("Expires", "0");
            }
        }

        // Menyiapkan kantong kosong (object) untuk menyimpan variabel dinamis 
        // (contoh: untuk disisipi nama akun yang sedang login di file route.js nanti)
        req.variables = {};

        if (Variables.IsThrottleEnabled)
            setTimeout(next, Variables.ThrottleDuration || 0);
        else
            next(); // Setelah semua pengecekan middleware selesai, lanjutkan request ke rute tujuan (ke route.js)
    });
    
	// 5. Menyalakan Pengatur Lalu Lintas dan Membuka Port
    Route(Server); // Menyerahkan objek Server ke fungsi Route agar rute URL (/api/branch, dll) didaftarkan
    Functions.Server_Start(Server); // Mengikat server ke port jaringan tertentu agar website mulai bisa diakses
}