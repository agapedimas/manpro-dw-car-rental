// Memanggil modul koneksi database utama
const SQL = require("../sql");
// Memanggil modul bawaan Node.js untuk fungsi kriptografi (enkripsi & hashing)
const crypto = require("crypto");

/**
 * Modul Autentikasi (Security & Session Management)
 * Bertanggung jawab untuk validasi kredensial (Login), manajemen sesi, dan otorisasi hak akses (Role-Based Access Control)
 */
const Authentication = 
{
    /**
     * Mengecek apakah sesi pada browser terdaftar
     * @param { number } id_autentikasi 
     * @param { Array<'pegawai' | 'member'> } role
     * @returns { Promise<boolean> }
     */
    HasAccess: async function(id_autentikasi, role)
    {
        if (Array.isArray(role) == false)
            role = [role];
        // Mencari record sesi di database yang cocok dengan ID dari cookie DAN memenuhi syarat role
        const results = await SQL.Query(`
            SELECT 
                a.id_autentikasi 
            FROM Autentikasi a 
            JOIN User u ON u.id_user = a.id_user 
            WHERE 
                a.id_autentikasi=? AND 
                (${ role.map(o => "u.role=?").join(" OR ") })
            LIMIT 1
        `, [id_autentikasi, ...role]);
        
        return results.data?.length > 0;
    },
    /**
     * Mengecek apakah username dan password sesuai
     * @param { string } username 
     * @param { string } password 
     * @returns { Promise<boolean> }
     */
    CheckCredentials: async function(username, password)
    {
        // Tahap 1: Cari password hash milik username tersebut di tabel User
        let result1 = await SQL.Query(`
            SELECT password 
            FROM User 
            WHERE username=?`
        , [username]);

        // Jika di kedua tabel tidak ditemukan, berarti username salah/tidak terdaftar
        if (result1.success == false || !result1.data?.at(0))
            return false;

        // Tahap 2: Ekstraksi Salt
        // Format password di database adalah "salt:hash". Kita pisahkan berdasarkan titik dua (:).
        const salt = result1.data[0].password.split(":")[0];

        // Tahap 3: Hashing input pengguna
        // Ubah password teks yang baru saja diketik pengguna menjadi Hash menggunakan Salt dari database
        password = await Authentication.GetPasswordHash(password, salt);

        // Jika hasil hashing error
        if (password == null)
            return false;   
        
        // Tahap 4: Verifikasi Akhir
        // Cocokkan kombinasi username dan password (yang sudah berbentuk Hash) ke tabel yang tepat
        const result2 = await SQL.Query(`
            SELECT username 
            FROM User
            WHERE username=? AND password=?`, 
        [username, password]);

        return result2.data?.length > 0; // Jika ada kembalian data, berarti login sukses
    },
    /**
     * Convert raw string ke hash
     * @param { string } password 
     * @param { string | null } salt 
     * @returns { Promise<string> } Hasil hash
     */
    GetPasswordHash: async function(password, salt) {
        return new Promise((resolve, reject) => {
            if (password == null)
                resolve(null);
            
            // Jika akun baru dibuat (belum punya salt), generate acak sepanjang 16 byte
            if (salt == null)
                salt = crypto.randomBytes(16).toString("hex");

            // Proses Hashing menggunakan scrypt (panjang kunci 64 byte)
            crypto.scrypt(password, salt, 64, (err, derivedKey) => {
                if (err) {
                    console.error(err);
                    resolve(null);
                }

                // Mengembalikan string gabungan antara Salt dan Hash (contoh: "bumbuacak:hasilhashpanjang")
                resolve(`${salt}:${derivedKey.toString("hex")}`);
            });
        });
    },
    /**
     * Mendapatkan id pegawai atau id member berdasarkan id autentikasi
     * @param { number } id_autentikasi
     * @returns { Promise<number> } Id akun
     */
    GetAccountId: async function(id_autentikasi)
    {
        // Mengambil ID entitas dari tabel sesi (Autentikasi)
        const results = await SQL.Query(`
            SELECT id_user 
            FROM Autentikasi 
            WHERE id_autentikasi=?`, 
        [id_autentikasi]);

        return results.data?.at(0)?.id_user;
    },
    /**
     * Mendaftarkan sesi baru
     * @param { number } id 
     * @param { 'pegawai' | 'member' } role
     * @returns { Promise<number> } Id autentikasi
     */
    Add: async function(id)
    {
        // Memasukkan record sesi baru
        const result = await SQL.Query(`
            INSERT INTO Autentikasi (id_user) VALUES (?)`, 
        [id]);
        
        return result.data?.insertId; // Mengembalikan ID Autentikasi (Sesi) untuk disimpan di cookie browser
    },
    /**
     * Menghapus sesi
     * @param { number } id_autentikasi 
     */
    Remove: async function(id_autentikasi)
    {
        await SQL.Query("DELETE FROM Autentikasi WHERE id_autentikasi = ?", [id_autentikasi]);
    }
};

module.exports = Authentication;