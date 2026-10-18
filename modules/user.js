// Memanggil modul koneksi database murni (menggunakan wrapper Promise yang dibuat di /sql/index.js)
const SQL = require("../sql");
// Memanggil modul autentikasi internal untuk memanfaatkan fungsi enkripsi/hashing kata sandi
const Authentication = require("./authentication");
// Memanggil modul bawaan Node.js untuk memanipulasi file fisik di storage server (File System)
const FileIO = require("fs");
// Memanggil pustaka eksternal untuk melakukan kompresi berkas gambar ke format modern (.webp)
const ConvertWEBP = require("webp-converter");
// Memanggil pustaka Jimp (JavaScript Image Manipulation Program) untuk pemrosesan grafis secara programmatic
const { Jimp } = require("jimp");

// Memberikan izin sistem operasional kepada pustaka webp-converter agar dapat berjalan di latar belakang server
ConvertWEBP.grant_permission();

/**
 * Objek Global Accounts untuk mengelola entitas user (Pegawai dan Member)
 * Bertindak sebagai Data Access Object (DAO) atau Repositori dalam arsitektur Backend
 */
const User = {
    /**
     * Mendapatkan daftar user berdasarkan filter
     * @param {{
     * username?: string,
     * role?: string,
     * id_cabang?: number
     * }} filter 
     * @returns {Promise<Array<{
     * id_user: number,
     * role: string,
     * nama_user: string,
     * nomor_ktp: string,
     * nomor_telepon: string,
     * username: string,
     * id_cabang: number,
     * alamat_user: string,
     * nama_cabang?: string
     * }>> }
     */
    Get: async function(filter) {
        let select = `SELECT User.*`;
        let from = `FROM User`;
        let params = [];
        let conditions = [];

        if (filter?.role == "pegawai") {
            select += `, Cabang.nama_cabang`;
            from += ` LEFT JOIN Cabang ON User.id_cabang = Cabang.id_cabang`;
        }

        let query = `${select} ${from}`;

        if (filter?.username) {
            conditions.push(`User.username = ?`);
            params.push(filter.username);
        }
        if (filter?.role) {
            conditions.push(`User.role = ?`);
            params.push(filter.role);
        }
        if (filter?.id_cabang) {
            conditions.push(`User.id_cabang = ?`);
            params.push(filter.id_cabang);
        }

        if (conditions.length > 0) {
            query += ` WHERE ` + conditions.join(` AND `);
        }

        const result = await SQL.Query(query, params);
        return result.data || [];
    },

    /**
     * Mendapatkan daftar user berdasarkan id
     * @param {{
     * id_user?: number,
     * username?: string,
     * role?: string,
     * id_cabang?: number
     * }} filter 
     * @returns {Promise<{
     * id_user: number,
     * role: string,
     * nama_user: string,
     * nomor_ktp: string,
     * nomor_telepon: string,
     * username: string,
     * id_cabang: number,
     * alamat_user: string,
     * nama_cabang?: string
     * }> }
     */
    GetById: async function(id_user) {
        const result = await SQL.Query(`
            SELECT *
            FROM User
            WHERE id_user = ?
        `, [id_user]);
        return result.data?.at(0);
    },

    /**
     * Mendapatkan daftar user berdasarkan filter dan keyword (Nama user atau username)
     * @param { string } keyword 
     * @param {{
     * role?: enum {"pegawai", "member"},
     * id_cabang?: number
     * }} filter 
     * @returns {Promise<Array<{
     * id_user: number,
     * role: string,
     * nama_user: string,
     * nomor_ktp: string,
     * nomor_telepon: string,
     * username: string,
     * id_cabang: number,
     * alamat_user: string,
     * nama_cabang?: string
     * }>> }
     */
    GetByKeyword: async function(keyword, filter) {
        let select = `SELECT User.*`;
        let from = `FROM User`;
        let params = [];
        let conditions = [];

        if (filter?.role === "pegawai") {
            select += `, Cabang.nama_cabang`;
            from += ` LEFT JOIN Cabang ON User.id_cabang = Cabang.id_cabang`;
        }

        let query = `${select} ${from}`;

        if (filter?.role) {
            conditions.push(`User.role = ?`);
            params.push(filter.role);
        }
        if (filter?.id_cabang) {
            conditions.push(`User.id_cabang = ?`);
            params.push(filter.id_cabang);
        }

        if (conditions.length > 0) {
            query += ` WHERE ` + conditions.join(` AND `);
        }

        if (keyword) {
            query += (conditions.length === 0 ? ` WHERE ` : ` AND `) + `(LOWER(User.username) LIKE LOWER(?) OR LOWER(User.nama_user) LIKE LOWER(?))`;
            params.push(`%` + keyword + "%", `%` + keyword + "%");
        }

        query += " ORDER BY User.nama_user";

        const result = await SQL.Query(query, params);
        return result.data || [];
    },

    /**
     * Menambah user baru
     * @param { "member" | "pegawai" } role 
     * @param { string } nama_user 
     * @param { string } nomor_ktp 
     * @param { string } nomor_telepon 
     * @param { string } username 
     * @param { string } password 
     * @param { number } id_cabang 
     * @param { string } alamat_user 
     * @returns { Promise<number> } Id yang baru dimasukkan
     */
    Add: async function(role, nama_user, nomor_ktp, nomor_telepon, username, password, id_cabang, alamat_user) {
        const hashedPassword = await Authentication.GetPasswordHash(password);

        if (!hashedPassword) 
            return null;

        const query = `
            INSERT INTO User (role, nama_user, nomor_ktp, nomor_telepon, username, password, id_cabang, alamat_user)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const result = await SQL.Query(query, [
            role,
            nama_user,
            nomor_ktp,
            nomor_telepon,
            username,
            hashedPassword,
            id_cabang || null,
            alamat_user || null
        ]);
        return result.data.insertId;
    },

    /**
     * Memperbarui informasi user
     * @param { number } id_user 
     * @param { string } nama_user 
     * @param { string } nomor_ktp 
     * @param { string } nomor_telepon 
     * @param { string } username 
     * @param { string } password 
     * @param { number } id_cabang 
     * @param { string } alamat_user 
     * @returns { Promise<boolean> }
     */
    Update: async function(id_user, nama_user, nomor_ktp, nomor_telepon, username, password, id_cabang, alamat_user) {
        let query = `UPDATE User SET nama_user=?, nomor_ktp=?, nomor_telepon=?, id_cabang=?, alamat_user=?, username=?`;
        let params = [nama_user, nomor_ktp, nomor_telepon, id_cabang, alamat_user, username];
        
        if (password) {
            const hashedPassword = await Authentication.GetPasswordHash(password);
            query += `, password=?`;
            params.push(hashedPassword);
        }

        query += ` WHERE id_user=?`;
        params.push(id_user);

        const result = await SQL.Query(query, params);
        return result.success;
    },
    
    /**
     * Memindahkan semua pegawai dari cabang lama ke cabang baru
     * @param { number } id_cabang_lama
     * @param { number } id_cabang_baru 
     * @returns { Promise<boolean> }
     */
    MoveToBranch: async function(id_cabang_lama, id_cabang_baru) {
        const result = await SQL.Query(`
            UPDATE User 
            SET id_cabang = ?
            WHERE id_cabang = ? AND role = 'pegawai'
        `, [id_cabang_baru, id_cabang_lama]);
        return result.success;
    },

    /**
     * Menghapus user
     * @param { number } id_user 
     * @returns {Promise<boolean>}
     */
    Delete: async function(id_user) {
        await User.Avatars.Delete(id_user);

        const result = await SQL.Query(`DELETE FROM User WHERE id_user=?`, [id_user]);
        return result.success;
    },

    /**
     * Mendapatkan role user berdasarkan id
     * @param { number } id_user 
     * @returns { Promise<string|null> }
     */
    GetRole: async function(id_user) {
        const result = await SQL.Query(`SELECT role FROM User WHERE id_user=?`, id_user);
        return result.data?.at(0)?.role;
    },
    /**
     * 
     * @param { string } username 
     * @returns { Promise<boolean> }
     */
    IsUsernameExists: async function(username) {
        const result = await SQL.Query(`SELECT id_user FROM User WHERE username=? LIMIT 1`, [username?.trim()]);
        return result.data?.length > 0;
    },

    // MANAJEMEN BERKAS MEDIA (AVATAR/FOTO PROFIL)
    Avatars: 
    {
        /**
        * Menyimpan avatar
        * @param { number } id_user 
        * @param { Array<Buffer> } buffer 
        * @returns { Promise<boolean> }
        */
        Save: async function(id_user, buffer)
        {
            try
            {
                const path = "./src/avatars/" + id_user;

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

                const image = await Jimp.read(path + ".png");
                // Membuat kanvas latar belakang kosong berukuran rasio aspek 4:3 (960x720 piksel)
                const bg = new Jimp({ width: 720, height: 720 });

                // Logika Algoritma Resizing secara Proporsional:
                // Catatan teknis: di Jimp biasanya pembacaan dimensi itu ngambil dari objek bitmap
                if (image.bitmap.width < image.bitmap.height)
                {
                    // Jika orientasi gambar potret (portrait), sesuaikan lebar ke 960 piksel
                    image.resize({ w: 720});
                }
                else if (image.bitmap.width > image.bitmap.height)
                {
                    // Jika orientasi gambar lanskap (landscape), sesuaikan tinggi ke 960 piksel
                    image.resize({ h: 720});
                }
                else
                {
                    // Jika gambar sudah berbentuk persegi sempurna, langsung paksakan resolusi target 960x960
                    image.resize({ w: 720, h: 720});
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
            * Menghapus avatar
            * @param { number } id_pegawai 
            * @returns { Promise<boolean> }
            */
        Delete: async function(id_user)
        {
            try
            {
                const path = "./src/avatars/" + id_user;
                
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

// Mengekspor modul Accounts agar semua sub-objek (Pegawai, Member, Avatars) dapat diakses oleh lapisan Router (route.js)
module.exports = User;