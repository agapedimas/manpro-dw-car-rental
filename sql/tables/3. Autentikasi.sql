-- Menyimpan sesi (session) pengguna yang sedang login.
-- ini biasanya digunakan oleh backend untuk mencatat siapa yang sedang aktif mengakses aplikasi. 
-- Jika pengguna logout, biasanya datanya dihapus dari sini. Tabel ini bergantung penuh pada tabel User.
CREATE TABLE IF NOT EXISTS `Autentikasi` 
    (
        `id_autentikasi` INT NOT NULL AUTO_INCREMENT,
        `id_user` INT,
            PRIMARY KEY (`id_autentikasi`),
            CONSTRAINT `fk_autentikasi_user`
                FOREIGN KEY (`id_user`) REFERENCES `User`(`id_user`) 
                ON DELETE CASCADE
                ON UPDATE CASCADE
    ) 
ENGINE=InnoDB DEFAULT CHARSET=ascii COLLATE=ascii_bin;