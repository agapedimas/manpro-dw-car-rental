// Memanggil modul akses database
const SQL = require("../sql");
const FileIO = require("fs");
// Memanggil pustaka eksternal untuk melakukan kompresi berkas gambar ke format modern (.webp)
const ConvertWEBP = require("webp-converter");
// Memanggil pustaka Jimp (JavaScript Image Manipulation Program) untuk pemrosesan grafis secara programmatic
const { Jimp } = require("jimp");

/**
 * Modul Mobil (Data Access Object / DAO)
 * Mengelola antarmuka basis data untuk entitas inti sistem, yaitu inventaris Mobil.
 */
const Mobil = {
    /**
     * Mendapatkan daftar mobil
     * @returns { Promise<Array<{
     * plat_nomor: string,
     * id_jenis_mobil: number,
     * nama_mobil: string,
     * status_ketersediaan: 'tersedia' | 'disewa',
     * biaya_sewa_harian: number,
     * biaya_denda_harian: number,
     * id_cabang: number
     * }>> }
     */
    Get: async function() {
        const result = await SQL.Query(`
            SELECT *
            FROM View_Mobil
        `);

        return result.data;
    },

    /**
     * Mendapatkan mobil berdasarkan plat nomor
     * @param { string } plat_nomor
     * @returns { Promise<{
     * plat_nomor: string,
     * id_jenis_mobil: number,
     * nama_mobil: string,
     * status_ketersediaan: 'tersedia' | 'disewa',
     * biaya_sewa_harian: number,
     * biaya_denda_harian: number,
     * id_cabang: number
     * }> }
     */
    GetById: async function(plat_nomor) {
        const result = await SQL.Query(`
            SELECT *
            FROM View_Mobil
            WHERE plat_nomor = ?
        `, plat_nomor);

        return result.data?.at(0);
    },

    /**
     * Mendapatkan daftar mobil berdasarkan keyword dan filter
     * @param { string } keyword 
     * @param { { type?: number, available?: string|number, branch?: number } } filters 
     * @param { {
     * by:  "nama_mobil" | "biaya_sewa_harian",
     * order: "ascending" | "descending"
     * }?} sort
     * @returns { Promise<Array<{
     * plat_nomor: string,
     * id_jenis_mobil: number,
     * nama_mobil: string,
     * status_ketersediaan: 'tersedia' | 'disewa',
     * biaya_sewa_harian: number,
     * biaya_denda_harian: number,
     * id_cabang: number
     * }>> }
     */
    GetByKeyword: async function(keyword, filters = {}, sort) {
        let query = `
            SELECT View_Mobil.* FROM View_Mobil
            INNER JOIN Cabang ON View_Mobil.id_cabang = Cabang.id_cabang
            INNER JOIN JenisMobil ON View_Mobil.id_jenis_mobil = JenisMobil.id_jenis_mobil
        `;

        let params = [];
        let conditions = []; // Array untuk menampung kondisi WHERE

        // 1. Filter berdasarkan keyword (nama mobil atau nama cabang)
        if (keyword) {
            conditions.push(`(LOWER(View_Mobil.nama_mobil) LIKE LOWER(?) OR 
                              LOWER(Cabang.nama_cabang) LIKE LOWER(?) OR
                              LOWER(JenisMobil.nama_jenis_mobil) LIKE LOWER(?))`);
            params.push("%" + keyword + "%", "%" + keyword + "%", "%" + keyword + "%");
        } 

        // 2. Filter berdasarkan ID Jenis Mobil
        if (filters.type) {
            conditions.push(`View_Mobil.id_jenis_mobil = ?`);
            params.push(filters.type);
        }

        // 3. Filter berdasarkan status ketersediaan langsung dari view
        if (filters.available == 1) {
            conditions.push(`View_Mobil.status_ketersediaan = 'tersedia'`);
        } 
        else if (filters.available === 0) {
            conditions.push(`View_Mobil.status_ketersediaan = 'disewa'`);
        }

        // 4. Filter berdasarkan ID Cabang
        if (filters.branch) {
            conditions.push(`View_Mobil.id_cabang = ?`);
            params.push(filters.branch);
        }

        // 5. Jika ada filter yang aktif, gabungkan semuanya dengan AND
        if (conditions.length > 0) {
            query += " WHERE " + conditions.join(" AND ");
        }

        // Logic buat server-side sorting
        let sortQuery = " ORDER BY View_Mobil.nama_mobil ASC"; // Urutan default
        if (sort && sort.by) {
            // Validasi nama kolom
            const allowedSorts = ["nama_mobil", "biaya_sewa_harian", "kapasitas_penumpang"];
            
            if (allowedSorts.includes(sort.by)) {
                const order = sort.order === "desc" ? "DESC" : "ASC";
                // Kasih prefix tabel yang bener karena query lu pake INNER JOIN
                const prefix = sort.by === "kapasitas_penumpang" ? "JenisMobil." : "View_Mobil.";
                sortQuery = ` ORDER BY ${prefix}${sort.by} ${order}`;
            }
        }
        
        query += sortQuery;

        const results = await SQL.Query(query, params);
        return results.data || [];
    },

    /**
     * Menambahkan mobil baru
     * @param { string } plat_nomor
     * @param { number } id_jenis_mobil
     * @param { string } nama_mobil
     * @param { number } biaya_sewa_harian
     * @param { number } biaya_denda_harian
     * @param { number } id_cabang
     * @returns { Promise<boolean> }
     */
    Add: async function(plat_nomor, id_jenis_mobil, nama_mobil, biaya_sewa_harian, biaya_denda_harian, id_cabang) {
        const result = await SQL.Query(`
            INSERT INTO Mobil (
                plat_nomor, id_jenis_mobil, nama_mobil, 
                biaya_sewa_harian, biaya_denda_harian, id_cabang
            ) VALUES (?, ?, ?, ?, ?, ?)
        `, [
            plat_nomor,
            id_jenis_mobil,
            nama_mobil,
            biaya_sewa_harian,
            biaya_denda_harian,
            id_cabang
        ]);
        return result.success;
    },

    /**
     * Mengubah data mobil
     * @param { string } plat_nomor
     * @param { string } plat_nomor_baru
     * @param { number? } id_jenis_mobil
     * @param { string? } nama_mobil
     * @param { number? } biaya_sewa_harian
     * @param { number? } biaya_denda_harian
     * @param { number? } id_cabang
     * @returns { Promise<boolean> }
     */
    Update: async function(plat_nomor, plat_nomor_baru, id_jenis_mobil, nama_mobil, biaya_sewa_harian, biaya_denda_harian, id_cabang) {
        const result = await SQL.Query(`
            UPDATE Mobil 
            SET
                plat_nomor = COALESCE(?, plat_nomor),
                id_jenis_mobil = COALESCE(?, id_jenis_mobil),
                nama_mobil = COALESCE(?, nama_mobil),
                biaya_sewa_harian = COALESCE(?, biaya_sewa_harian),
                biaya_denda_harian = COALESCE(?, biaya_denda_harian),
                id_cabang = COALESCE(?, id_cabang)
            WHERE
                plat_nomor = ?
            `,
        [plat_nomor_baru, id_jenis_mobil, nama_mobil, biaya_sewa_harian, biaya_denda_harian, id_cabang, plat_nomor]);
        return result.success;
    },

    /**
     * Memindahkan semua mobil dari jenis mobil lama ke jenis mobil baru
     * @param { number } id_jenis_mobil_lama
     * @param { number } id_jenis_mobil_baru 
     * @returns { Promise<boolean> }
     */
    MoveToType: async function(id_jenis_mobil_lama, id_jenis_mobil_baru) {
        const result = await SQL.Query(`
            UPDATE Mobil 
            SET id_jenis_mobil = ?
            WHERE id_jenis_mobil = ?
        `, [id_jenis_mobil_baru, id_jenis_mobil_lama]);
        return result.success;
    },
    /**
     * Memindahkan semua mobil dari cabang lama ke cabang baru
     * @param { number } id_cabang_lama
     * @param { number } id_cabang_baru 
     * @returns { Promise<boolean> }
     */
    MoveToBranch: async function(id_cabang_lama, id_cabang_baru) {
        const result = await SQL.Query(`
            UPDATE Mobil 
            SET id_cabang = ?
            WHERE id_cabang = ?
        `, [id_cabang_baru, id_cabang_lama]);
        return result.success;
    },

    /**
     * Menghapus mobil
     * @param { string } plat_nomor
     * @returns { Promise<boolean> }
     */
    Delete: async function(plat_nomor) {
        const result = await SQL.Query(`DELETE FROM Mobil WHERE plat_nomor = ?`, plat_nomor);
        await Mobil.Thumbnails.Delete(plat_nomor);
        return result.success;
    },
    Thumbnails: 
    {
        /**
        * Menyimpan thumbnail
        * @param { string } plat_nomor 
        * @param { Array<Buffer> } buffer 
        * @returns { Promise<boolean> }
        */
        Save: async function(plat_nomor, buffer)
        {
            plat_nomor = plat_nomor.replaceAll(" ", "");
            try
            {
                const path = "./src/thumbnails/car/" + plat_nomor;
                
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
                const bg = new Jimp({ width: 960, height: 720 });

                if (image.bitmap.width < image.bitmap.height)
                {
                    image.resize({ w: 960});
                }
                else if (image.bitmap.width > image.bitmap.height)
                {
                    image.resize({ h: 960});
                }
                else
                {
                    image.resize({ w: 960, h: 960});
                }

                const x = (bg.bitmap.width - image.bitmap.width) / 2;
                const y = (bg.bitmap.height - image.bitmap.height) / 2;

                bg.composite(image, x, y);

                await bg.write(path + ".png");
                
                await ConvertWEBP.cwebp(path + ".png", path);

                FileIO.unlinkSync(path + ".png", o => o);

                return true; 
            }
            catch(error)
            {
                console.error(error); 
                return false;
            }
        },

        /**
            * Menghapus thumbnail
            * @param { string } plat_nomor 
            * @returns { Promise<boolean> }
            */
        Delete: async function(plat_nomor)
        {
            plat_nomor = plat_nomor.replaceAll(" ", "");
            try
            {
                const path = "./src/thumbnails/car/" + plat_nomor;
                
                if (FileIO.existsSync(path))
                    FileIO.unlinkSync(path); 

                return true;
            }
            catch(error)
            {
                console.error(error);
                return false;
            }
        }
    },
};

module.exports = Mobil;
