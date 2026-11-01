
// =====================================
// SULLSTORE: LIGHT MODE & DARK MODE
// =====================================

const themeToggle = document.getElementById("themeToggle");
const themeIcon = document.getElementById("themeIcon");
const themeText = document.getElementById("themeText");


// Mengambil tema yang tersimpan
const temaTersimpan = localStorage.getItem("sullstore-theme");

if (temaTersimpan === "dark") {
    document.body.classList.add("dark-mode");
}


// Memperbarui tampilan tombol tema
function perbaruiTombolTema() {
    const modeGelap = document.body.classList.contains("dark-mode");

    if (modeGelap) {
        themeIcon.textContent = "☀";
        themeText.textContent = "Light Mode";
    } else {
        themeIcon.textContent = "☾";
        themeText.textContent = "Dark Mode";
    }
}

perbaruiTombolTema();


// Mengganti tema saat tombol diklik
themeToggle.addEventListener("click", function () {
    document.body.classList.toggle("dark-mode");

    const modeGelap = document.body.classList.contains("dark-mode");

    localStorage.setItem(
        "sullstore-theme",
        modeGelap ? "dark" : "light"
    );

    perbaruiTombolTema();
});


// =====================================
// MENU SIDEBAR UNTUK HP
// =====================================

const mobileMenu = document.getElementById("mobileMenu");
const sidebar = document.getElementById("sidebar");

mobileMenu.addEventListener("click", function () {
    sidebar.classList.toggle("show");
});


// Menutup sidebar setelah menu dipilih
document.querySelectorAll(".sidebar-nav .nav-link")
    .forEach(function (link) {
        link.addEventListener("click", function () {
            sidebar.classList.remove("show");
        });
    });
