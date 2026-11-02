
const express = require("express");
const db = require("./database");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.use(express.static(path.join(__dirname, "public")));




app.get("/api/dashboard", async (req, res) => {
    try {
        const result = await db.query(`
            SELECT
                (SELECT COUNT(*) FROM barang) AS total_barang,

                (SELECT COUNT(*) FROM supplier) AS total_supplier,

                (SELECT COUNT(*) FROM penjualan) AS total_transaksi,

                (SELECT COALESCE(SUM(jumlah_bayar), 0)
                 FROM pembayaran
                 WHERE status_pembayaran = 'berhasil')
                 AS total_pendapatan
        `);

        res.json(result.rows[0]);

    } catch (error) {
        console.error("Dashboard error:", error);
        res.status(500).json({
            message: "Gagal mengambil data dashboard"
        });
    }
});



// =================================
// 1. API DAFTAR BARANG
// =================================

app.get("/api/barang", async (req, res) => {
    try {
        const result = await db.query(`
            SELECT
                id_barang,
                kode_barang,
                nama_barang,
                harga,
                stok,
                satuan
            FROM barang
            ORDER BY id_barang
        `);

        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Gagal mengambil barang" });
    }
});

// =================================
// 2. API DASHBOARD
// =================================

app.get("/api/dashboard", async (req, res) => {
    try {
        const result = await db.query(`
            SELECT
                (SELECT COUNT(*) FROM barang) AS total_barang,
                (SELECT COUNT(*) FROM supplier) AS total_supplier,
                (SELECT COUNT(*) FROM penjualan) AS total_transaksi,
                (
                    SELECT COALESCE(SUM(jumlah_bayar), 0)
                    FROM pembayaran
                    WHERE status_pembayaran = 'berhasil'
                ) AS total_pemasukan
        `);

        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Gagal mengambil dashboard" });
    }
});

// =================================
// 3. API CHECKOUT / PEMBAYARAN
// =================================

app.post("/api/checkout", async (req, res) => {
    const { nama_pelanggan, no_hp, alamat, items, metode_pembayaran } = req.body;

    if (
        !nama_pelanggan ||
        !Array.isArray(items) ||
        items.length === 0 ||
        !["tunai", "transfer_bank", "qris"].includes(metode_pembayaran)
    ) {
        return res.status(400).json({
            message: "Data checkout tidak lengkap"
        });
    }

    const client = await db.connect();

    try {
        await client.query("BEGIN");

        let total = 0;
        const barangDibeli = [];

        // Periksa stok dan harga dari database
        for (const item of items) {
            const id = Number(item.id_barang);
            const jumlah = Number(item.jumlah);

            if (
                !Number.isSafeInteger(id) ||
                !Number.isSafeInteger(jumlah) ||
                id <= 0 ||
                jumlah <= 0
            ) {
                throw new Error("Barang atau jumlah tidak valid");
            }

            const result = await client.query(
                `SELECT * FROM barang
                 WHERE id_barang = $1
                 FOR UPDATE`,
                [id]
            );

            if (result.rows.length === 0) {
                throw new Error("Barang tidak ditemukan");
            }

            const barang = result.rows[0];

            if (barang.stok < jumlah) {
                throw new Error(
                    "Stok tidak cukup untuk " + barang.nama_barang
                );
            }

            const harga = Number(barang.harga);
            const subtotal = harga * jumlah;

            total += subtotal;

            barangDibeli.push({
                id_barang: id,
                jumlah,
                harga
            });
        }

        // Simpan pelanggan
        const pelanggan = await client.query(
            `INSERT INTO pelanggan (nama_pelanggan, no_hp, alamat)
             VALUES ($1, $2, $3)
             RETURNING id_pelanggan`,
            [nama_pelanggan, no_hp || null, alamat || null]
        );

        // Simpan penjualan
        const penjualan = await client.query(
            `INSERT INTO penjualan (id_pelanggan, total_harga)
             VALUES ($1, $2)
             RETURNING id_penjualan`,
            [pelanggan.rows[0].id_pelanggan, total]
        );

        const idPenjualan = penjualan.rows[0].id_penjualan;

        // Simpan detail dan kurangi stok
        for (const item of barangDibeli) {
            await client.query(
                `INSERT INTO detail_penjualan
                 (id_penjualan, id_barang, jumlah, harga_satuan)
                 VALUES ($1, $2, $3, $4)`,
                [idPenjualan, item.id_barang, item.jumlah, item.harga]
            );

            await client.query(
                `UPDATE barang
                 SET stok = stok - $1
                 WHERE id_barang = $2`,
                [item.jumlah, item.id_barang]
            );
        }

        // Pembayaran tunai dianggap diterima saat checkout.
        // QRIS dan transfer menunggu verifikasi pembayaran.
        const status = metode_pembayaran === "tunai"
            ? "berhasil"
            : "menunggu";

        await client.query(
            `INSERT INTO pembayaran
             (id_penjualan, metode_pembayaran, jumlah_bayar,
              status_pembayaran, keterangan)
             VALUES ($1, $2, $3, $4, $5)`,
            [
                idPenjualan,
                metode_pembayaran,
                total,
                status,
                metode_pembayaran === "tunai"
                    ? "Pembayaran tunai diterima"
                    : "Menunggu verifikasi pembayaran"
            ]
        );

        await client.query("COMMIT");

        res.json({
            message: "Transaksi berhasil dibuat",
            id_penjualan: idPenjualan,
            total: total,
            status_pembayaran: status
        });

    } catch (error) {
        await client.query("ROLLBACK");
        console.error(error);

        res.status(400).json({
            message: error.message
        });
    } finally {
        client.release();
    }
});

