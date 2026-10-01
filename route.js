// Memanggil modul koneksi database dan modul-modul logika data
const SQL = require("./sql");
const Variables = require("./modules/variables");
const Authentication = require("./modules/authentication");
const Functions = require("./functions");
const Formatter = require("./formatter");
const FileIO = require("fs");
const Cabang = require("./modules/cabang");
const Mobil = require("./modules/mobil");
const JenisMobil = require("./modules/jenismobil");
const Transaksi = require("./modules/transaksi");
const Kondisi = require("./modules/kondisi");
const User = require("./modules/user");

/**
 * Fungsi utama pengatur rute (Router).
 * Menghubungkan URL yang diketik pengguna dengan logika program di backend.
 * @param { import("express").Application } Server Express instance
 * @returns { void }
 */
function Route(Server) {      
    // DEFAULT ROUTE (SISTEM LOGIN & KEAMANAN)
    {
        Server.get("*", async function(req, res, next) {
            // Sistem injeksi data user ke template
            // Ambil ID dan detail pegawai/member dari database untuk ditampilkan di pojok layar (misal: "Halo, Budi")
            const id_pegawai = await Authentication.GetAccountId(req.session.admin);
            const pegawai = await User.GetById(id_pegawai);
            const id_member = await Authentication.GetAccountId(req.session.member);
            const member = await User.GetById(id_member);
            
            // Masukkan data pegawai ke 'req.variables' agar Template Engine nanti bisa mengganti teks <#? activeuser.pegawai.nama ?#> dengan nama asli
            Object.assign(req.variables, {
                    "activeuser.pegawai": JSON.stringify(pegawai),
                    "activeuser.pegawai.id_user": pegawai?.id_user || "",
                    "activeuser.pegawai.nama_user": pegawai?.nama_user || "",
                    "activeuser.pegawai.nomor_ktp": pegawai?.nomor_ktp || "",
                    "activeuser.pegawai.nomor_telepon": pegawai?.nomor_telepon || "",
                    "activeuser.pegawai.role": pegawai?.role || "",
                    "activeuser.pegawai.username": pegawai?.username || "",
                    "activeuser.pegawai.id_cabang": pegawai?.id_cabang || "",

                    "activeuser.member.id_user": member?.id_user || "",
                    "activeuser.member.nama_user": member?.nama_user || "",
                    "activeuser.member.nomor_ktp": member?.nomor_ktp || "",
                    "activeuser.member.nomor_telepon": member?.nomor_telepon || "",
                    "activeuser.member.role": member?.role || "",
                    "activeuser.member.username": member?.username || "",
                    "activeuser.member.alamat_user": member?.alamat_user || ""
                }
            );
            
            next();
        })
        // 1. Rute untuk Proses Login (Masuk)
        Server.post("/api/signin", async function(req, res)
        {
            const username = req.body.username?.toLowerCase()?.trim();
            const password = req.body.password?.trim();

            // Cek apakah username dan password (yang sudah di-hash) cocok di database
            const valid = await Authentication.CheckCredentials(username, password);

            if (valid) {
                const account = (await User.Get({ username: username })).at(0);
                // Catat sesi login baru ke tabel 'Autentikasi' di database
                // Simpan ID sesi ke cookie browser pengguna
                const role = await User.GetRole(account.id_user);
                const sessionId = await Authentication.Add(account.id_user);
                
                if (role == "pegawai") {
                    req.session.admin = sessionId;
                    return res.send({ url: "/admin" });
                }
                else if (role == "member") {
                    req.session.member = sessionId;
                    return res.send({ url: "/" });
                }
                else {
                    return res.status(404).send("Role akun tidak ditemukan.");
                }
            }
            else {
                // Jika password salah, kirim status 401 (Unauthorized)
                return res.status(401).send("Username atau kata sandi salah.");
            }
        });

        Server.get(["/signin", "/signup"], async function(req, res, next){
            const hasAccess = await Authentication.HasAccess(req.session.member, "member");
            
            if (hasAccess == true)
                return res.redirect("/");

            next();
        });
        
        Server.post("/api/signup", async function(req, res) {
            const name = req.body.name;
            const username = req.body.username?.trim()?.toLowerCase();
            const password = req.body.password;
            const nomor_telepon = req.body.nomor_telepon;
            const nomor_ktp = req.body.nomor_ktp;
            const alamat_user = req.body.alamat;

            // validasi input
            if (name) {
                const isValid = name.trim().length >= 3;
                if (!isValid)
                    return res.status(400).send("Masukkan nama dengan benar");
            }
            else {
                return res.status(400).send("Nama tidak boleh kosong");
            }

            if (username) {
                const isValid1 = await User.IsUsernameExists(username) == false;
                const isValid2 = /^[a-z0-9_.]+$/.test(username);

                if (!isValid1)
                    return res.status(400).send("Username \"" + username + "\" sudah digunakan");

                if (!isValid2)
                    return res.status(400).send("Username tidak valid.");
            }
            else {
                return res.status(400).send("Username tidak boleh kosong");
            }

            if (nomor_telepon) {
                const isValid = Formatter.PhoneNumber(nomor_telepon, true) != "-";
                if (!isValid)
                    return res.status(400).send("Nomor telepon tidak valid");
            }
            else {
                return res.status(400).send("Nomor telepon tidak boleh kosong");
            }

            if (nomor_ktp) {
                const isValid = /[0-9]/.test(nomor_ktp) && nomor_ktp.trim().length == 16;
                if (!isValid)
                    return res.status(400).send("Nomor KTP harus berupa 16 digit");
            }
            else {
                return res.status(400).send("Nomor KTP tidak boleh kosong");
            }

            const accountId = await User.Add("member", name, nomor_ktp, nomor_telepon, username, password, null, alamat_user);
            
            if (accountId) {
                // jika berhasil, langsung auto sign-in
                const sessionId = await Authentication.Add(accountId);
                // Simpan ID sesi ke cookie browser pengguna
                req.session.member = sessionId;
                res.send();
            }
            else {
                res.status(500).send();
            }
        });

        // 2. Rute untuk Proses Logout (Keluar)
        Server.get("/signout", async function(req, res) {
            if (req.session.member) {
                await Authentication.Remove(req.session.member);
                delete req.session["member"];
            }

            // Arahkan (redirect) pengguna kembali ke halaman login
            res.redirect("/signin");
        });


        // 3. Middleware keamanan untuk memproteksi halaman Admin
        // Tanda bintang (*) artinya berlaku untuk semua URL yang berawalan /admin
        Server.get("/admin*", async function(req, res, next) {
            // Cek apakah pengguna saat ini punya sesi aktif sebagai 'pegawai'
            const hasAccess = await Authentication.HasAccess(req.session.admin, "pegawai");

            // Jika TIDAK punya akses (belum login) dan mencoba membuka halaman selain halaman login
            if (hasAccess == false && req.path != "/admin/signin" && req.path != "/admin/manifest.json") {
                // Jika yang diminta adalah file script/CSS, blokir (403 Forbidden)
                if (req.path.endsWith(".js") || req.path.endsWith(".css")) {
                    res.setHeader("Cache-Control", "no-store");
                    return res.status(403).send();
                }
                else {
                    // Jika mencoba buka halaman HTML, tendang (redirect) ke halaman login
                    req.session.redirect = req.url; // Ingat dia mau buka apa, supaya nanti setelah login dikembalikan ke situ
                    return res.redirect("/admin/signin");
                }
            }
            // Jika SUDAH punya akses (sudah login)
            else if (hasAccess == true) {
                // Kalau dia mencoba buka halaman login padahal sudah login, langsung arahkan ke Dashboard (/admin/)
                if (req.path == "/signin") {
                    const redirect = req.session.redirect;
                    req.session.redirect = null;

                    if (redirect)
                        return res.redirect(redirect);
                    else
                        return res.redirect("/admin/");
                }
            }

            next(); // Lanjutkan request ke tahap berikutnya
        });

        // 4. Middleware keamanan untuk memproteksi aksi manipulasi data (POST, PUT, PATCH, DELETE)
        // Memastikan orang luar tidak bisa mengubah/menghapus data lewat tools seperti Postman tanpa login
        Server.post("/admin*", async function(req, res, next) {
            if (await Authentication.HasAccess(req.session.admin, "pegawai") == false)
                res.status(403).send("Sign in terlebih dahulu untuk mengirim");
            else
                next();
        });

        Server.put("/admin*", async function(req, res, next) {
            if (await Authentication.HasAccess(req.session.admin, "pegawai") == false)
                res.status(403).send("Sign in terlebih dahulu untuk mengupdate");
            else
                next();
        });

        Server.patch("/admin*", async function(req, res, next) {
            if (await Authentication.HasAccess(req.session.admin, "pegawai") == false)
                res.status(403).send("Sign in terlebih dahulu untuk mengupdate");
            else
                next();
        });

        Server.delete("/admin*", async function(req, res, next) {
            if (await Authentication.HasAccess(req.session.admin, "pegawai") == false)
                res.status(403).send("Sign in terlebih dahulu untuk megnhapus");
            else
                next();
        });
        
        Server.get("/admin/signout", async function(req, res) {
            if (req.session.admin) {
                await Authentication.Remove(req.session.admin);
                delete req.session["admin"];
            }

            // Arahkan (redirect) pengguna kembali ke halaman login
            res.redirect("/admin/signin");
        });

        // Filter untuk menandai jika request hanya meminta konten (tanpa header/footer UI)
        Server.get("*", function(req, res, next) {
            if (req.query.contentOnly == "true")
                req.contentOnly = true;
            next();
        });
    }

    // Rute penyedia file media (GAMBAR)
    // Rute untuk melihat foto profil (Avatar)
    Server.get("/api/avatar/:accountid", async function(req, res)
    {
        if (!req.params.accountid)
            return res.status(400).send();

        res.header("Content-Type", "image/webp"); // Format gambar modern
        
        const avatarPath = "./src/avatars/" + req.params.accountid;

        // Cek apakah file avatar khusus user tersebut ada di folder server
        if (FileIO.existsSync(avatarPath))
            res.sendFile(avatarPath, { root: "./" });
        else
            // Berikan avatar default jika tidak ada
            res.sendFile("./src/avatar.webp", { root: "./" });
    });

    // Rute untuk mengunggah (upload) foto profil baru
    Server.post("/api/avatar/:role", async function(req, res)
    {
        let id;
        if (req.params.role == "admin")
            id = req.session.admin;
        else if (req.params.role == "member")
            id = req.session.member;
        else 
            return res.status(404).send("Role tidak ditemukan");

        const account = await Authentication.GetAccountId(id); // Ambil ID berdasarkan sesi saat ini

        if (!id || !account)
            return res.status(404).send("Akun tidak ditemukan.");
        
        const buffer = req.files.file.data; // Ambil data file yang diupload

        // Batasi ukuran file foto maksimal 3 Megabyte
        if (buffer.length > 3000000)
            return res.status(400).send("Ukuran foto tidak boleh lebih besar dari 3 MB.");
        
        // Panggil fungsi Save di module akun untuk menyimpan dan memotong (crop) foto
        const success = await User.Avatars.Save(account, buffer);
        
        if (success)
            res.send();
        else
            res.status(500).send();
    });

    // Rute untuk melihat gambar thumbnail mobil/cabang
    Server.get("/api/thumbnail/:kind/:id", async function(req, res) {
        if (!req.params.id)
            return res.status(400).send();

        res.header("Content-Type", "image/webp");
        const thumbnailPath = "./src/thumbnails/" + req.params.kind + "/" + req.params.id;
        
        // Cek apakah file thumbnail ada, jika tidak berikan gambar kosong (blank)
        if (FileIO.existsSync(thumbnailPath))
            res.sendFile(thumbnailPath, { root: "./" });
        else
            res.sendFile("./src/blank.png", { root: "./" });
        

    });
    Server.post("/api/thumbnail/:kind/:id", async function(req, res)
    {
        const id = req.params.id;
        const kind = req.params.kind;

        let entity;

        if (kind == "branch")
            entity = await Cabang.GetById(id);
        else if (kind == "car")
            entity = await Mobil.GetById(id);
        else
            return res.status(404).send("Jenis thumbnail tidak ditemukan.");
        
        if (!id || !entity)
            return res.status(404).send("Tujuan thumbnail tidak ditemukan.");
        
        const buffer = req.files.file.data; // Ambil data file yang diupload

        // Batasi ukuran file foto maksimal 3 Megabyte
        if (buffer.length > 3000000)
            return res.status(400).send("Ukuran foto tidak boleh lebih besar dari 3 MB.");
        
        // Panggil fungsi Save di module akun untuk menyimpan dan memotong (crop) foto
        let success = false;
        if (kind == "branch")
            success = await Cabang.Thumbnails.Save(id, buffer);
        else if (kind == "car")
            success = await Mobil.Thumbnails.Save(id, buffer);
        
        if (success)
            res.send();
        else
            res.status(500).send();
    });

    // 1. Pegawai
        // 1.1. Method untuk mendapatkan daftar staff
        Server.get("/api/staff", async function(req, res) {
            // req.query mengambil parameter dari URL (misal: /api/staff?branch=1&search=budi)
            const id_cabang = req.query.branch;
            const keyword = req.query.search;

            // Memanggil modul User untuk mengeksekusi query SELECT
            const staffs = await User.GetByKeyword(keyword, { role: "pegawai", id_cabang: id_cabang });
            res.send(staffs); // Mengirim data kembali ke browser dalam format JSON
        })
        
        // 1.2. Method untuk menambahkan staff baru
        Server.post("/api/staff", async function(req, res) {
            // req.body mengambil data yang dikirimkan melalui form HTML (tersembunyi)
            let { nama_user, nomor_ktp, nomor_telepon, username, password, id_cabang } = req.body;
            const id_admin = await Authentication.GetAccountId(req.session.admin);
            const admin_account = await User.GetById(id_admin);

            if (admin_account.username != "root")
                return res.status(403).send("Hanya admin yang bisa menambah akun pegawai.");

            // Pastikan tidak ada field yang dibiarkan kosong oleh pengguna
            if (!nama_user || !nomor_ktp || !nomor_telepon || !username || !password || !id_cabang) {
                return res.status(400).send("Data tidak lengkap. Semua field wajib diisi.");
            }

            // Pastikan username unik
            username = username.trim().toLowerCase();

            // Validasi username
            if (/^[a-z0-9_.]+$/.test(username) == false)
                return res.status(400).send("Username tidak valid.");

            if (await User.IsUsernameExists(username))
                return res.status(400).send("Akun dengan username '" + username + "' sudah ada");

            // Memanggil modul User untuk mengeksekusi query INSERT
            const isSuccess = await User.Add("pegawai", nama_user, nomor_ktp, nomor_telepon, username, password, id_cabang);
            if (isSuccess)
                res.send(); // Berhasil
            else
                res.status(500).send(); // Gagal (Internal Server Error)
        });

        // 1.3. Method untuk mengedit staff
        Server.put("/api/staff", async function(req, res) {
            const { id_user, nama_user , nomor_ktp, nomor_telepon, username, password, id_cabang } = req.body;
            const id_admin = await Authentication.GetAccountId(req.session.admin);
            const admin_account = await User.GetById(id_admin);

            if (admin_account.username != "root")
                return res.status(403).send("Hanya admin yang bisa mengupdate akun pegawai.");

            // Validasi (password boleh kosong jika tidak ingin diubah, makanya tidak dicek di sini)
            if (!id_user || !nama_user || !nomor_ktp || !nomor_telepon || !username || !id_cabang) {
                return res.status(400).send("Data tidak lengkap untuk melakukan update.");
            }

            if (await User.GetRole(id_user) != "pegawai") {
                return res.status(400).send("Data yang diberikan bukanlah data pegawai.");
            }

            // Memanggil modul User untuk mengeksekusi query UPDATE
            const isSuccess = await User.Update(id_user, nama_user, nomor_ktp, nomor_telepon, username, password, id_cabang);
            if (isSuccess)
                res.send();
            else
                res.status(500).send();
        });

        // 1.4. Method untuk menghapus staff
        Server.delete("/api/staff", async function(req, res) {
            const id_user = req.body.id_user;
            const id_admin = await Authentication.GetAccountId(req.session.admin);
            const admin_account = await User.GetById(id_admin);

            if (admin_account?.username != "root")
                return res.status(403).send("Hanya admin yang bisa menghapus akun pegawai.");

            if (id_admin == id_user)
                return res.status(400).send("Tidak dapat menghapus akun root.");

            if (!id_user)
                return res.status(400).send("ID pegawai tidak ditemukan.");
            
            if (await Transaksi.IsStaffInvolved(id_user) == true)
                return res.status(400).send("Tidak dapat menghapus pegawai karena pernah terlibat melayani transaksi.");

            // Memanggil modul User untuk mengeksekusi query DELETE
            const isSuccess = await User.Delete(id_user);
            if (isSuccess)
                res.send();
            else
                res.status(500).send();
        });

    // 2. Cabang
        // 2.1. Method untuk mendapatkan daftar cabang
        Server.get("/api/branch", async function(req, res) {
            const keyword = req.query.search;

            const branches = await Cabang.GetByKeyword(keyword, req.query.summary == "1");
            res.send(branches);
        });

        // 2.2. Method untuk menambah cabang baru
        Server.post("/api/branch", async function(req, res) {
            const { nama_cabang, alamat_cabang } = req.body;
            
            if (!nama_cabang || !alamat_cabang) {
                return res.status(400).send("Data cabang tidak lengkap.");
            }

            const isSuccess = await Cabang.Add(nama_cabang, alamat_cabang);
            if (isSuccess) 
                res.send();
            else 
                res.status(500).send();
        });

        // 2.3. Method untuk mengupdate cabang
        Server.put("/api/branch", async function(req, res) {
            const { id_cabang, nama_cabang, alamat_cabang } = req.body;

            if (!id_cabang)
                return res.status(400).send("ID Cabang wajib diisi.");

            const isSuccess = await Cabang.Update(id_cabang, nama_cabang, alamat_cabang);
            if (isSuccess) 
                res.send();
            else 
                res.status(500).send();
        });

        // 2.4. Method untuk menghapus cabang
        Server.delete("/api/branch", async function(req, res) {
            const id_cabang_lama = req.body.id_cabang_lama;
            const id_cabang_baru = req.body.id_cabang_baru;

            if (!id_cabang_lama)
                return res.status(400).send("ID Cabang lama wajib diisi.");

            // Cek apakah cabang mobil lama sudah dapat dihapus melalui banyaknya mobil
            const cabang = await Cabang.GetById(id_cabang_lama, true);
            if (!cabang)
                return res.status(404).send("Cabang tidak ditemukan");
            // jika tidak nol, artinya wajib mencantumkan id cabang baru
            if ((cabang.banyak_mobil > 0 || cabang.banyak_pegawai > 0) && !id_cabang_baru) 
                return res.status(400).send("ID Cabang baru wajib diisi karena masih terdapat mobil atau pegawai pada cabang saat ini.");

            // Pindahkan dulu semua mobil dengan cabang mobil lama ke cabang mobil baru
            const success1 = await Mobil.MoveToBranch(id_cabang_lama, id_cabang_baru);
            if (success1 == false)
                return res.status(500).send("Gagal saat memindahkan mobil dari cabang lama ke cabang baru.");
            
            const success2 = await User.MoveToBranch(id_cabang_lama, id_cabang_baru);
            if (success2 == false)
                return res.status(500).send("Gagal saat memindahkan pegawai dari cabang lama ke cabang baru.");

            const success3 = await Cabang.Delete(id_cabang_lama);

            if (success3)
                res.send();
            else
                res.status(500).send();
        });

    
    // 3. Mobil
    // Logikanya persis sama seperti Pegawai dan Cabang (CRUD: Create, Read, Update, Delete)
        // 3.1 Method untuk mendapatkan daftar mobil
        Server.get("/api/car", async function(req, res) {
            const keyword = req.query.search;
            
            const filters = {
                type: req.query.type,
                available: req.query.available,
                branch: req.query.branch
            };

            const sort = {
                by: req.query.sort_by,
                order: req.query.sort_order
            };

            const cars = await Mobil.GetByKeyword(keyword, filters, sort);
            res.send(cars);
        });

        // 3.2 Method untuk menambahkan mobil baru
        Server.post("/api/car", async function(req, res) {
            const {
                plat_nomor, id_jenis_mobil, nama_mobil, biaya_sewa_harian, 
                biaya_denda_harian, id_cabang
            } = req.body;

            if (!plat_nomor || !id_jenis_mobil || !nama_mobil || !biaya_sewa_harian || !biaya_denda_harian || !id_cabang) {
                return res.status(400).send("Data mobil tidak lengkap.");
            }

            const success = await Mobil.Add(
                plat_nomor, 
                id_jenis_mobil, 
                nama_mobil,
                biaya_sewa_harian, 
                biaya_denda_harian, 
                id_cabang
            );

            if (success) {
                res.send();
            } else {
                res.status(500).send();
            }
        })
        
        // 3.3 Method untuk mengupdate data mobil
        Server.put("/api/car", async function(req, res) {
            const {
                plat_nomor, plat_nomor_baru, id_jenis_mobil, nama_mobil, biaya_sewa_harian, 
                biaya_denda_harian, id_cabang
            } = req.body;

            if (!plat_nomor)
                return res.status(400).send("Plat nomor wajib diisi untuk update.");

            const success = 
                await Mobil.Update(
                    plat_nomor, plat_nomor_baru,
                    id_jenis_mobil, nama_mobil, biaya_sewa_harian, 
                    biaya_denda_harian, id_cabang
            );

            if (success)
                res.send();
            else
                res.status(500).send();
        });

    // 4. Jenis Mobil
        // 4.1.
        Server.get("/api/car/type", async function(req, res) {
            const cars = await JenisMobil.Get(req.query.summary == "1");
            res.send(cars);
        })
        // 4.2.
        Server.post("/api/car/type", async function(req, res) {
            const nama_jenis_mobil = req.body.nama_jenis_mobil;
            const kapasitas_penumpang = req.body.kapasitas_penumpang;

            if (!nama_jenis_mobil || !kapasitas_penumpang) {
                return res.status(400).send("Nama jenis mobil dan kapasitas penumpang wajib diisi.");
            }

            const success = await JenisMobil.Add(nama_jenis_mobil, kapasitas_penumpang);

            if (success) {
                res.send();
            } else {
                res.status(500).send();
            }
        })
        // 4.3.
        Server.put("/api/car/type", async function(req, res) {
            const id_jenis_mobil = req.body.id_jenis_mobil;
            const nama_jenis_mobil = req.body.nama_jenis_mobil;
            const kapasitas_penumpang = req.body.kapasitas_penumpang;

            if (!id_jenis_mobil) {
                return res.status(400).send("ID jenis mobil wajib diisi untuk update.");
            }

            const success = await JenisMobil.Update(id_jenis_mobil, nama_jenis_mobil, kapasitas_penumpang);

            if (success) {
                res.send();
            } else {
                res.status(500).send();
            }
        });
        // 4.4.
        Server.delete("/api/car/type", async function(req, res) {
            const id_jenis_mobil_lama = req.body.id_jenis_mobil_lama;
            const id_jenis_mobil_baru = req.body.id_jenis_mobil_baru;

            if (!id_jenis_mobil_lama)
                return res.status(400).send("ID jenis mobil lama wajib diisi untuk dihapus.");

            // Cek apakah jenis mobil lama sudah dapat dihapus melalui banyaknya mobil
            const jenis = await JenisMobil.GetById(id_jenis_mobil_lama, true);
            if (!jenis)
                return res.status(404).send("Jenis Mobil tidak ditemukan");
            // jika tidak nol, artinya wajib mencantumkan id cabang baru
            if (jenis.banyak_mobil > 0 && !id_jenis_mobil_baru) 
                return res.status(400).send("ID Jenis Mobil baru wajib diisi karena masih terdapat mobil pada jenis mobil tersebut.");

            // Pindahkan dulu semua mobil dengan jenis mobil lama ke jenis mobil baru
            const success1 = await Mobil.MoveToType(id_jenis_mobil_lama, id_jenis_mobil_baru);
            if (success1 == false)
                return res.status(500).send();

            const success2 = await JenisMobil.Delete(id_jenis_mobil_lama);

            if (success2)
                res.send();
            else
                res.status(500).send();
        }); 
    // 5. Riwayat Harga Mobil
        // 5.1
        Server.get("/api/car/pricehistory/:plat_nomor", async function(req, res) {
            const result = await Mobil.PriceHistory.Get(req.params.plat_nomor);
            res.send(result || []);
        });

  
    // 5. Transaksi
        // 5.1 Method untuk mendapatkan daftar riwayat (dengan fitur pencarian, filter, dan urutan)
        Server.get("/api/transaction", async function(req, res) {

            const keyword = req.query.search;

            const filters = {
                id_member: req.query.id_member,
                id_pegawai: req.query.id_pegawai,
                active: req.query.active
            };
            
            const sort = {
                by: req.query.sort_by,
                order: req.query.sort_order
            };

            const result = await Transaksi.GetByKeyword(keyword, filters, sort);
            res.send(result);
        });

        // 5.2 Method untuk menambahkan transaksi/riwayat baru (Mulai Sewa)
        Server.post("/api/transaction", async function(req, res) {
            const id_member = req.body.id_member;
            const id_pegawai = req.body.id_pegawai;
            const plat_nomor = req.body.plat_nomor;
            const tanggal_mulai = req.body.tanggal_mulai;
            const tanggal_rencana_selesai = req.body.tanggal_rencana_selesai;
            
            const files = [].concat(req.files?.kondisi_files || []);
            const descriptions = [].concat(req.body.kondisi_descriptions || []);

            if (!id_member || !plat_nomor || !tanggal_mulai || !tanggal_rencana_selesai)
                return res.status(400).send("Data tidak lengkap.");

            if (files.length == 0 || descriptions.length == 0) 
                return res.status(400).send("Kondisi tidak boleh kosong.");

            if (files.some(o => o?.data == "" || o?.data == null) == true) {
                return res.status(400).send("Foto kondisi tidak boleh kosong.");
            }
            else if (descriptions.some(o => o == "" || o == null) == true) {
                return res.status(400).send("Deskripsi kondisi tidak boleh kosong.");
            }

            // Pastikan mobil sedang tidak digunakan
            const mobil = await Mobil.GetById(plat_nomor);
            if (mobil.status_ketersediaan == "disewa")
                return res.status(400).send("Mobil sedang tidak tersedia untuk disewa.");

            const id_transaksi = await Transaksi.Add(id_member, id_pegawai, plat_nomor, tanggal_mulai, tanggal_rencana_selesai);

            if (!id_transaksi) {
                return res.status(500).send("Gagal membuat data transaksi.");
            }

            for (let i = 0; i < files.length; i++) {
                await Kondisi.Add(
                    id_transaksi, 
                    files[i].data, 
                    descriptions[i], 
                    "awal"
                );
            }

            res.send();
        });

        // 5.3 Method untuk mengupdate transaksi (Pengembalian Mobil)
        Server.put("/api/transaction", async function(req, res){
            const id_transaksi = req.body.id_transaksi;
            const plat_nomor = req.body.plat_nomor;
            
            if (!id_transaksi || !plat_nomor)
                return res.status(400).send("Data transaksi tidak lengkap.");

            const success = await Transaksi.Finish(id_transaksi, plat_nomor);

            if (success)
                res.send();
            else
                res.status(500).send();
        });

    // 6 Member
        // 6.1 Method untuk mendapatkan daftar member
        Server.get("/api/member", async function(req, res) {
            const keyword = req.query.search;

            const members = await User.GetByKeyword(keyword, { role: "member" });
            res.send(members);
        });

        // 6.2 Method untuk menambahkan member baru
        Server.post("/api/member", async function(req, res) {
            const { nama_user, nomor_ktp, nomor_telepon, username, password, alamat_user } = req.body;

            if (!nama_user || !nomor_ktp || !nomor_telepon || !username || !password || !alamat_user) {
                return res.status(400).send("Data tidak lengkap. Semua field wajib diisi.");
            }

            const isSuccess = await User.Add("member", nama_user, nomor_ktp, nomor_telepon, username, password, null, alamat_user);
            if (isSuccess)
                res.send();
            else
                res.status(500).send();
        });

        // 6.3 Method untuk mengedit member
        Server.put("/api/member", async function(req, res) {
            const { id_user, nama_user , nomor_ktp, nomor_telepon, username, password, alamat_user } = req.body;

            if (!id_user || !nama_user || !nomor_ktp || !nomor_telepon || !username || !alamat_user) {
                return res.status(400).send("Data tidak lengkap untuk melakukan update.");
            }

            if (await User.GetRole(id_user) != "member") {
                return res.status(400).send("Data yang diberikan bukanlah data member.");
            }

            const isSuccess = await User.Update(id_user, nama_user, nomor_ktp, nomor_telepon, username, password, null, alamat_user);
            if (isSuccess)
                res.send();
            else
                res.status(500).send();
        });

        // 6.4 Method untuk menghapus member
        Server.delete("/api/member", async function(req, res) {
            const id_user = req.body.id_user;

            if (!id_user) {
                return res.status(400).send("ID member tidak ditemukan.");
            }

            const isSuccess = await User.Delete(id_user);
            if (isSuccess)
                res.send();
            else
                res.status(500).send();
        });

        // 7. Kondisi
        // 7.1 Method untuk mendapatkan daftar kondisi pengecekan
        Server.get("/api/condition", async function(req, res) {
            const id_transaksi = req.query.id_transaksi;
            let result;

            // Kalau ada parameter id_transaksi, tarik spesifik riwayat transaksinya
            // Kalau kosong, tarik semua data kondisi
            if (id_transaksi) {
                result = await Kondisi.GetByTransaksi(id_transaksi);
            } else {
                result = await Kondisi.Get();
            }

            res.send(result);
        });

        // 7.2 Method untuk menambahkan kondisi baru (Upload foto fisik mobil)
        Server.post("/api/condition", async function(req, res) {
            const id_transaksi = req.body.id_transaksi;
            const deskripsi_kondisi = req.body.deskripsi_kondisi?.substring(0, 255);
            const tipe_pengecekan = req.body.tipe_pengecekan;
            
            // Mengambil buffer gambar dari upload
            const foto_kondisi = req.files?.file?.data;

            if (!id_transaksi || !foto_kondisi || !deskripsi_kondisi || !tipe_pengecekan) {
                return res.status(400).send("Data kondisi tidak lengkap. Pastikan foto juga diupload.");
            }

            const success = await Kondisi.Add(id_transaksi, foto_kondisi, deskripsi_kondisi, tipe_pengecekan);

            if (success)
                res.send();
            else
                res.status(500).send();
        });

        // 7.3 Method untuk mengupdate data kondisi
        Server.put("/api/condition", async function(req, res) {
            const id_kondisi = req.body.id_kondisi;
            const id_transaksi = req.body.id_transaksi;
            const deskripsi_kondisi = req.body.deskripsi_kondisi;
            const tipe_pengecekan = req.body.tipe_pengecekan;
            
            // Foto bersifat opsional saat update
            const foto_kondisi = req.files?.file?.data;

            if (!id_kondisi) {
                return res.status(400).send("ID Kondisi wajib diisi untuk melakukan update.");
            }

            const success = await Kondisi.Update(id_kondisi, id_transaksi, foto_kondisi, deskripsi_kondisi, tipe_pengecekan);

            if (success)
                res.send();
            else
                res.status(500).send();
        });

        // 7.4 Method untuk menghapus riwayat kondisi
        Server.delete("/api/condition", async function(req, res) {
            const id_kondisi = req.body.id_kondisi;

            if (!id_kondisi) {
                return res.status(400).send("ID Kondisi wajib diisi untuk dihapus.");
            }

            const success = await Kondisi.Delete(id_kondisi);

            if (success)
                res.send();
            else
                res.status(500).send();
        });

    // Menjalankan fungsi Map (Static File Server & Template Engine) di bawah
    Map(Server);
}

