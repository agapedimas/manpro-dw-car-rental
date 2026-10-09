// Memanggil modul koneksi database utama
const SQL = require("../sql");
const FileIO = require("fs");

/**
 * Modul JenisMobil (Data Access Object)
 * Menangani operasi CRUD untuk tabel referensi/master JenisMobil.
 * Tabel ini bertindak sebagai entitas kuat yang akan direferensikan oleh tabel Mobil (Foreign Key).
 */
const JenisMobil = { 
    /**
     * Mendapatkan jenis mobil
     * @param { boolean } withSummaries
     * @returns { Promise<Array<{
     * id_jenis_mobil: number,
     * nama_jenis_mobil: string,
     * kapasitas_penumpang: number,
     * banyak_mobil: number
     * }>> }
     */
    Get: async function(withSummaries = false) {
        // Melakukan proyeksi utuh pada tabel JenisMobil tanpa klausa seleksi (WHERE)
        const results = await SQL.Query(`
            SELECT *
            FROM ${ withSummaries ? "View_JenisMobil_Ringkasan" : "JenisMobil"}
        `);
        return results.data || [];
    },
    /**
     * Mendapatkan jenis mobil berdasarkan id
     * @param { number } id_jenis_mobil
     * @param { boolean } withSummaries
     * @returns { Promise<{
     * id_jenis_mobil: number,
     * nama_jenis_mobil: string,
     * kapasitas_penumpang: number,
     * banyak_mobil: number
     * }> }
     */
    GetById: async function(id_jenis_mobil, withSummaries = false) {
        // Melakukan proyeksi utuh pada tabel JenisMobil tanpa klausa seleksi (WHERE)
        const results = await SQL.Query(`
            SELECT *
            FROM ${ withSummaries ? "View_JenisMobil_Ringkasan" : "JenisMobil"}
            WHERE id_jenis_mobil = ?
        `, id_jenis_mobil);
        return results.data?.at(0);
    },
    /**
     * Menambahkan jenis mobil baru
     * @param { string } nama_jenis_mobil 
     * @param { number } kapasitas_penumpang 
     * @returns { Promise<boolean> }
     */
    Add: async function(nama_jenis_mobil, kapasitas_penumpang) {
        // Mendefinisikan struktur query DML INSERT
        const query = `
            INSERT INTO JenisMobil (
                nama_jenis_mobil, kapasitas_penumpang
            ) VALUES (?, ?)
        `;

        // Memetakan argumen untuk dieksekusi secara aman (mencegah SQL Injection)
        const params = [
            nama_jenis_mobil,
            kapasitas_penumpang
        ];

        const result = await SQL.Query(query, params);
        return result.success;
    },
    /**
     * Mengubah data jenis mobil
     * @param { number } id_jenis_mobil 
     * @param { string } nama_jenis_mobil 
     * @param { number } kapasitas_penumpang 
     * @returns { Promise<boolean> }
     */
    Update: async function(id_jenis_mobil, nama_jenis_mobil, kapasitas_penumpang) {
        const result = await SQL.Query(`
            UPDATE JenisMobil 
            SET
                nama_jenis_mobil = COALESCE(?, nama_jenis_mobil), 
                kapasitas_penumpang = COALESCE(?, kapasitas_penumpang) 
            WHERE
                id_jenis_mobil = ?
            `,[nama_jenis_mobil, kapasitas_penumpang, id_jenis_mobil] );
        return result.success;
    },
    /**
     * Menghapus jenis mobil
     * @param { number } id_jenis_mobil
     * @returns { Promise<boolean> }
     */
    Delete: async function(id_jenis_mobil) {
        // Mengeksekusi penghapusan record berdasarkan Primary Key
        // Parameter di-wrap dalam array [] untuk memenuhi syarat pemanggilan fungsi SQL.Query
        const result = await SQL.Query("DELETE FROM JenisMobil WHERE id_jenis_mobil = ?", [id_jenis_mobil]);
        return result.success;
    }
};

module.exports = JenisMobil;