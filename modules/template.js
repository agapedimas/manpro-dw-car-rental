// Memanggil modul bawaan Node.js untuk operasi input/output sistem file fisik
const FileIO = require("fs");
// Memanggil modul bawaan Node.js untuk memanipulasi dan mengekstrak path/direktori file
const Path = require("path");

// Mendefinisikan path lokasi folder tempat potongan desain UI (template) disimpan
const Path_Template = "./src/templates/";

/**
 * Fungsi inisialisasi untuk memuat seluruh komponen antarmuka ke dalam memori utama (RAM).
 * Fungsi ini dipanggil satu kali saja di file root 'index.js' saat server mulai berjalan (Configure).
 */
async function Initialize()
{
	// Membaca isi direktori template secara sinkron.
    // Mengembalikan array berisi nama-nama file (misal: ["header.html", "footer.html", "navbar.html"])
	const components = FileIO.readdirSync(Path_Template);

	// Melakukan iterasi (looping) pada setiap file yang ditemukan di folder tersebut
	for (let component of components)
	{
		// Mengekstrak nama file tanpa ekstensi (Contoh: "header.html" -> "header")
        // Nama ini nantinya akan menjadi atribut kunci (Key) di dalam objek Data
		let name = Path.parse(component).name;

		// Membaca isi kode HTML mentah dari dalam file tersebut dalam format string (utf-8)
		let value = FileIO.readFileSync(Path_Template + component, { encoding: "utf8" });
		
		// Menyimpan kode HTML tersebut ke dalam objek global Data (Memori Cache)
        // Nantinya, potongan HTML ini bisa disisipkan ke halaman utama menggunakan Template Engine di route.js
		Data[name] = value.toString();
	}
}

/**
 * Objek Penampung (Cache Memory)
 * Menyimpan seluruh teks HTML komponen web agar server tidak perlu melakukan operasi I/O ke harddisk terus-menerus.
 */
const Data = 
{
	// Nilai default untuk konfigurasi bahasa pada tag HTML
    Configuration: "lang='id'"
    
    // Setelah fungsi Initialize() berjalan, objek ini akan secara dinamis bertambah isinya menjadi seperti:
    // header: "<nav>...</nav>",
    // footer: "<footer>...</footer>",
    // dll.
}

// Mengekspor objek Data dan fungsi Initialize agar dapat dipanggil dari luar modul
module.exports = 
{
	Data: Data,
	Initialize: Initialize
};