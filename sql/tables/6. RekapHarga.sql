
-- Mencatat riwayat perubahan harga sewa dan denda dari waktu ke waktu (Slowly Changing Dimension), 
-- sekaligus mengatur otomatisasinya menggunakan Trigger.
-- Jika harga sewa mobil naik hari ini, kita tentu tidak ingin total tagihan pelanggan yang menyewa bulan lalu tiba-tiba ikut naik
-- Tabel RekapHarga: Menyimpan harga dari tanggal berapa sampai tanggal berapa.
-- trg_mobil_insert: Sebuah trigger (pemicu). Saat ada mobil baru ditambahkan ke tabel Mobil, sistem otomatis mencatat harga awalnya ke tabel RekapHarga.
-- trg_mobil_update: Saat harga mobil diubah, trigger ini otomatis "menutup" tanggal selesai di harga lama dengan tanggal hari ini, 
-- lalu membuat baris harga baru yang berlaku mulai hari ini. Diurus otomatis oleh database
CREATE TABLE IF NOT EXISTS `RekapHarga`
    (
        `id_rekap_harga` INT NOT NULL AUTO_INCREMENT,
        `plat_nomor` VARCHAR(20) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
        `tanggal_mulai` DATE NOT NULL,
        `tanggal_selesai` DATE NULL,
        `biaya_harian` INT NOT NULL,
        `jenis_biaya` ENUM('sewa', 'denda') CHARACTER SET ascii COLLATE ascii_bin NOT NULL,

        PRIMARY KEY (`id_rekap_harga`),
        CONSTRAINT `fk_rekap_mobil` 
            FOREIGN KEY (`plat_nomor`) REFERENCES `Mobil`(`plat_nomor`) 
            ON UPDATE CASCADE
    )
ENGINE=InnoDB DEFAULT CHARSET=ascii COLLATE=ascii_bin;

-- Trigger saat mobil baru ditambahkan (INSERT)
DROP TRIGGER IF EXISTS trg_mobil_insert;
CREATE TRIGGER trg_mobil_insert
AFTER INSERT ON Mobil
FOR EACH ROW
BEGIN
    -- Mencatat rekap harga sewa awal dengan end date NULL
    INSERT INTO RekapHarga (plat_nomor, tanggal_mulai, tanggal_selesai, biaya_harian, jenis_biaya)
    VALUES (NEW.plat_nomor, CURDATE(), NULL, NEW.biaya_sewa_harian, 'sewa')\;

    -- Mencatat rekap denda awal dengan end date NULL
    INSERT INTO RekapHarga (plat_nomor, tanggal_mulai, tanggal_selesai, biaya_harian, jenis_biaya)
    VALUES (NEW.plat_nomor, CURDATE(), NULL, NEW.biaya_denda_harian, 'denda')\;
END;

-- Trigger waktu harga diupdate (UPDATE)
DROP TRIGGER IF EXISTS trg_mobil_update;
CREATE TRIGGER trg_mobil_update
AFTER UPDATE ON Mobil
FOR EACH ROW
BEGIN
    -- Cek kalau harga sewa berubah
    IF OLD.biaya_sewa_harian != NEW.biaya_sewa_harian THEN
        -- Tutup rekap sewa yang lama pakai tanggal hari ini
        UPDATE RekapHarga
        SET tanggal_selesai = CURDATE()
        WHERE plat_nomor = NEW.plat_nomor AND jenis_biaya = 'sewa' AND tanggal_selesai IS NULL\;

        -- Buat rekap sewa yang baru
        INSERT INTO RekapHarga (plat_nomor, tanggal_mulai, tanggal_selesai, biaya_harian, jenis_biaya)
        VALUES (NEW.plat_nomor, CURDATE(), NULL, NEW.biaya_sewa_harian, 'sewa')\;
    END IF\;

    -- Cek kalau denda berubah
    IF OLD.biaya_denda_harian != NEW.biaya_denda_harian THEN
        -- Tutup rekap denda yang lama
        UPDATE RekapHarga
        SET tanggal_selesai = CURDATE()
        WHERE plat_nomor = NEW.plat_nomor AND jenis_biaya = 'denda' AND tanggal_selesai IS NULL\;

        -- Buat rekap denda yang baru
        INSERT INTO RekapHarga (plat_nomor, tanggal_mulai, tanggal_selesai, biaya_harian, jenis_biaya)
        VALUES (NEW.plat_nomor, CURDATE(), NULL, NEW.biaya_denda_harian, 'denda')\;
    END IF\;
END;