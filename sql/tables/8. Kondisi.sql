
-- Menyimpan bukti fisik kondisi mobil sebelum dan sesudah disewa.
-- Menggunakan tipe data MEDIUMBLOB untuk foto_kondisi. BLOB (Binary Large Object) digunakan untuk menyimpan file seperti gambar langsung ke dalam database. 
-- tipe_pengecekan ('awal' atau 'akhir') menentukan apakah ini foto saat mobil diserahkan atau saat dikembalikan.
CREATE TABLE IF NOT EXISTS `Kondisi`
    (
        `id_kondisi` INT NOT NULL AUTO_INCREMENT,
        `id_transaksi` INT NOT NULL,
        `foto_kondisi` MEDIUMBLOB NOT NULL,
        `deskripsi_kondisi` VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
        `tipe_pengecekan` ENUM('awal', 'akhir') NOT NULL,
        PRIMARY KEY (`id_kondisi`),
        CONSTRAINT `fk_kondisi_transaksi` 
            FOREIGN KEY (`id_transaksi`) REFERENCES `Transaksi`(`id_transaksi`) 
            ON UPDATE CASCADE
            ON DELETE CASCADE
    )

ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;