// =================================
// 4. API RIWAYAT PEMBAYARAN
// =================================

app.get("/api/riwayat", async (req, res) => {
    try {
        const result = await db.query(`
            SELECT
                b.id_pembayaran,
                p.id_penjualan,
                pl.nama_pelanggan,
                b.metode_pembayaran,
                b.jumlah_bayar,
                b.status_pembayaran,
                b.tanggal_pembayaran
            FROM pembayaran b
            JOIN penjualan p
                ON b.id_penjualan = p.id_penjualan
            JOIN pelanggan pl
                ON p.id_pelanggan = pl.id_pelanggan
            ORDER BY b.tanggal_pembayaran DESC
        `);

        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Gagal mengambil riwayat" });
    }
});




// MENAMPILKAN SEMUA BARANG
app.get("/api/barang", async (req, res) => {
    try {
        const result = await db.query(`
            SELECT * FROM barang
            ORDER BY id_barang ASC
        `);

        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Gagal mengambil data barang" });
    }
});


// MENAMBAHKAN BARANG
app.post("/api/barang", async (req, res) => {
    try {
        const {
            kode_barang,
            nama_barang,
            harga,
            stok,
            satuan,
            id_supplier
        } = req.body;

        const result = await db.query(`
            INSERT INTO barang
            (kode_barang, nama_barang, harga, stok, satuan, id_supplier)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `, [
            kode_barang,
            nama_barang,
            harga,
            stok,
            satuan,
            id_supplier
        ]);

        res.status(201).json({
            message: "Barang berhasil ditambahkan",
            data: result.rows[0]
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Gagal menambahkan barang. Periksa kode barang dan ID supplier."
        });
    }
});


// MENGEDIT BARANG
app.put("/api/barang/:id", async (req, res) => {
    try {
        const {
            kode_barang,
            nama_barang,
            harga,
            stok,
            satuan,
            id_supplier
        } = req.body;

        const result = await db.query(`
            UPDATE barang
            SET
                kode_barang = $1,
                nama_barang = $2,
                harga = $3,
                stok = $4,
                satuan = $5,
                id_supplier = $6
            WHERE id_barang = $7
            RETURNING *
        `, [
            kode_barang,
            nama_barang,
            harga,
            stok,
            satuan,
            id_supplier,
            req.params.id
        ]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Barang tidak ditemukan" });
        }

        res.json({
            message: "Barang berhasil diperbarui",
            data: result.rows[0]
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Gagal memperbarui barang" });
    }
});


// MENGHAPUS BARANG
app.delete("/api/barang/:id", async (req, res) => {
    try {
        const result = await db.query(`
            DELETE FROM barang
            WHERE id_barang = $1
            RETURNING *
        `, [req.params.id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Barang tidak ditemukan" });
        }

        res.json({ message: "Barang berhasil dihapus" });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Barang tidak dapat dihapus. Mungkin sudah digunakan dalam transaksi."
        });
    }
});







// MENAMPILKAN SEMUA PELANGGAN
app.get("/api/pelanggan", async (req, res) => {
    try {
        const result = await db.query(`
            SELECT *
            FROM pelanggan
            ORDER BY id_pelanggan ASC
        `);

        res.json(result.rows);

    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Gagal mengambil data pelanggan"
        });
    }
});


