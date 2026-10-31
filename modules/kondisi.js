// Memanggil modul koneksi database utama
const SQL = require("../sql");

/**
 * Modul Kondisi (Data Access Object)
 * Menangani operasi CRUD untuk tabel Kondisi.
 * Tabel ini mencatat detail kondisi fisik mobil pada saat awal dan akhir transaksi.
 */
const Kondisi = { 
    /**
     * Mendapatkan daftar semua kondisi
     * @returns { Promise<Array<{
     * id_kondisi: number,
     * id_transaksi: number,
     * foto_kondisi: Buffer,
     * deskripsi_kondisi: string,
     * tipe_pengecekan: 'awal' | 'akhir'
     * }>> }
     */
    Get: async function() {
        // Melakukan proyeksi utuh pada tabel Kondisi
        const results = await SQL.Query(`
            SELECT *
            FROM Kondisi
        `);
        return results.data || [];
    },

    /**
     * Mendapatkan kondisi berdasarkan id kondisi
     * @param { number } id_kondisi
     * @returns { Promise<{
     * id_kondisi: number,
     * id_transaksi: number,
     * foto_kondisi: Buffer,
     * deskripsi_kondisi: string,
     * tipe_pengecekan: 'awal' | 'akhir'
     * }> }
     */
    GetById: async function(id_kondisi) {
        const results = await SQL.Query(`
            SELECT *
            FROM Kondisi
            WHERE id_kondisi = ?
        `, [id_kondisi]);
        
        return results.data?.at(0);
    },

    /**
     * Mendapatkan riwayat kondisi berdasarkan id transaksi
     * @param { number } id_transaksi
     * @returns { Promise<Array<{
     * id_kondisi: number,
     * id_transaksi: number,
     * foto_kondisi: Buffer,
     * deskripsi_kondisi: string,
     * tipe_pengecekan: 'awal' | 'akhir'
     * }>> }
     */
    GetByTransaksi: async function(id_transaksi) {
        const results = await SQL.Query(`
            SELECT *
            FROM Kondisi
            WHERE id_transaksi = ?
        `, [id_transaksi]);
        
        return results.data || [];
    },

    /**
     * Menambahkan data kondisi pengecekan baru
     * @param { number } id_transaksi 
     * @param { Buffer } foto_kondisi 
     * @param { string } deskripsi_kondisi 
     * @param { 'awal' | 'akhir' } tipe_pengecekan 
     * @returns { Promise<boolean> }
     */
    Add: async function(id_transaksi, foto_kondisi, deskripsi_kondisi, tipe_pengecekan) {
        // Mendefinisikan struktur query DML INSERT
        const query = `
            INSERT INTO Kondisi (
                id_transaksi, foto_kondisi, deskripsi_kondisi, tipe_pengecekan
            ) VALUES (?, ?, ?, ?)
        `;

        // Memetakan argumen untuk dieksekusi secara aman (mencegah SQL Injection)
        const params = [
            id_transaksi,
            foto_kondisi,
            deskripsi_kondisi,
            tipe_pengecekan
        ];

        const result = await SQL.Query(query, params);
        return result.success;
    },

    /**
     * Menghapus data kondisi
     * @param { number } id_kondisi
     * @returns { Promise<boolean> }
     */
    Delete: async function(id_kondisi) {
        // Mengeksekusi penghapusan record berdasarkan Primary Key
        const result = await SQL.Query("DELETE FROM Kondisi WHERE id_kondisi = ?", [id_kondisi]);
        return result.success;
    }
};

module.exports = Kondisi;