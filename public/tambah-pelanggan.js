
const formPelanggan = document.getElementById("formPelanggan");
const statusForm = document.getElementById("statusForm");
const tombolSimpan = document.getElementById("tombolSimpan");

// MEMBACA ID DARI URL
const parameterURL = new URLSearchParams(window.location.search);
const idEdit = parameterURL.get("id");

// MENGAMBIL DATA JIKA SEDANG EDIT
async function ambilDataEdit() {
    if (!idEdit) return;

    tombolSimpan.disabled = true;
    statusForm.textContent = "Memuat data pelanggan...";

    try {
        const response = await fetch("/api/pelanggan");

        if (!response.ok) {
            throw new Error("Gagal mengambil data pelanggan");
        }

        const semuaPelanggan = await response.json();

        const pelanggan = semuaPelanggan.find(
            item => String(item.id_pelanggan) === String(idEdit)
        );

        if (!pelanggan) {
            throw new Error("Pelanggan tidak ditemukan");
        }

        document.getElementById("id_pelanggan").value =
            pelanggan.id_pelanggan;

        document.getElementById("nama_pelanggan").value =
            pelanggan.nama_pelanggan || "";

        document.getElementById("no_hp").value =
            pelanggan.no_hp || "";

        document.getElementById("alamat").value =
            pelanggan.alamat || "";

        document.getElementById("judulHalaman").textContent =
            "Edit Pelanggan";

        document.getElementById("judulForm").textContent =
            "Formulir Edit Pelanggan";

        tombolSimpan.textContent = "Simpan Perubahan";

        statusForm.textContent = "";

    } catch (error) {
        console.error(error);
        statusForm.textContent = error.message;

    } finally {
        tombolSimpan.disabled = false;
    }
}

// MENAMBAH ATAU MEMPERBARUI PELANGGAN
formPelanggan.addEventListener("submit", async function(event) {
    event.preventDefault();

    const dataPelanggan = {
        nama_pelanggan: document.getElementById("nama_pelanggan").value.trim(),
        no_hp: document.getElementById("no_hp").value.trim(),
        alamat: document.getElementById("alamat").value.trim()
    };

    if (!dataPelanggan.nama_pelanggan ||
        !dataPelanggan.no_hp ||
        !dataPelanggan.alamat) {

        statusForm.textContent = "Semua kolom wajib diisi.";
        return;
    }

    tombolSimpan.disabled = true;
    tombolSimpan.textContent = "Menyimpan...";
    statusForm.textContent = "Sedang menyimpan data pelanggan...";

    try {
        const url = idEdit
            ? `/api/pelanggan/${encodeURIComponent(idEdit)}`
            : "/api/pelanggan";

        const method = idEdit ? "PUT" : "POST";

        const response = await fetch(url, {
            method: method,
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(dataPelanggan)
        });

        const hasil = await response.json();

        if (!response.ok) {
            throw new Error(
                hasil.message || "Gagal menyimpan pelanggan"
            );
        }

        alert(
            hasil.message ||
            (idEdit
                ? "Data pelanggan berhasil diperbarui."
                : "Pelanggan berhasil ditambahkan.")
        );

        window.location.href = "/pelanggan.html";

    } catch (error) {
        console.error(error);
        statusForm.textContent = error.message;

    } finally {
        tombolSimpan.disabled = false;
        tombolSimpan.textContent = idEdit
            ? "Simpan Perubahan"
            : "Simpan Pelanggan";
    }
});

// JALANKAN SAAT HALAMAN DIBUKA
ambilDataEdit();
