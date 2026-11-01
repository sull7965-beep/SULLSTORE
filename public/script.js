
async function loadDashboard() {
    const status = document.getElementById("statusDashboard");

    try {
        const response = await fetch("/api/dashboard");

        if (!response.ok) {
            throw new Error("Gagal mengambil data dashboard");
        }

        const data = await response.json();

        document.getElementById("totalBarang").textContent =
            data.total_barang;

        document.getElementById("totalSupplier").textContent =
            data.total_supplier;

        document.getElementById("totalTransaksi").textContent =
            data.total_transaksi;

        document.getElementById("totalPendapatan").textContent =
            formatRupiah(data.total_pendapatan);

        status.textContent =
            "Dashboard berhasil terhubung dengan PostgreSQL.";

    } catch (error) {
        console.error(error);
        status.textContent =
            "Gagal mengambil data. Periksa koneksi server dan API.";
    }
}

function formatRupiah(angka) {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0
    }).format(Number(angka) || 0);
}

function tampilkanPesan(namaFitur) {
    alert("Fitur " + namaFitur + " akan kita buat pada tahap berikutnya.");
}

loadDashboard();
