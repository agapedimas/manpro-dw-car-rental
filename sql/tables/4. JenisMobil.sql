
-- Membuat tabel master untuk kategori kendaraan.
-- Menyimpan informasi seperti "SUV", "Sedan", atau "Minibus" beserta kapasitas_penumpang-nya. Ini dipisah dari tabel Mobil agar data tidak berulang (normalisasi database).
CREATE TABLE IF NOT EXISTS `JenisMobil`
    (
        `id_jenis_mobil` INT NOT NULL AUTO_INCREMENT,
        `nama_jenis_mobil` VARCHAR(255) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
        `kapasitas_penumpang` INT NOT NULL,
        PRIMARY KEY (`id_jenis_mobil`)
    )

ENGINE=InnoDB DEFAULT CHARSET=ascii COLLATE=ascii_bin;