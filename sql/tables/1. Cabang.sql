
-- Membuat tabel master untuk lokasi cabang penyewaan.
-- Tabel ini menyimpan id_cabang, nama_cabang, dan alamat. 
-- Tidak ada Foreign Key (kunci tamu) di sini karena entitas Cabang berdiri sendiri dan tidak bergantung pada entitas lain.
CREATE TABLE IF NOT EXISTS `Cabang` 
    (
        `id_cabang` INT NOT NULL AUTO_INCREMENT, 
        `nama_cabang` VARCHAR(128) CHARACTER SET ascii COLLATE ascii_bin NOT NULL, 
        `alamat_cabang` VARCHAR(255) CHARACTER SET ascii COLLATE ascii_bin NOT NULL, 
            PRIMARY KEY (`id_cabang`)
    ) 
ENGINE=InnoDB DEFAULT CHARSET=ascii COLLATE=ascii_bin;