
-- Menyimpan inventaris fisik mobil yang bisa disewa.
-- plat_nomor dijadikan Primary Key karena plat nomor itu unik untuk setiap mobil fisik.
-- Tabel ini mengikat dua informasi: mobil ini masuk kategori apa (id_jenis_mobil) dan sedang berada di cabang mana (id_cabang).
-- Menyimpan harga biaya_sewa_harian dan biaya_denda_harian untuk mobil tersebut saat ini.

-- Berdasarkan ERD, terdapat atribut turunan 'status_ketersediaan' di entitas ini.
-- Atribut ini TIDAK dibuat sebagai kolom fisik di tabel ini untuk mencegah redudansi.
-- Nilainya akan di-generate secara dinamis menggunakan View
-- dengan menghitung (scalar subquery) status pengembalian mobil di tabel Transaksi.
CREATE TABLE IF NOT EXISTS `Mobil`
    (
        `plat_nomor` varchar(20) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
        `id_jenis_mobil` INT NOT NULL,
        `nama_mobil` varchar(255) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
        `biaya_sewa_harian` INT NOT NULL,
        `biaya_denda_harian` INT NOT NULL,
        `id_cabang` INT NOT NULL,

        PRIMARY KEY (`plat_nomor`),
        CONSTRAINT `fk_jenis_mobil` 
            FOREIGN KEY (`id_jenis_mobil`) REFERENCES `JenisMobil`(`id_jenis_mobil`) 
            ON UPDATE CASCADE,
        CONSTRAINT `fk_cabang_mobil` 
            FOREIGN KEY (`id_cabang`) REFERENCES `Cabang`(`id_cabang`) 
            ON UPDATE CASCADE
    )

ENGINE=InnoDB DEFAULT CHARSET=ascii COLLATE=ascii_bin;