const SQL = require("../sql");
const FileIO = require("fs");
const Mobil = require("./mobil");

const Transaksi = {
    /**
     * Mendapatkan daftar semua transaksi / riwayat lengkap dengan Pegawai
     */
    Get: async function() {
        const result = await SQL.Query(`
            SELECT *
            FROM View_Transaksi
            ORDER BY tanggal_mulai DESC, id_transaksi DESC
        `);

        return result.data;
    },

    /**
     * Mendapatkan daftar riwayat berdasarkan keyword pencarian, filter, dan urutan
     */
    GetByKeyword: async function(keyword, filters = {}, sort = {}) {
        let query = `
            SELECT *
            FROM View_Transaksi
        `;

        let params = [];
        let conditions = [];

        if (keyword) {
            conditions.push(`(LOWER(nama_member) LIKE LOWER(?) OR 
                              LOWER(plat_nomor) LIKE LOWER(?) OR 
                              LOWER(nama_pegawai) LIKE LOWER(?))`);
            params.push("%" + keyword + "%", "%" + keyword + "%", "%" + keyword + "%");
        } 

        if (filters.id_member) {
            conditions.push(`id_member = ?`);
            params.push(filters.id_member);
        }

        if (filters.id_pegawai) {
            conditions.push(`id_pegawai = ?`);
            params.push(filters.id_pegawai);
        }

        if (filters.plat_nomor) {
            conditions.push(`plat_nomor = ?`);
            params.push(filters.plat_nomor);
        }

        if (filters.active != null) {
            conditions.push(`tanggal_aktual_selesai IS ${filters.active == 1 ? "NULL" : "NOT NULL"}`);
        }

        if (conditions.length > 0) {
            query += " WHERE " + conditions.join(" AND ");
        }

        let sortQuery = " ORDER BY tanggal_mulai DESC, id_transaksi DESC"; // Urutan default
        if (sort && sort.by) {
            // Validasi nama kolom
            const allowedSorts = ["tanggal_mulai", "tanggal_rencana_selesai", "tanggal_aktual_selesai", "nama_member", "nama_mobil", "plat_nomor"];
            
            if (allowedSorts.includes(sort.by)) {
                const order = sort.order === "asc" ? "ASC" : "DESC";
                sortQuery = ` ORDER BY ${sort.by} ${order}, id_transaksi DESC`;
            }
        }
        
        query += sortQuery;

        const results = await SQL.Query(query, params);
        return results.data || [];
    },

    /**
     * Mengecek apakah pegawai pernah melayani transaksi member
     * @param { number } id_pegawai 
     * @returns { Promise<boolean> }
     */
    IsStaffInvolved: async function(id_pegawai) {
        const result = await SQL.Query(`
            SELECT COUNT(id_pegawai)
            FROM View_Transaksi
            Where id_pegawai = ?    
        `, id_pegawai);
        const count = result.data?.at(0)["COUNT(id_pegawai)"];
        return count > 0;
    },

    /**
     * Menambahkan transaksi sewa baru menggunakan subquery dari tabel Mobil
     * @param { number } id_member
     * @param { number } id_pegawai
     * @param { string } plat_nomor
     * @param { string } tanggal_mulai
     * @param { string } tanggal_rencana_selesai
     * @returns { Promise<number> } Id transaksi 
     */
    Add: async function(id_member, id_pegawai, plat_nomor, tanggal_mulai, tanggal_rencana_selesai) {
        const result = await SQL.Query(`
            INSERT INTO Transaksi (
                id_member, id_pegawai, plat_nomor, tanggal_mulai, tanggal_rencana_selesai, biaya_sewa_harian, biaya_denda_harian
            ) 
            SELECT 
                ?, ?, ?, ?, ?, 
                Mobil.biaya_sewa_harian, 
                Mobil.biaya_denda_harian 
            FROM Mobil 
            WHERE Mobil.plat_nomor = ?
        `, [
            id_member,
            id_pegawai,
            plat_nomor,
            tanggal_mulai,
            tanggal_rencana_selesai,
            plat_nomor
        ]);

        return result.data?.insertId;
    },
    /**
     * Menyelesaikan transaksi
     * @param { number } id_transaksi
     * @param { string } plat_nomor
     * @returns { Promise<boolean> }
     */
    Finish: async function(id_transaksi, plat_nomor) {
        const result = await SQL.Query(`
                UPDATE Transaksi 
                SET
                    tanggal_aktual_selesai = CURRENT_TIMESTAMP
                WHERE
                    id_transaksi = ?
        `, id_transaksi);

        return result.success;
    },
    /**
     * Menghapus transaksi
     * @param { number } id_transaksi
     * @returns { Promise<boolean> }
     */
    Delete: async function(id_transaksi) {
        const result = await SQL.Query(`DELETE FROM Transaksi WHERE id_transaksi = ?`, id_transaksi);
        return result.success;
    }
};

module.exports = Transaksi;