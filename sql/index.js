// File jembatan koneksi ke MySQL

// Memanggil module bawaan Node.js untuk membaca sistem file (seperti membaca file .sql nanti)
const FileIO = require("fs");
// Memanggil library mysql2, ini bertindak sebagai Driver penghubung Node.js ke MySQL (mirip JDBC di Java)
const MySQL = require("mysql2");
// Membuat fungsi helper untuk menunda eksekusi (mirip Thread.sleep() di Java)
const Delay = (msec) => new Promise((resolve) => setTimeout(resolve, msec));

const SQL = 
{
    /** Konfigurasi koneksi database.
     * @type { MySQL.PoolOptions } */
    Configuration: 
    {
        // Maksimal koneksi simultan yang diizinkan
        connectionLimit: 10, 
        // Mengambil kredensial dari file environment (.env) agar password tidak tertulis langsung di kode (Untuk Keamanan)
        host: process.env.SQL_HOST,       
        // Port default MySQL  
        port: 3306,                         
        user: process.env.SQL_USERNAME, 
        password: process.env.SQL_PASSWORD, 
        database: process.env.SQL_DATABASE,
        charset: "utf8mb4",
        timezone: "+07:00", 
        dateStrings: true,
        multipleStatements: true, // Mengizinkan pengiriman banyak query sekaligus yang dipisah dengan titik koma (;)
        waitForConnections: true,
        queueLimit: 0,
        // Fungsi tambahan untuk otomatis mengubah tipe data JSON dari database menjadi Object JavaScript
        typeCast: function(field, next)
        {
            if (field.type == "JSON") 
                return JSON.parse(field.string("utf8"));
            
            return next();
        }
    },

    /** @type { MySQL.Pool } */
    Pool: undefined, // Variabel untuk menyimpan sesi koneksi yang aktif

    /** Fungsi Wrapper (Bungkus) untuk mengeksekusi query SQL.
     * Dibuat menjadi Promise agar bisa menggunakan keyword 'await' saat dipanggil di modul lain.
     * @param { string } query - Perintah SQL (contoh: SELECT * FROM Cabang)
     * @param { Array<string> } values - Parameter dinamis untuk query (mencegah SQL Injection)
     * @returns { Promise<{
     * success: boolean,
     * data: Array<object> | { 
     * affectedRows: number,
     * changedRows: number,
     * fieldCount: number,
     * insertId: any,
     * message: string
     * }
     * }> }
     */
    Query: function(query, values) 
    {
        return new Promise(function(resolve)
        {
            // Menjalankan query ke database MySQL
            SQL.Pool.query(query, values, function(error, results)
            {
                let success = false;
                let data = null;

                // Jika query gagal (contoh: salah sintaks atau tabel tidak ada)
                if (error)
                {
                    console.error(error.sqlMessage, JSON.parse(JSON.stringify(error)));
                    return resolve({ success, data }); // Mengembalikan success = false
                }

                // Jika query berhasil dieksekusi
                success = true;
                const type = results.constructor.name;

                // Jika query berupa SELECT (mengembalikan data baris/RowPacket)
                if (type == "RowPacket" || Array.isArray(results))
                {
                    if (results && results.length)
                        data = results;
                }
                else
                {
                    data = results;
                }

                return resolve({ success, data }); // Kembalikan hasil ke file yang memanggil fungsi ini
            })
        });
    },

    /** Fungsi utama untuk menyalakan koneksi dan melakukan Auto-Build Database.
     * @returns { Promise<void> } */
    Initialize: function(occurence = 1)
    {
        return new Promise(function(resolve)
        {
            // Membuat koneksi berdasarkan konfigurasi di atas
            if (!SQL.Pool) {
                SQL.Pool = MySQL.createPool(SQL.Configuration);
            }

            // Mulai menyambungkan aplikasi ke MySQL Server
            SQL.Pool.getConnection(async function(err, connection)
            {
                if (err) 
                {
                    // Jika database menolak koneksi (biasanya karena server MySQL baru saja dinyalakan/belum siap)
                    if (err.code == "ECONNREFUSED" && occurence < 60)
                    {
                        await Delay(1000); // Tunggu 1 detik
                        return resolve(await SQL.Initialize(occurence + 1)); // Coba koneksi lagi (maksimal 60 kali)
                    }
                    else
                    {
                        // Jika gagal total, matikan server Node.js
                        console.error("Error when connecting to database:\n", err);
                        return process.exit();
                    }
                }

                connection.release();

                // SISTEM AUTO-BUILD DATABASE
                const tableFilePath = "./sql/tables/";
                // Menyusun urutan file .sql yang harus dieksekusi agar relasi Foreign Key tidak bentrok
                const tables = [
                    "/../start.sql", // Eksekusi start.sql pertama kali (mematikan Foreign Key checks)
                    // Membaca isi folder sql/tables, memfilter file .sql, lalu mengurutkannya berdasarkan angka di nama file (1, 2, 3...)
                    ...FileIO
                        .readdirSync(tableFilePath)
                        .filter(o => o.endsWith(".sql"))
                        .sort(
                            (a,b) => 
                                a.substring(0, a.indexOf(".")) - b.substring(0, b.indexOf("."))
                    ),
                    "/../end.sql" // Terakhir, eksekusi end.sql (menyalakan kembali Foreign Key checks)
                ];

                // Looping untuk membaca dan mengeksekusi setiap file .sql satu per satu
                for (const table of tables) {
                    const file = FileIO.readFileSync(tableFilePath + table);

                    // Memotong isi file berdasarkan karakter titik koma (;) untuk memisahkan setiap perintah SQL
                    const queries = file
                        .toString()
                        .split(/(?<!\\);/g)
                        .map((o) => o.replace(/\\;/g, ";").trim()) // Bersihkan spasi kosong
                        .filter((o) => o != ""); // Buang baris yang benar-benar kosong

                    // Eksekusi tiap perintah SQL yang sudah dipotong tadi ke database
                    for (const query of queries) {
                        const result = await SQL.Query(query);
                        // Jika ada query pembuatan tabel yang gagal (error sintaks), hentikan proses auto-build
                        if (result.success == false) 
                            break;
                    }
                }

                resolve(); // Beres, database siap digunakan
            });
        });
    }
}

// Mengekspor objek SQL agar bisa dipakai oleh file lain (seperti route.js dan modules)
module.exports = SQL;