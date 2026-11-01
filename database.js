
const { Pool } = require("pg");
require("dotenv").config();

const db = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: Number(process.env.DB_PORT) || 5432,

    // SSL diaktifkan khusus untuk database online
    ssl: process.env.DB_SSL === "true"
        ? { rejectUnauthorized: false }
        : false
});

// Menguji koneksi database
db.query("SELECT NOW()")
    .then(() => {
        console.log("PostgreSQL berhasil terhubung!");
    })
    .catch(error => {
        console.error("Koneksi database gagal:", error.message);
    });

module.exports = db;
