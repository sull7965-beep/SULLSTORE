
const tabelRiwayat = document.getElementById("tabelRiwayat");
const statusRiwayat = document.getElementById("statusRiwayat");

let semuaTransaksi = [];


// FORMAT RUPIAH
function formatRupiah(angka) {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0
    }).format(Number(angka) || 0);
}


// FORMAT TANGGAL
function formatTanggal(tanggal) {
    if (!tanggal) return "-";

    return new Date(tanggal).toLocaleString("id-ID", {
        dateStyle: "medium",
        timeStyle: "short"
    });
}


// MENGAMBIL DATA RIWAYAT
async function muatRiwayat() {
    try {
        statusRiwayat.textContent = "Memuat data penjualan...";

        const response = await fetch("/api/riwayat-penjualan");

        if (!response.ok) {
            throw new Error("Gagal mengambil data riwayat penjualan.");
        }

        semuaTransaksi = await response.json();

        document.getElementById("jumlahTransaksi").textContent =
            semuaTransaksi.length;

        const total = semuaTransaksi.reduce(
            (jumlah, transaksi) =>
                jumlah + Number(transaksi.total_harga || 0),
            0
        );

        document.getElementById("totalPenjualan").textContent =
            formatRupiah(total);

        tampilkanRiwayat(semuaTransaksi);

        statusRiwayat.textContent =
            `Berhasil memuat ${semuaTransaksi.length} transaksi.`;

    } catch (error) {
        console.error("Kesalahan riwayat:", error);

        statusRiwayat.textContent = error.message;

        tabelRiwayat.innerHTML = `
            <tr>
                <td colspan="6">Gagal mengambil data penjualan.</td>
            </tr>
        `;
    }
}


// MENAMPILKAN DATA KE TABEL
function tampilkanRiwayat(data) {
    tabelRiwayat.innerHTML = "";

    if (data.length === 0) {
        tabelRiwayat.innerHTML = `
            <tr>
                <td colspan="6">Belum ada transaksi penjualan.</td>
            </tr>
        `;
        return;
    }

    data.forEach(transaksi => {
        const baris = document.createElement("tr");

        const kolom = [
            "TRX-" + transaksi.id_penjualan,
            formatTanggal(transaksi.tanggal_penjualan),
            transaksi.nama_pelanggan || "-",
            transaksi.daftar_barang || "-",
            formatRupiah(transaksi.total_harga)
        ];

        kolom.forEach(teks => {
            const td = document.createElement("td");
            td.textContent = teks;
            baris.appendChild(td);
        });

        // TOMBOL DETAIL
        const kolomAksi = document.createElement("td");
        const tombolDetail = document.createElement("button");

        tombolDetail.textContent = "Detail";
        tombolDetail.type = "button";

        tombolDetail.addEventListener("click", () => {
            tampilkanDetail(transaksi);
        });

        kolomAksi.appendChild(tombolDetail);
        baris.appendChild(kolomAksi);

        tabelRiwayat.appendChild(baris);
    });
}


// MELIHAT DETAIL TRANSAKSI
function tampilkanDetail(transaksi) {
    const daftar = transaksi.detail_barang || [];

    let isiDetail = daftar.map(item =>
        `${item.nama_barang} | ${item.jumlah} x ${formatRupiah(item.harga_satuan)} = ${formatRupiah(item.subtotal)}`
    ).join("\n");

    if (!isiDetail) {
        isiDetail = "Detail barang tidak tersedia.";
    }

    alert(
        "DETAIL TRANSAKSI TRX-" + transaksi.id_penjualan +
        "\nPelanggan: " + (transaksi.nama_pelanggan || "-") +
        "\nTanggal: " + formatTanggal(transaksi.tanggal_penjualan) +
        "\n\n" + isiDetail +
        "\n\nTotal: " + formatRupiah(transaksi.total_harga)
    );
}


// PENCARIAN TRANSAKSI
document.getElementById("cariTransaksi")
    .addEventListener("input", function() {

        const kataKunci = this.value.toLowerCase();

        const hasil = semuaTransaksi.filter(transaksi => {
            const nomor = String(transaksi.id_penjualan);
            const nama = (transaksi.nama_pelanggan || "").toLowerCase();

            return nomor.includes(kataKunci) ||
                ("trx-" + nomor).includes(kataKunci) ||
                nama.includes(kataKunci);
        });

        tampilkanRiwayat(hasil);
    });


// JALANKAN SAAT HALAMAN DIBUKA
muatRiwayat();