// MENAMBAHKAN PELANGGAN
app.post("/api/pelanggan", async (req, res) => {
    try {
        const { nama_pelanggan, no_hp, alamat } = req.body;

        const result = await db.query(`
            INSERT INTO pelanggan
            (nama_pelanggan, no_hp, alamat)
            VALUES ($1, $2, $3)
            RETURNING *
        `, [nama_pelanggan, no_hp, alamat]);

        res.status(201).json({
            message: "Pelanggan berhasil ditambahkan",
            data: result.rows[0]
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Gagal menambahkan pelanggan"
        });
    }
});


// MENGEDIT PELANGGAN
app.put("/api/pelanggan/:id", async (req, res) => {
    try {
        const { nama_pelanggan, no_hp, alamat } = req.body;

        const result = await db.query(`
            UPDATE pelanggan
            SET
                nama_pelanggan = $1,
                no_hp = $2,
                alamat = $3
            WHERE id_pelanggan = $4
            RETURNING *
        `, [nama_pelanggan, no_hp, alamat, req.params.id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Pelanggan tidak ditemukan"
            });
        }

        res.json({
            message: "Pelanggan berhasil diperbarui",
            data: result.rows[0]
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Gagal memperbarui pelanggan"
        });
    }
});


// MENGHAPUS PELANGGAN
app.delete("/api/pelanggan/:id", async (req, res) => {
    try {
        const result = await db.query(`
            DELETE FROM pelanggan
            WHERE id_pelanggan = $1
            RETURNING *
        `, [req.params.id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Pelanggan tidak ditemukan"
            });
        }

        res.json({
            message: "Pelanggan berhasil dihapus"
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Pelanggan tidak dapat dihapus. Mungkin sudah memiliki transaksi penjualan."
        });
    }
});



// MENGAMBIL DATA PELANGGAN DAN BARANG UNTUK KASIR
app.get("/api/transaksi/data", async (req, res) => {
    try {
        const pelanggan = await db.query(`
            SELECT id_pelanggan, nama_pelanggan
            FROM pelanggan
            ORDER BY nama_pelanggan ASC
        `);

        const barang = await db.query(`
            SELECT id_barang, kode_barang, nama_barang, harga, stok, satuan
            FROM barang
            ORDER BY nama_barang ASC
        `);

        res.json({
            pelanggan: pelanggan.rows,
            barang: barang.rows
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Gagal mengambil data transaksi"
        });
    }
});


