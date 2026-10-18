-- Akun default. 
-- IGNORE artinya jika sudah ada data dengan PK yang sama,
-- maka query akan diabaikan.
INSERT IGNORE INTO `User` 
    (`id_user`, `role`, `nama_user`, `nomor_ktp`, `nomor_telepon`, `username`, `password`, `id_cabang`, `alamat_user`) 
    VALUES 
        (
            1,
            'pegawai',
            'Akun Abadi',
            '3515072888230001',
            '08131438631',
            'root', 
            '9ad4a5f5c0c0e26076812882afc78884:f794ba8a0822fe13a77e2bad70ba479ad721da8a6f2c8c07d76ee28e3bc8cb6ba9a3240fb6dab0e56455fa3f2702ef0eb6db9392a2ad2018d4117f38dab77b72',
            1,
            NULL
        ),
        (
            67,
            'member',
            'Tri Baswedan',
            '1111222233334444',
            '08162401046',
            'tri', 
            '9ad4a5f5c0c0e26076812882afc78884:f794ba8a0822fe13a77e2bad70ba479ad721da8a6f2c8c07d76ee28e3bc8cb6ba9a3240fb6dab0e56455fa3f2702ef0eb6db9392a2ad2018d4117f38dab77b72',
            NULL,
            'Jl. Ciumbuleuit No. 94, Hegarmanah'
        )