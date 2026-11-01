
const formBarang = document.getElementById("formBarang");
const statusForm = document.getElementById("statusForm");
const tombolSimpan = document.getElementById("tombolSimpan");

// MENGECEK APAKAH SEDANG EDIT BARANG
const parameterURL = new URLSearchParams(window.location.search);
const idEdit = parameterURL.get("id");

// JIKA ADA ID, AMBIL DATA BARANG
async function ambilDataEdit() {
    if (!idEdit) return;

    try {
        statusForm.textContent = "Memuat data barang...";

        const response = await fetch("/api/barang");

        if (!response.ok) {
            throw new Error("Gagal mengambil data barang");
        }

        const semuaBarang = await response.json();

        const barang = semuaBarang.find(
            item => String(item.id_barang) === String(idEdit)
        );

        if (!barang) {
            throw new Error("Barang tidak ditemukan");
        }

        document.getElementById("id_barang").value = barang.id_barang;
        document.getElementById("kode_barang").value = barang.kode_barang;
        document.getElementById("nama_barang").value = barang.nama_barang;
        document.getElementById("harga").value = barang.harga;
        document.getElementById("stok").value = barang.stok;
        document.getElementById("satuan").value = barang.satuan;
        document.getElementById("id_supplier").value = barang.id_supplier;

        document.getElementById("judulHalaman").textContent = "Edit Barang";
        document.getElementById("judulForm").textContent = "Formulir Edit Barang";
        tombolSimpan.innerHTML = "<span>✓</span> Simpan Perubahan";

        statusForm.textContent = "";

    } catch (error) {
        console.error(error);
        statusForm.textContent = error.message;
    }
}

// SIMPAN BARANG BARU ATAU PERUBAHAN
formBarang.addEventListener("submit", async function(event) {
    event.preventDefault();

    const dataBarang = {
        kode_barang: document.getElementById("kode_barang").value.trim(),
        nama_barang: document.getElementById("nama_barang").value.trim(),
        harga: document.getElementById("harga").value,
        stok: document.getElementById("stok").value,
        satuan: document.getElementById("satuan").value.trim(),
        id_supplier: document.getElementById("id_supplier").value
    };

    try {
        tombolSimpan.disabled = true;
        tombolSimpan.textContent = "Menyimpan...";
        statusForm.textContent = "Sedang menyimpan data barang...";

        const url = idEdit
            ? `/api/barang/${idEdit}`
            : "/api/barang";

        const method = idEdit ? "PUT" : "POST";

        const response = await fetch(url, {
            method: method,
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(dataBarang)
        });

        const hasil = await response.json();

        if (!response.ok) {
            throw new Error(
                hasil.message || "Gagal menyimpan barang"
            );
        }

        alert(hasil.message || "Data barang berhasil disimpan.");

        window.location.href = "/barang.html";

    } catch (error) {
        console.error(error);
        statusForm.textContent = error.message;

    } finally {
        tombolSimpan.disabled = false;
        tombolSimpan.innerHTML = idEdit
            ? "<span>✓</span> Simpan Perubahan"
            : "<span>✓</span> Simpan Barang";
    }
});

// JALANKAN SAAT HALAMAN DIBUKA
ambilDataEdit();