// MENYIMPAN TRANSAKSI PENJUALAN
app.post("/api/transaksi", async (req, res) => {
    const client = await db.connect();

    try {
        const { id_pelanggan, items } = req.body;

        if (!id_pelanggan || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                message: "Pelanggan dan barang harus dipilih."
            });
        }

        await client.query("BEGIN");

        // PERIKSA PELANGGAN
        const pelanggan = await client.query(`
            SELECT id_pelanggan
            FROM pelanggan
            WHERE id_pelanggan = $1
        `, [id_pelanggan]);

        if (pelanggan.rows.length === 0) {
            throw new Error("Pelanggan tidak ditemukan.");
        }

        let totalHarga = 0;
        const detailBarang = [];

        // PERIKSA STOK DAN HARGA BARANG
        for (const item of items) {
            const jumlah = Number(item.jumlah);
            const idBarang = Number(item.id_barang);

            if (!Number.isInteger(jumlah) || jumlah <= 0 ||
                !Number.isInteger(idBarang) || idBarang <= 0) {
                throw new Error("Data barang atau jumlah tidak valid.");
            }

            const hasilBarang = await client.query(`
                SELECT id_barang, nama_barang, harga, stok
                FROM barang
                WHERE id_barang = $1
                FOR UPDATE
            `, [idBarang]);

            if (hasilBarang.rows.length === 0) {
                throw new Error("Barang tidak ditemukan.");
            }

            const barang = hasilBarang.rows[0];

            if (Number(barang.stok) < jumlah) {
                throw new Error(
                    `Stok ${barang.nama_barang} tidak mencukupi. Stok tersedia: ${barang.stok}`
                );
            }

            const harga = Number(barang.harga);
            const subtotal = harga * jumlah;

            totalHarga += subtotal;

            detailBarang.push({
                id_barang: idBarang,
                jumlah: jumlah,
                harga_satuan: harga,
                subtotal: subtotal
            });
        }

        // SIMPAN TRANSAKSI UTAMA
        const hasilPenjualan = await client.query(`
            INSERT INTO penjualan
            (id_pelanggan, tanggal_penjualan, total_harga)
            VALUES ($1, NOW(), $2)
            RETURNING id_penjualan
        `, [id_pelanggan, totalHarga]);

        const idPenjualan = hasilPenjualan.rows[0].id_penjualan;

        // SIMPAN DETAIL DAN KURANGI STOK
        for (const item of detailBarang) {
            await client.query(`
                INSERT INTO detail_penjualan
                (id_penjualan, id_barang, jumlah, harga_satuan)
                VALUES ($1, $2, $3, $4)
            `, [
                idPenjualan,
                item.id_barang,
                item.jumlah,
                item.harga_satuan
            ]);

            await client.query(`
                UPDATE barang
                SET stok = stok - $1
                WHERE id_barang = $2
            `, [item.jumlah, item.id_barang]);
        }

        await client.query("COMMIT");

        res.status(201).json({
            message: "Transaksi berhasil disimpan.",
            id_penjualan: idPenjualan,
            total_harga: totalHarga
        });

    } catch (error) {
        await client.query("ROLLBACK");

        console.error(error);

        res.status(400).json({
            message: error.message || "Transaksi gagal disimpan."
        });

    } finally {
        client.release();
    }
});






// API RIWAYAT PENJUALAN
app.get("/api/riwayat-penjualan", async (req, res) => {
    try {
        const result = await db.query(`
            SELECT
                p.id_penjualan,
                p.tanggal_penjualan,
                p.total_harga,
                pl.nama_pelanggan,

                COALESCE(
                    json_agg(
                        json_build_object(
                            'nama_barang', b.nama_barang,
                            'jumlah', dp.jumlah,
                            'harga_satuan', dp.harga_satuan,
                            'subtotal', dp.subtotal
                        )
                    ) FILTER (WHERE dp.id_detail IS NOT NULL),
                    '[]'
                ) AS detail_barang,

                COALESCE(
                    string_agg(
                        b.nama_barang || ' (' || dp.jumlah || ')',
                        ', '
                    ),
                    '-'
                ) AS daftar_barang

            FROM penjualan p

            LEFT JOIN pelanggan pl
                ON pl.id_pelanggan = p.id_pelanggan

            LEFT JOIN detail_penjualan dp
                ON dp.id_penjualan = p.id_penjualan

            LEFT JOIN barang b
                ON b.id_barang = dp.id_barang

            GROUP BY
                p.id_penjualan,
                p.tanggal_penjualan,
                p.total_harga,
                pl.nama_pelanggan

            ORDER BY p.tanggal_penjualan DESC,
                     p.id_penjualan DESC
        `);

        res.json(result.rows);

    } catch (error) {
        console.error("Kesalahan API riwayat:", error);

        res.status(500).json({
            message: "Gagal mengambil riwayat penjualan"
        });
    }
});







// =================================
// 5. MENJALANKAN SERVER
// =================================

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Website berjalan di http://localhost:${PORT}`);
    console.log(`Akses melalui HP: http://10.129.97.104:${PORT}`);
});