/**
 * Mesin utama untuk UI
 * Fungsi ini bertugas mengirimkan file HTML, CSS, JS, dan Gambar ke browser pengguna
 */
function Map(Server) {
    // Menangani semua request GET (seperti saat pengguna mengetik URL di browser)
    Server.get("*", async function(req, res) {
        const prettyPath = PrettifyPath(req); // Merapikan URL (menghilangkan .html, dll)
        const path = prettyPath.result;
        
        // Jika URL jelek (misal ada //), arahkan ulang ke URL yang sudah dirapikan
        if (prettyPath.refresh) {
            res.redirect("/" + prettyPath.result);
            return;
        }
        
        // Mendeteksi jenis file yang diminta oleh browser
        const rootPath = req.filepath ? "" : "./public/";
        const isHTML = FileIO.existsSync(rootPath + path + ".html") || FileIO.existsSync(rootPath + path + "/index.html");
        const isJS = path.endsWith(".js") && FileIO.existsSync(rootPath + path);
        const isCSS = path.endsWith(".css") && FileIO.existsSync(rootPath + path);
        const isIndex = isHTML ? FileIO.existsSync(rootPath + path + ".html") == false : false;
        const isImage = /(\.png|\.webp|\.jpg|\.bmp|\.jpeg)$/g.test(path);
        const pageType = path.startsWith("admin") || req.isAdmin == true ? "admin" : "public";

        // Kasus 1: Jika yang diminta adalah file HTML (Halaman Web)
        if (isHTML) {
            let data;
            // Baca isi file HTML mentah dari folder public/
            if (isIndex)
                data = FileIO.readFileSync(rootPath + path + "/index.html");
            else
                data = FileIO.readFileSync(rootPath + path + ".html");

            data = data.toString();
            // Inject (Sisipkan) Header dan Footer ke dalam HTML mentah tadi
            data = Functions.Page_Compile(pageType, data, path, req.contentOnly == true);
            
            // Injeksi variabel dinamis
            // Mengganti teks khusus seperti <#? activeuser.pegawai.nama_pegawai ?#> di HTML
            // dengan data asli dari database yang disiapkan di middleware keamanan tadi
            if (req.variables)
                for (const variable of Object.keys(req.variables))
                    data = data.replace(new RegExp("<#\\?(| )" + variable + "(| )\\?#>", "gi"), req.variables[variable] || "");
            
            res.send(data); // Kirim HTML yang sudah matang ke browser
        }
        // Kasus 2: Jika yang diminta adalah file Javascript atau CSS
        else if (isJS || isCSS) {
            // Beritahu browser tipe datanya agar tidak salah render
            if (isJS)
                res.header("Content-Type", "text/javascript; charset=utf-8");
            else if (isCSS)
                res.header("Content-Type", "text/css");
            
            let data = FileIO.readFileSync(rootPath + path).toString();
            res.send(data); // Kirim file mentah
        }
        // Kasus 3: Jika yang diminta adalah Gambar atau File lainnya
        else {
            if (FileIO.existsSync(rootPath + path)) {
                res.sendFile(rootPath + path, { root: "./" }); // Kirim gambar aslinya
            }
            else {
                // Penanganan Error 404 (Not Found)
                if (isImage)
                    res.status(404).sendFile("./src/blank.png", { root: "./" }); // Gambar transparan
                else
                    res.status(404).sendFile("./public/404.shtml", { root: "./" }); // Halaman Error 404 UI
            }
        }
    });
    
    // Menangani request POST yang ditujukan langsung ke halaman statis (mirip seperti GET di atas)
    Server.post("*", async function(req, res, next) {
        let path = PrettifyPath(req).result;
        
        const rootPath = req.filepath ? "" : "./public/";
        const isHTML = FileIO.existsSync(rootPath + path + ".html") || FileIO.existsSync(rootPath + path + "/index.html");
        const isIndex = isHTML ? FileIO.existsSync(rootPath + path + ".html") == false : false;
        const pageType = path.startsWith("admin") || req.isAdmin == true ? "admin" : "public";

        if (isHTML) {
            let data;
            if (isIndex)
                data = FileIO.readFileSync(rootPath + path + "/index.html");
            else
                data = FileIO.readFileSync(rootPath + path + ".html");

            data = data.toString();
            data = Functions.Page_Compile(pageType, data, path, true);
            
            if (req.variables)
                for (const variable of Object.keys(req.variables))
                    data = data.replace(new RegExp("<#\\?(| )" + variable + "(| )\\?#>", "gi"), req.variables[variable] || "");
            
            res.send(data);
        }
        else {
            if (FileIO.existsSync(rootPath + path)) {
                res.sendFile(rootPath + path, { root: "./" });
            }
            else {
                res.status(404).send();
            }
        }
    });
}

