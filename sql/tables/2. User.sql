
-- Menyimpan data semua pengguna sistem, baik pelanggan maupun pegawai.
-- Tabel ini menggunakan tipe data ENUM('pegawai', 'member') untuk membedakan hak akses.
-- Terdapat Foreign Key ke tabel Cabang (id_cabang). Kenapa? Karena seorang pegawai pasti ditugaskan di cabang tertentu.
-- Ada aturan ON UPDATE CASCADE. Artinya, jika suatu saat id_cabang di tabel Cabang diubah, 
-- maka id_cabang pegawai di tabel User ini akan otomatis ikut berubah tanpa membuat datanya rusak/terputus.
CREATE TABLE IF NOT EXISTS `User` (
    `id_user` INT AUTO_INCREMENT PRIMARY KEY,
    `role` ENUM('pegawai', 'member') NOT NULL,
    `nama_user` VARCHAR(255) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    `nomor_ktp` VARCHAR(20) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    `nomor_telepon` VARCHAR(20) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    `username` VARCHAR(128) CHARACTER SET ascii COLLATE ascii_bin NOT NULL UNIQUE,
    `password` VARCHAR(255) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    `id_cabang` INT NULL,
    `alamat_user` VARCHAR(255) CHARACTER SET ascii COLLATE ascii_bin NULL,

    CONSTRAINT `fk_cabang_user` 
        FOREIGN KEY (`id_cabang`) REFERENCES `Cabang`(`id_cabang`) 
        ON UPDATE CASCADE
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;