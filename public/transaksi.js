
const pilihPelanggan = document.getElementById("pilihPelanggan");
const pilihBarang = document.getElementById("pilihBarang");
const jumlahBarang = document.getElementById("jumlahBarang");
const tabelKeranjang = document.getElementById("tabelKeranjang");
const totalBelanja = document.getElementById("totalBelanja");

const tombolTambah = document.getElementById("tombolTambah");
const tombolSimpan = document.getElementById("tombolSimpanTransaksi");

let daftarBarang = [];
let keranjang = [];


// FORMAT RUPIAH
function formatRupiah(angka) {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0
    }).format(Number(angka) || 0);
}


// MENGAMBIL DATA DARI DATABASE
async function muatDataTransaksi() {
    try {
        const response = await fetch("/api/transaksi/data");

        if (!response.ok) {
            throw new Error("Gagal mengambil data transaksi");
        }

        const data = await response.json();

        daftarBarang = data.barang || [];

        // TAMPILKAN PELANGGAN
        pilihPelanggan.innerHTML =
            '<option value="">-- Pilih Pelanggan --</option>';

        (data.pelanggan || []).forEach(pelanggan => {
            const option = document.createElement("option");

            option.value = pelanggan.id_pelanggan;
            option.textContent = pelanggan.nama_pelanggan;

            pilihPelanggan.appendChild(option);
        });

        // TAMPILKAN BARANG
        pilihBarang.innerHTML =
            '<option value="">-- Pilih Barang --</option>';

        daftarBarang.forEach(barang => {
            const option = document.createElement("option");

            option.value = barang.id_barang;

            option.textContent =
                `${barang.nama_barang} - ${formatRupiah(barang.harga)} (Stok: ${barang.stok})`;

            option.disabled = Number(barang.stok) <= 0;

            pilihBarang.appendChild(option);
        });

        document.getElementById("statusBarang").textContent =
            `${data.barang.length} barang tersedia`;

    } catch (error) {
        console.error(error);

        document.getElementById("statusBarang").textContent =
            error.message;

        pilihPelanggan.innerHTML =
            '<option value="">Gagal memuat pelanggan</option>';

        pilihBarang.innerHTML =
            '<option value="">Gagal memuat barang</option>';
    }
}


// MENAMBAHKAN BARANG KE KERANJANG
tombolTambah.addEventListener("click", function() {

    const idBarang = Number(pilihBarang.value);
    const jumlah = Number(jumlahBarang.value);

    if (!idBarang) {
        alert("Silakan pilih barang terlebih dahulu.");
        return;
    }

    if (!Number.isInteger(jumlah) || jumlah <= 0) {
        alert("Jumlah barang harus berupa bilangan bulat lebih dari 0.");
        return;
    }

    const barang = daftarBarang.find(
        item => Number(item.id_barang) === idBarang
    );

    if (!barang) {
        alert("Barang tidak ditemukan.");
        return;
    }

    const barangDiKeranjang = keranjang.find(
        item => Number(item.id_barang) === idBarang
    );

    const jumlahSaatIni = barangDiKeranjang
        ? Number(barangDiKeranjang.jumlah)
        : 0;

    if (jumlahSaatIni + jumlah > Number(barang.stok)) {
        alert("Jumlah melebihi stok yang tersedia.");
        return;
    }

    if (barangDiKeranjang) {
        barangDiKeranjang.jumlah += jumlah;
    } else {
        keranjang.push({
            id_barang: barang.id_barang,
            nama_barang: barang.nama_barang,
            harga: Number(barang.harga),
            jumlah: jumlah
        });
    }

    jumlahBarang.value = 1;
    pilihBarang.value = "";

    tampilkanKeranjang();
});


// MENAMPILKAN KERANJANG
function tampilkanKeranjang() {
    tabelKeranjang.innerHTML = "";

    if (keranjang.length === 0) {
        tabelKeranjang.innerHTML = `
            <tr>
                <td colspan="5" class="keranjang-kosong">
                    Keranjang masih kosong.
                </td>
            </tr>
        `;

        totalBelanja.textContent = formatRupiah(0);
        return;
    }

    let total = 0;

    keranjang.forEach((item, index) => {
        const subtotal = item.harga * item.jumlah;

        total += subtotal;

        const baris = document.createElement("tr");

        const nilai = [
            item.nama_barang,
            formatRupiah(item.harga),
            item.jumlah,
            formatRupiah(subtotal)
        ];

        nilai.forEach(teks => {
            const kolom = document.createElement("td");
            kolom.textContent = teks;
            baris.appendChild(kolom);
        });

        const kolomAksi = document.createElement("td");
        kolomAksi.className = "aksi-transaksi";

        const tombolHapus = document.createElement("button");
        tombolHapus.textContent = "Hapus";
        tombolHapus.type = "button";
        tombolHapus.className = "btn-hapus-keranjang";

        tombolHapus.addEventListener("click", () => {
            keranjang.splice(index, 1);
            tampilkanKeranjang();
        });

        kolomAksi.appendChild(tombolHapus);
        baris.appendChild(kolomAksi);

        tabelKeranjang.appendChild(baris);
    });

    totalBelanja.textContent = formatRupiah(total);
}


// MENYIMPAN TRANSAKSI
tombolSimpan.addEventListener("click", async function() {

    const idPelanggan = pilihPelanggan.value;

    if (!idPelanggan) {
        alert("Silakan pilih pelanggan.");
        return;
    }

    if (keranjang.length === 0) {
        alert("Keranjang belanja masih kosong.");
        return;
    }

    const yakin = confirm(
        "Apakah kamu yakin ingin menyimpan transaksi ini?"
    );

    if (!yakin) return;

    const dataTransaksi = {
        id_pelanggan: idPelanggan,
        items: keranjang.map(item => ({
            id_barang: item.id_barang,
            jumlah: item.jumlah
        }))
    };

    tombolSimpan.disabled = true;
    tombolSimpan.textContent = "Menyimpan...";

    try {
        const response = await fetch("/api/transaksi", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(dataTransaksi)
        });

        const hasil = await response.json();

        if (!response.ok) {
            throw new Error(
                hasil.message || "Gagal menyimpan transaksi"
            );
        }

        alert(
            (hasil.message || "Transaksi berhasil disimpan.") +
            "\nNomor Transaksi: " + hasil.id_penjualan +
            "\nTotal: " + formatRupiah(hasil.total_harga)
        );

        // KOSONGKAN KERANJANG
        keranjang = [];
        tampilkanKeranjang();

        // PERBARUI DATA STOK
        await muatDataTransaksi();

        pilihPelanggan.value = "";

        document.getElementById("statusTransaksi").textContent =
            "Transaksi berhasil disimpan.";

    } catch (error) {
        console.error(error);

        document.getElementById("statusTransaksi").textContent =
            error.message;

        alert(error.message);

    } finally {
        tombolSimpan.disabled = false;
        tombolSimpan.textContent = "Simpan Transaksi";
    }
});


// JALANKAN SAAT HALAMAN DIBUKA
muatDataTransaksi();
tampilkanKeranjang();
