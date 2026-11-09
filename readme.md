# Routing

Struktur setiap path dalam daftar di sini kurang lebih 
`/api/AAA/?BBB=CCC`
di mana: 
- `AAA` adalah nama tabel
- `BBB` adalah nama parameter untuk filtering data
- `CCC` adalah argumen parameter

Untuk parameter yang lebih dari satu, dipisah dengan simbol `&`.


## 1. Mobil
### 1.1. GET `/api/car/?search=...&type=...&available=...&branch=...`

**Input**
```ts
search: string // keyword untuk mencari berdasarkan nama mobil atau nama cabang
type: number // id_jenis_mobil
available: 0 | 1 // status_ketersediaan
branch: number // id_cabang
```
**Output**
```json
{
    plat_nomor: string,
    id_jenis_mobil: number,
    status_ketersediaan: "tersedia" | "disewa",
    biaya_sewa_harian: money,
    biaya_denda_harian: money,
    id_cabang: number
}
```

### 1.2. POST `/api/car/`

**Input**
```json
{
    plat_nomor: string,
    id_jenis_mobil: number,
    status_ketersediaan: "tersedia" | "disewa",
    biaya_sewa_harian: money,
    biaya_denda_harian: money,
    id_cabang: number
}
```
**Output**
```json
boolean // true jika berhasil, false jika gagal
```

### 1.3. PUT `/api/car/`

**Input**
```json
{
    plat_nomor: string,
    id_jenis_mobil: number | null,
    status_ketersediaan: "tersedia" | "disewa" | null,
    biaya_sewa_harian: money | null,
    biaya_denda_harian: money | null,
    id_cabang: number | null
}
```
**Output**
```json
boolean // true jika berhasil, false jika gagal
```

### 1.4. DELETE `/api/car/`

**Input**
```json
{
    plat_nomor: string
}
```
**Output**
```json
boolean // true jika berhasil, false jika gagal
```



## 2. Cabang
### 2.1. GET `/api/branch/?search={string}&category={number}&branch={number}`

**Input**
```json
-
```
**Output**
```json
{
    id_cabang: number,
    nama_cabang: string,
    alamat: string
}
```

### 2.2. POST `/api/branch/`

**Input**
```json
{
    id_cabang: number,
    nama_cabang: string,
    alamat: string
}
```
**Output**
```json
boolean // true jika berhasil, false jika gagal
```

### 2.3. PUT `/api/branch/`

**Input**
```json
{
    id_cabang: number,
    nama_cabang: string | null,
    alamat: string | null
}
```
**Output**
```json
boolean // true jika berhasil, false jika gagal
```

### 2.4. DELETE `/api/car/`

**Input**
```json
{
    id_cabang: number
}
```
**Output**
```json
boolean // true jika berhasil, false jika gagal
```




## 3. Pegawai
### 3.1. GET `/api/staff/?search={string}&branch={number}`

**Input**
```ts
search: string // keyword untuk mencari berdasarkan nama pegawai, nama cabang, atau username
branch: number // id_cabang
```
**Output**
```json
{
    id_pegawai: number,
    nama_pegawai: string,
    id_cabang: number,
    username: string
}
```

### 3.2. POST `/api/staff/`

**Input**
```json
{
    id_pegawai: number,
    nama_pegawai: string,
    id_cabang: number,
    username: string,
    password: string
}
```
**Output**
```json
boolean // true jika berhasil, false jika gagal
```

### 3.3. PUT `/api/staff/`

**Input**
```json
{
    id_pegawai: number,
    nama_pegawai: string | null,
    id_cabang: number | null,
    username: string | null,
    password: string | null
}
```
**Output**
```json
boolean // true jika berhasil, false jika gagal
```

### 3.4. DELETE `/api/staff/`

**Input**
```json
{
    id_pegawai: number
}
```
**Output**
```json
boolean // true jika berhasil, false jika gagal
```





## 4. Member
### 4.1. GET `/api/member/?search={string}&branch={number}`

**Input**
```ts
search: string // keyword untuk mencari berdasarkan nama member atau alamat
```
**Output**
```json
{
    id_member: number,
    nama_member: string,
    nomor_ktp: string,
    nomor_telepon: string,
    alamat: string
}
```

### 4.2. POST `/api/member/`

**Input**
```json
{
    id_member: number,
    nama_member: string,
    nomor_ktp: string,
    nomor_telepon: string,
    alamat: string
}
```
**Output**
```json
boolean // true jika berhasil, false jika gagal
```

### 4.3. PUT `/api/member/`

**Input**
```json
{
    id_member: number,
    nama_member: string | null,
    nomor_ktp: string | null,
    nomor_telepon: string | null,
    alamat: string | null
}
```
**Output**
```json
boolean // true jika berhasil, false jika gagal
```

### 4.4. DELETE `/api/member/`

**Input**
```json
{
    id_member: number
}
```
**Output**
```json
boolean // true jika berhasil, false jika gagal
```






## 5. Transaksi
### 5.1. GET `/api/transaction/?search={string}&branch={number}`

**Input**
```ts
search: string // keyword untuk mencari berdasarkan nama pegawai, nama cabang, atau username
branch: number // id_cabang
```
**Output**
```json
{
    id_transaksi: number,
    id_member: number,
    id_pegawai: number,
    plat_nomor: string,
    tanggal_waktu_pinjam: datetime,
    tanggal_waktu_rencana_kembali: datetime,
    tanggal_waktu_kembali_aktual: datetime,
    total_biaya: money,
    total_denda: money
}
```

### 5.2. POST `/api/transaction/`

**Input**
```json
{
    id_transaksi: number,
    id_member: number,
    id_pegawai: number,
    plat_nomor: string,
    tanggal_waktu_pinjam: datetime,
    tanggal_waktu_rencana_kembali: datetime,
    tanggal_waktu_kembali_aktual: datetime
    // total_biaya dan total_denda tidak perlu dimodifikasi
    // karena menggunakan trigger
}
```
**Output**
```json
boolean // true jika berhasil, false jika gagal
```

### 5.3. PUT `/api/transaction/`

**Input**
```json
{
    id_transaksi: number,
    id_member: number,
    id_pegawai: number,
    plat_nomor: string,
    tanggal_waktu_pinjam: datetime,
    tanggal_waktu_rencana_kembali: datetime | null,
    tanggal_waktu_kembali_aktual: datetime | null
    // total_biaya dan total_denda tidak perlu dimodifikasi
    // karena menggunakan trigger
}
```
**Output**
```json
boolean // true jika berhasil, false jika gagal
```

### 5.4. DELETE `/api/transaction/`

**Input**
```json
{
    id_transaksi: number
}
```
**Output**
```json
boolean // true jika berhasil, false jika gagal
```

