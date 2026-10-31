
-- Membuat "tabel virtual" untuk mempermudah penarikan data yang kompleks.
-- Daripada aplikasi harus menulis JOIN yang panjang berulang kali, kita menyimpannya sebagai View.

-- Subquery (SELECT COUNT(*) FROM Transaksi ...) berfungsi sebagai agregat yang mengembalikan nilai skalar (satu angka pasti). 
-- Karena mengembalikan nilai skalar, nilainya bisa langsung dikomparasi secara matematis menggunakan > 0 di dalam fungsi IF(). 
-- Jika hasilnya lebih dari nol, statusnya 'disewa', jika tidak, 'tersedia'. Logika skalar ini menghemat kebutuhan komputasi cross join yang berat.
CREATE OR REPLACE VIEW `View_Mobil` AS
SELECT 
    Mobil.*,
    IF (
        (
            SELECT COUNT(*) 
            FROM Transaksi 
            WHERE 
                plat_nomor = Mobil.plat_nomor AND 
                tanggal_aktual_selesai IS NULL
        ) > 0, 
        'disewa', 'tersedia'
    ) AS status_ketersediaan
FROM Mobil;

-- View lainnya (View_Cabang_Ringkasan, View_Transaksi) pada dasarnya merangkum total mobil, total pegawai, 
-- dan langsung menghitung total_biaya_sewa berdasarkan selisih hari (DATEDIFF) dikalikan tarif harian.
CREATE OR REPLACE VIEW `View_Cabang_Ringkasan` AS
SELECT
    c.*,
    (
		SELECT 
			COUNT(plat_nomor) 
		FROM 
            Mobil m
        WHERE 
            m.id_cabang = c.id_cabang
    ) AS banyak_mobil,
    (
		SELECT 
			COUNT(id_user) 
		FROM 
            User u
        WHERE 
            u.id_cabang = c.id_cabang
            AND u.role = 'pegawai'
    ) AS banyak_pegawai
FROM 
    Cabang c;


CREATE OR REPLACE VIEW `View_JenisMobil_Ringkasan` AS
SELECT
    j.*,
    (
		SELECT 
			COUNT(plat_nomor) 
		FROM 
            Mobil m
        WHERE 
            m.id_jenis_mobil= j.id_jenis_mobil
    ) AS banyak_mobil
FROM 
    JenisMobil j;


CREATE OR REPLACE VIEW `View_Transaksi` AS
SELECT 
    Transaksi.id_transaksi,
    Member.id_user AS id_member,
    Member.nama_user AS nama_member,
    Transaksi.tanggal_mulai,
    Transaksi.tanggal_rencana_selesai,
    Transaksi.tanggal_aktual_selesai,
    Transaksi.biaya_sewa_harian,
    Transaksi.biaya_denda_harian,
    (DATEDIFF(Transaksi.tanggal_rencana_selesai, Transaksi.tanggal_mulai) * Transaksi.biaya_sewa_harian) AS total_biaya_sewa,
    (GREATEST(DATEDIFF(IFNULL(Transaksi.tanggal_aktual_selesai, CURRENT_TIMESTAMP), Transaksi.tanggal_rencana_selesai), 0) * Transaksi.biaya_denda_harian) AS total_biaya_denda,
    Member.nomor_telepon,
    Mobil.nama_mobil,
    Mobil.plat_nomor,
    Pegawai.id_user AS id_pegawai,
    Pegawai.nama_user AS nama_pegawai
FROM Transaksi
INNER JOIN User AS Member ON Transaksi.id_member = Member.id_user
INNER JOIN Mobil ON Transaksi.plat_nomor = Mobil.plat_nomor
INNER JOIN User AS Pegawai ON Transaksi.id_pegawai = Pegawai.id_user