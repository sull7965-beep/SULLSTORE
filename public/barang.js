
const tabelBarang = document.getElementById("tabelBarang");
const statusBarang = document.getElementById("statusBarang");
const inputCari = document.getElementById("cariBarang");

let semuaBarang = [];

function formatRupiah(angka) {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0
    }).format(Number(angka) || 0);
}

// MENGAMBIL DATA BARANG DARI DATABASE
async function tampilkanBarang() {
    statusBarang.textContent = "Memuat data barang...";

    try {
        const response = await fetch("/api/barang");

        if (!response.ok) {
            throw new Error("Gagal mengambil data barang dari server.");
        }

        semuaBarang = await response.json();

        if (!Array.isArray(semuaBarang)) {
            throw new Error("Format data barang tidak sesuai.");
        }

        perbaruiRingkasan();
        tampilkanTabel(semuaBarang);

        statusBarang.textContent =
            `Menampilkan ${semuaBarang.length} data barang`;

    } catch (error) {
        console.error("Kesalahan data barang:", error);

        tabelBarang.innerHTML = `
            <tr>
                <td colspan="8" class="empty-cell">
                    Gagal memuat data barang. Periksa koneksi server.
                </td>
            </tr>
        `;

        statusBarang.textContent = "Gagal memuat data barang.";
    }
}

// MEMPERBARUI KARTU RINGKASAN
function perbaruiRingkasan() {
    const jumlahJenis = semuaBarang.length;

    const jumlahStok = semuaBarang.reduce((total, item) => {
        return total + (Number(item.stok) || 0);
    }, 0);

    document.getElementById("jumlahJenisBarang").textContent =
        jumlahJenis.toLocaleString("id-ID");

    document.getElementById("jumlahStokBarang").textContent =
        jumlahStok.toLocaleString("id-ID");
}

// MENAMPILKAN DATA KE TABEL
function tampilkanTabel(data) {
    tabelBarang.innerHTML = "";

    if (data.length === 0) {
        tabelBarang.innerHTML = `
            <tr>
                <td colspan="8" class="empty-cell">
                    Tidak ada data barang yang ditemukan.
                </td>
            </tr>
        `;
        return;
    }

    data.forEach(item => {
        const baris = document.createElement("tr");

        const nilai = [
            item.id_barang,
            item.kode_barang,
            item.nama_barang,
            formatRupiah(item.harga),
            item.stok,
            item.satuan,
            item.nama_supplier || item.id_supplier
        ];

        nilai.forEach((teks, index) => {
            const kolom = document.createElement("td");
            kolom.textContent = teks ?? "-";

            if (index === 4) {
                const stok = Number(item.stok) || 0;
                kolom.innerHTML = "";

                const labelStok = document.createElement("span");
                labelStok.className =
                    stok <= 5 ? "stok-badge stok-rendah" : "stok-badge stok-aman";
                labelStok.textContent = stok.toLocaleString("id-ID");

                kolom.appendChild(labelStok);
            }

            baris.appendChild(kolom);
        });

        // KOLOM AKSI
        const kolomAksi = document.createElement("td");
        kolomAksi.className = "aksi-cell";

        const tombolEdit = document.createElement("button");
        tombolEdit.type = "button";
        tombolEdit.textContent = "Edit";
        tombolEdit.className = "btn-edit";

        tombolEdit.addEventListener("click", () => {
            window.location.href =
                `/tambah-barang.html?id=${encodeURIComponent(item.id_barang)}`;
        });

        const tombolHapus = document.createElement("button");
        tombolHapus.type = "button";
        tombolHapus.textContent = "Hapus";
        tombolHapus.className = "btn-hapus";

        tombolHapus.addEventListener("click", () => {
            hapusBarang(item.id_barang);
        });

        kolomAksi.appendChild(tombolEdit);
        kolomAksi.appendChild(tombolHapus);

        baris.appendChild(kolomAksi);
        tabelBarang.appendChild(baris);
    });
}

// MENGHAPUS BARANG
async function hapusBarang(id) {
    const yakin = confirm(
        "Apakah kamu yakin ingin menghapus barang ini?"
    );

    if (!yakin) return;

    try {
        const response = await fetch(`/api/barang/${id}`, {
            method: "DELETE"
        });

        const hasil = await response.json();

        if (!response.ok) {
            throw new Error(
                hasil.message || "Gagal menghapus barang."
            );
        }

        alert(hasil.message || "Barang berhasil dihapus.");
        await tampilkanBarang();

    } catch (error) {
        console.error(error);
        alert(error.message);
    }
}

// PENCARIAN BARANG
inputCari.addEventListener("input", function () {
    const kataKunci = this.value.trim().toLowerCase();

    const hasil = semuaBarang.filter(item => {
        const nama = String(item.nama_barang || "").toLowerCase();
        const kode = String(item.kode_barang || "").toLowerCase();

        return nama.includes(kataKunci) ||
               kode.includes(kataKunci);
    });

    tampilkanTabel(hasil);

    statusBarang.textContent =
        `Ditemukan ${hasil.length} barang`;
});

// JALANKAN SAAT HALAMAN DIBUKA
tampilkanBarang();
