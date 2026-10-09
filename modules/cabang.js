// Memanggil modul antarmuka eksekusi database utama
const SQL = require("../sql");
// Modul File System (bawaan Node.js)
const FileIO = require("fs");
// Memanggil pustaka eksternal untuk melakukan kompresi berkas gambar ke format modern (.webp)
const ConvertWEBP = require("webp-converter");
// Memanggil pustaka Jimp (JavaScript Image Manipulation Program) untuk pemrosesan grafis secara programmatic
const { Jimp } = require("jimp");

/**
 * Modul Cabang (Data Access Object / Repository)
 * Menangani seluruh operasi CRUD (Create, Read, Update, Delete) khusus untuk entitas Cabang.
 */
const Cabang = 
{
    /**
     * Mendapatkan daftar cabang
     * @param { boolean } withSummaries
     * @returns { Promise<{
     *      id_cabang: number,
     *      nama_cabang: string,
     *      alamat_cabang: string,
     *      banyak_mobil: number?,
     *      banyak_pegawai: number?
     * }>}
    */
   Get: async function(withSummaries = false) {
       // Mengeksekusi query DML (Data Manipulation Language) SELECT dasar
       const result = await SQL.Query(`
        SELECT *
        FROM ${ withSummaries ? "View_Cabang_Ringkasan" : "Cabang"}
        ORDER BY nama_cabang
        `);
        return result.data; // Mengembalikan array of objects
    }, 
    /**
     * Mendapatkan daftar cabang berdasarkan id
     * @param { number } id_cabang
     * @param { boolean } withSummaries
     * @returns { Promise<{
     *      id_cabang: number,
     *      nama_cabang: string,
     *      alamat_cabang: string,
     *      banyak_mobil: number?,
     *      banyak_pegawai: number?
     * }>}
     */
    GetById: async function(id_cabang, withSummaries = false) {
        // Mengeksekusi query DML (Data Manipulation Language) SELECT dasar
        const result = await SQL.Query(`
                SELECT *
                FROM ${ withSummaries ? "View_Cabang_Ringkasan" : "Cabang"}
                WHERE id_cabang = ?
                ORDER BY nama_cabang
            `, id_cabang);
        return result.data?.at(0);
    }, 
    /**
     * Mencari cabang berdasarkan nama atau alamat
     * @param { string } keyword
     * @returns { Promise<{
     *      id_cabang: number,
     *      nama_cabang: string,
     *      alamat_cabang: string,
     *      banyak_mobil: number?,
     *      banyak_pegawai: number?
     * }>}
     */
    GetByKeyword: async function(keyword, withSummaries = false) {
        let query = `
            SELECT *
            FROM ${ withSummaries ? "View_Cabang_Ringkasan" : "Cabang"}
            ORDER BY nama_cabang`;

        let params = [];
        let filters = [];
        
        // Membangun filter tambahan jika diperlukan nanti
        if (filters.length > 0)
            query += " WHERE (" + filters.join(" OR ") + ")";

        // Logika penyusunan pencarian jika pengguna memasukkan keyword
        if (keyword) {
            if (filters.length == 0)
                query += " WHERE ";
            else
                query += " AND ";

            // Menggunakan fungsi LOWER() di SQL untuk menyamakan teks database dan input menjadi huruf kecil
            // Menggunakan operator LIKE untuk mencari kecocokan substring di nama cabang ATAU alamat
            query += `(
                    LOWER(nama_cabang) LIKE LOWER(?) OR 
                    LOWER(alamat_cabang) LIKE LOWER(?)
                )`;
            // Menyisipkan wildcard '%' di awal dan akhir keyword agar pencarian fleksibel
            params.push(
                "%" + keyword + "%", 
                "%" + keyword + "%"
            );
        }
        
        // Mengeksekusi query dengan metode Parameterized Query untuk mencegah SQL Injection
        const results = await SQL.Query(query, params);            
        return results.data || [];
    },

    /**
     * Menambahkan record entitas cabang baru ke dalam tabel (Operasi Create/Insert)
     * @param { string } nama_cabang 
     * @param { string } alamat_cabang 
     * @returns { Promise<number> } Id cabang
     */
    Add: async function(nama_cabang, alamat_cabang) {
        // Mengeksekusi query INSERT dengan mendefinisikan kolom spesifik
        const result = await SQL.Query(`
            INSERT INTO Cabang (nama_cabang, alamat_cabang)
            VALUES (?, ?)`, 
            [nama_cabang, alamat_cabang] // Parameter Binding
        );
        return result.data?.insertId;
    },

    /**
     * Memperbarui record entitas cabang yang sudah ada (Operasi Update)
     * Menggunakan pendekatan Partial Update (Pembaruan Sebagian) yang aman
     * @param { number } id_cabang 
     * @param { string } nama_cabang 
     * @param { string } alamat_cabang 
     * @returns { Promise<boolean> }
     */
    Update: async function(id_cabang, nama_cabang, alamat_cabang) {
        // Evaluasi Null-Safety tingkat database.
        // COALESCE(?, nama_cabang) berarti: Jika parameter '?' bernilai NULL, maka MySQL akan mempertahankan nilai 'nama_cabang' yang lama.
        // Ini mencegah tertimpanya data lama dengan nilai kosong jika admin UI hanya mengupdate salah satu kolom saja.
        const result = await SQL.Query(`
            UPDATE Cabang 
            SET 
                nama_cabang = COALESCE(?, nama_cabang),
                alamat_cabang = COALESCE(?, alamat_cabang)
            WHERE id_cabang = ?`, 
            [nama_cabang, alamat_cabang, id_cabang]
        );
        return result.success;
    },

    /**
     * Menghapus record entitas cabang dari database (Operasi Delete)
     * Penghapusan ini bisa diblokir oleh MySQL (Constraint Violation) 
     * jika masih ada Pegawai atau Mobil yang terikat dengan id_cabang ini.
     * @param { number } id_cabang - Primary Key target penghapusan
     */
    Delete: async function(id_cabang) {
        // Mengeksekusi query penghapusan data berdasarkan atribut Primary Key
        const result = await SQL.Query(`
            DELETE FROM Cabang 
            WHERE id_cabang = ?`, 
            [id_cabang]
        );
        // Jangan lupa hapus thumbnail
        await Cabang.Thumbnails.Delete(id_cabang);
        return result.success;
    },
    Thumbnails: 
    {
        /**
        * Menyimpan thumbnail
        * @param { number } id_cabang 
        * @param { Array<Buffer> } buffer 
        * @returns { Promise<boolean> }
        */
        Save: async function(id_cabang, buffer)
        {
            try
            {
                const path = "./src/thumbnails/branch/" + id_cabang;
                
                // cek tipe file
                const { fileTypeFromBuffer } = await import("file-type");
                const fileType = await fileTypeFromBuffer(buffer);
                
                if (fileType.mime == "image/webp") {
                    // Dari webp, convert ke png terlebih dahulu agar bisa dimanipulasi
                    FileIO.writeFileSync(path, buffer);
                    await ConvertWEBP.dwebp(path, path + ".png", "-o");
                }
                else {
                    // Menulis data biner beralokasi memori (buffer) menjadi file fisik berformat .png sementara
                    FileIO.writeFileSync(path + ".png", buffer);
                }
                
                // Menggunakan modul Jimp untuk membaca file gambar yang baru ditulis tadi
                const image = await Jimp.read(path + ".png");
                // Membuat kanvas latar belakang kosong berukuran rasio aspek 4:3 (960x720 piksel)
                const bg = new Jimp({ width: 960, height: 720 });

                // Logika Algoritma Resizing secara Proporsional:
                // Catatan teknis: di Jimp biasanya pembacaan dimensi itu ngambil dari objek bitmap
                if (image.bitmap.width < image.bitmap.height)
                {
                    // Jika orientasi gambar potret (portrait), sesuaikan lebar ke 960 piksel
                    image.resize({ w: 960});
                }
                else if (image.bitmap.width > image.bitmap.height)
                {
                    // Jika orientasi gambar lanskap (landscape), sesuaikan tinggi ke 960 piksel
                    image.resize({ h: 960});
                }
                else
                {
                    // Jika gambar sudah berbentuk persegi sempurna, langsung paksakan resolusi target 960x960
                    image.resize({ w: 960, h: 960});
                }

                // Menghitung titik koordinat X dan Y supaya gambar pas di tengah background
                const x = (bg.bitmap.width - image.bitmap.width) / 2;
                const y = (bg.bitmap.height - image.bitmap.height) / 2;

                // Menempelkan gambar asli di atas kanvas latar belakang
                bg.composite(image, x, y);

                // Menyimpan modifikasi hasil penggabungan gambar kembali ke file .png
                await bg.write(path + ".png");
                
                // Mengonversi format file .png ke format gambar .webp
                // Format .webp memiliki tingkat kompresi yang sangat tinggi tanpa merusak kualitas secara drastis
                await ConvertWEBP.cwebp(path + ".png", path);

                // Menghapus berkas sampah .png dari harddisk server setelah berkas .webp berhasil diciptakan
                FileIO.unlinkSync(path + ".png", o => o);

                return true; // Sukses
            }
            catch(error)
            {
                console.error(error); // Logging detail teknis jika terjadi kegagalan dalam manipulasi berkas grafis
                return false;
            }
        },

        /**
            * Menghapus thumbnail
            * @param { number } id_cabang 
            * @returns { Promise<boolean> }
            */
        Delete: async function(id_cabang)
        {
            try
            {
                const path = "./src/thumbnails/branch/" + id_cabang;
                
                // Pastikan file profil tersebut memang ada secara fisik di sistem operasi sebelum dihapus
                if (FileIO.existsSync(path))
                    FileIO.unlinkSync(path); // Operasi penghapusan file sistem operasi lokal

                return true;
            }
            catch(error)
            {
                console.error(error);
                return false;
            }
        }
    }
};

// Mengekspor objek agar dapat digunakan oleh router
module.exports = Cabang;