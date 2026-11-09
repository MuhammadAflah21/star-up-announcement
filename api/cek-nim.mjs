
import { checkRateLimit } from "../lib/rate-limit.mjs";
import { resolveContactPerson } from "../lib/contact-person.mjs";
import { createClient } from "@supabase/supabase-js";

// API untuk mengecek hasil seleksi STAR UP
export default async function handler(req, res) {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");

    // Hanya menerima request POST
    if (req.method !== "POST") {
        res.setHeader("Allow", "POST");

        return res.status(405).json({
            status: "error",
            message: "Metode tidak diizinkan."
        });
    }

    // Pastikan request berupa JSON
    const contentType = req.headers["content-type"] || "";

    if (!contentType.toLowerCase().startsWith("application/json")) {
        return res.status(415).json({
            status: "error",
            message: "Request harus menggunakan JSON."
        });
    }

    // Ambil NIM yang dikirim
    const inputNim = req.body?.nim;

    if (typeof inputNim !== "string") {
        return res.status(400).json({
            status: "error",
            message: "NIM harus berupa teks."
        });
    }

    // Ubah ke uppercase
    const nim = inputNim.replace(/[a-z]/g, (letter) => letter.toUpperCase());

    // Validasi NIM tepat 9 karakter
    const valid =
        /^[A-Z0-9]{9}$/.test(nim) &&
        /[A-Z]/.test(nim) &&
        /[0-9]/.test(nim);

    if (!valid) {
        return res.status(400).json({
            status: "error",
            message: "NIM harus 9 karakter, terdiri dari huruf dan angka."
        });
    }

    // Pengumuman hanya bisa dicek jika diaktifkan
    if (process.env.ANNOUNCEMENT_OPEN !== "true") {
        return res.status(503).json({
            status: "service-unavailable",
            message: "Layanan pengecekan belum dibuka."
        });
    }

    // Ambil konfigurasi Supabase dari Vercel
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SECRET_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error("Konfigurasi Supabase tidak lengkap.");

        return res.status(503).json({
            status: "service-unavailable",
            message: "Layanan belum tersedia."
        });
    }

    try {
        // Hubungkan backend ke Supabase
        const supabase = createClient(
            supabaseUrl,
            supabaseKey,
            {
                auth: {
                    persistSession: false,
                    autoRefreshToken: false,
                    detectSessionInUrl: false
                }
            }
        );

        // Periksa batas percobaan sebelum mencari peserta
        const limit = await checkRateLimit(req, supabase);

        if (limit.status === "unavailable") {
            return res.status(503).json({
                status: "service-unavailable",
                message: "Layanan sementara tidak tersedia."
            });
        }

        if (limit.status === "blocked") {
            res.setHeader("Retry-After", String(limit.retryAfter));

            return res.status(429).json({
                status: "rate-limited",
                message: "Terlalu banyak percobaan. Coba lagi nanti."
            });
        }

        // Cari peserta berdasarkan NIM
        const { data: peserta, error: pesertaError } =
            await supabase
                .from("peserta")
                .select("nim, nama, status, divisi")
                .eq("nim", nim)
                .maybeSingle();

        if (pesertaError) {
            throw pesertaError;
        }

        // Kondisi 1: NIM tidak ditemukan
        if (!peserta) {
            return res.status(200).json({
                status: "not-found"
            });
        }

        // Data tidak lengkap adalah error server, bukan hasil seleksi.
        if (peserta.nim !== nim || typeof peserta.nama !== "string" || !peserta.nama.trim()) {
            throw new Error("Identitas peserta tidak valid.");
        }

        // Kondisi 2: Peserta tidak diterima
        if (peserta.status === "not-accepted") {
            return res.status(200).json({
                status: "not-accepted",
                nim: peserta.nim,
                name: peserta.nama,
            });
        }

        // Pastikan status valid
        if (peserta.status !== "accepted") {
            throw new Error("Status peserta tidak dikenal.");
        }

        if (typeof peserta.divisi !== "string" || !peserta.divisi.trim()) {
            throw new Error("Divisi peserta tidak valid.");
        }

        // Cari CP berdasarkan divisi peserta di Supabase
        const { data: koordinator, error: koordinatorError } =
            await supabase
                .from("koordinator")
                .select("nama, whatsapp")
                .eq("divisi", peserta.divisi)
                .maybeSingle();

        if (koordinatorError) {
            throw koordinatorError;
        }

        // Format data CP untuk frontend
        const contactPerson = koordinator
            ? {
                name: koordinator.nama,
                whatsapp: koordinator.whatsapp
            }
            : null;

        // Kondisi 3: Peserta diterima
        return res.status(200).json({
            status: "accepted",
            nim: peserta.nim,
            name: peserta.nama,
            coordinator: contactPerson,
            contactPerson: contactPerson
        });


    } catch (error) {
        console.error(
            "Kesalahan query Supabase:",
            error.message
        );

        return res.status(500).json({
            status: "error",
            message: "Terjadi kesalahan pada server."
        });
    }
}