/**
 * Fungsi bantuan untuk merapikan URL (SEO & Clean URL)
 * Contoh: mengubah 'website.com/admin/settings.html' menjadi 'website.com/admin/settings'
 * @param { string } path
 * @returns { {
 * refresh: boolean,
 * result: string
 * }} 
 */
function PrettifyPath(req) {
    if (req.filepath)
        return {
            refresh: false,
            result: req.filepath
        };

    let path = req.path;
    let refresh = false;

    // Bersihkan karakter slash ganda (//) di awal URL
    if (path.startsWith("//"))
        refresh = true;

    while (path.startsWith("/"))
        path = path.substring(1); // Buang slash pertama

    // Bersihkan slash ganda di tengah URL
    if (path.includes("//")) {
        refresh = true;
        path = path.replaceAll("//", "/");
    }

    // Buang slash di akhir URL (trailing slash)
    if (path.endsWith("/")) {
        refresh = true;
        path = path.substring(0, path.length - 1);
    }

    // Sembunyikan ekstensi file asli dari pengguna (Clean URL)
    if (path.endsWith(".html")) {
        refresh = true;
        path = path.substring(0, path.length - 5);
    }
    if (path.endsWith(".shtml")) {
        refresh = true;
        path = path.substring(0, path.length - 6);
    }
    
    return {
        refresh: refresh, // Jika true, server akan menyuruh browser mereload ulang ke URL baru
        result: path // URL hasil perapian yang akan dipakai server mencari file
    }
}

module.exports = Route;