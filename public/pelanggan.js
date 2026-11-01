
const tabelPelanggan = document.getElementById("tabelPelanggan");
const statusPelanggan = document.getElementById("statusPelanggan");
const inputCari = document.getElementById("cariPelanggan");

let semuaPelanggan = [];

// MENGAMBIL DATA PELANGGAN
async function tampilkanPelanggan() {
    statusPelanggan.textContent = "Memuat data pelanggan...";

    try {
        const response = await fetch("/api/pelanggan");

        if (!response.ok) {
            throw new Error("Gagal mengambil data pelanggan");
        }

        semuaPelanggan = await response.json();

        if (!Array.isArray(semuaPelanggan)) {
            throw new Error("Format data pelanggan tidak sesuai");
        }

        // MEMPERBARUI JUMLAH PELANGGAN
        document.getElementById("jumlahPelanggan").textContent =
            semuaPelanggan.length.toLocaleString("id-ID");

        tampilkanTabel(semuaPelanggan);

        statusPelanggan.textContent =
            `Menampilkan ${semuaPelanggan.length} pelanggan`;

    } catch (error) {
        console.error("Kesalahan data pelanggan:", error);

        tabelPelanggan.innerHTML = `
            <tr>
                <td colspan="5" class="empty-cell">
                    Gagal memuat data pelanggan.
                </td>
            </tr>
        `;

        statusPelanggan.textContent = "Gagal memuat data pelanggan.";
    }
}

// MENAMPILKAN DATA KE TABEL
function tampilkanTabel(data) {
    tabelPelanggan.innerHTML = "";

    if (data.length === 0) {
        tabelPelanggan.innerHTML = `
            <tr>
                <td colspan="5" class="empty-cell">
                    Tidak ada pelanggan yang ditemukan.
                </td>
            </tr>
        `;
        return;
    }

    data.forEach(item => {
        const baris = document.createElement("tr");

        const nilai = [
            item.id_pelanggan,
            item.nama_pelanggan,
            item.no_hp,
            item.alamat
        ];

        nilai.forEach(teks => {
            const kolom = document.createElement("td");
            kolom.textContent = teks ?? "-";
            baris.appendChild(kolom);
        });

        // KOLOM AKSI
        const kolomAksi = document.createElement("td");
        kolomAksi.className = "aksi-cell";

        // TOMBOL EDIT
        const tombolEdit = document.createElement("button");
        tombolEdit.textContent = "Edit";
        tombolEdit.type = "button";
        tombolEdit.className = "btn-edit";

        tombolEdit.addEventListener("click", () => {
            window.location.href =
                `/tambah-pelanggan.html?id=${encodeURIComponent(item.id_pelanggan)}`;
        });

        // TOMBOL HAPUS
        const tombolHapus = document.createElement("button");
        tombolHapus.textContent = "Hapus";
        tombolHapus.type = "button";
        tombolHapus.className = "btn-hapus";

        tombolHapus.addEventListener("click", () => {
            hapusPelanggan(item.id_pelanggan);
        });

        kolomAksi.appendChild(tombolEdit);
        kolomAksi.appendChild(tombolHapus);

        baris.appendChild(kolomAksi);
        tabelPelanggan.appendChild(baris);
    });
}

// MENGHAPUS PELANGGAN
async function hapusPelanggan(id) {
    const yakin = confirm(
        "Apakah kamu yakin ingin menghapus pelanggan ini?"
    );

    if (!yakin) return;

    try {
        const response = await fetch(`/api/pelanggan/${id}`, {
            method: "DELETE"
        });

        const hasil = await response.json();

        if (!response.ok) {
            throw new Error(
                hasil.message || "Gagal menghapus pelanggan"
            );
        }

        alert(hasil.message || "Pelanggan berhasil dihapus.");

        await tampilkanPelanggan();

    } catch (error) {
        console.error(error);
        alert(error.message);
    }
}

// PENCARIAN PELANGGAN
inputCari.addEventListener("input", function() {
    const kataKunci = this.value.trim().toLowerCase();

    const hasil = semuaPelanggan.filter(item => {
        const nama = String(item.nama_pelanggan || "").toLowerCase();
        const noHp = String(item.no_hp || "").toLowerCase();

        return nama.includes(kataKunci) ||
               noHp.includes(kataKunci);
    });

    tampilkanTabel(hasil);

    statusPelanggan.textContent =
        `Ditemukan ${hasil.length} pelanggan`;
});

// JALANKAN SAAT HALAMAN DIBUKA
tampilkanPelanggan();
