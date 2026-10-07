
-- Mencatat setiap aktivitas penyewaan. Ini adalah tabel pusat tempat semua data bertemu.
-- Tabel ini menghubungkan siapa yang menyewa (id_member), siapa pegawai yang melayani (id_pegawai), dan mobil apa yang disewa (plat_nomor). 
-- Tabel ini juga mencatat waktu mulai, rencana selesai, dan waktu aktual selesai untuk keperluan kalkulasi biaya.

-- Berdasarkan ERD, terdapat atribut turunan 'total_biaya_sewa' dan 'total_biaya_denda'.
-- Atribut-atribut ini TIDAK dimasukkan ke dalam CREATE TABLE karena nilainya 
-- bisa didapatkan dari perhitungan matematis (Selisih Hari x Biaya Harian).
-- Kalkulasi atribut ini diimplementasikan menggunakan fungsi DATEDIFF() 
-- yang berada di dalam View_Transaksi
CREATE TABLE IF NOT EXISTS `Transaksi`
    (
        `id_transaksi` INT NOT NULL AUTO_INCREMENT,
        `id_member` INT NOT NULL,
        `id_pegawai` INT NOT NULL,
        `plat_nomor` VARCHAR(20) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
        `tanggal_mulai` DATETIME NOT NULL,
        `tanggal_rencana_selesai` DATETIME NOT NULL,
        `tanggal_aktual_selesai` DATETIME NULL,
        `biaya_sewa_harian` INT NOT NULL,
        `biaya_denda_harian` INT NOT NULL,
        
        PRIMARY KEY (`id_transaksi`),
        CONSTRAINT `fk_transaksi_member` 
            FOREIGN KEY (`id_member`) REFERENCES `User`(`id_user`) 
            ON UPDATE CASCADE,
        CONSTRAINT `fk_transaksi_pegawai` 
            FOREIGN KEY (`id_pegawai`) REFERENCES `User`(`id_user`) 
            ON UPDATE CASCADE,
        CONSTRAINT `fk_transaksi_mobil` 
            FOREIGN KEY (`plat_nomor`) REFERENCES `Mobil`(`plat_nomor`) 
            ON UPDATE CASCADE
    )

ENGINE=InnoDB DEFAULT CHARSET=ascii COLLATE=ascii_bin;