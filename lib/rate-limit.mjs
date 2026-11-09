
import { createHmac } from "node:crypto";
import { isIP } from "node:net";

function getClientIp(req) {
    const deployed = (
        process.env.VERCEL_ENV === "production" ||
        process.env.VERCEL_ENV === "preview" ||
        (
            process.env.VERCEL === "1" &&
            process.env.VERCEL_ENV !== "development"
        )
    );

    // Pada deployment, gunakan IP dari proxy Vercel.
    // Pada local development, gunakan alamat socket.
    const rawIp = deployed
        ? (
            req.headers?.["x-vercel-forwarded-for"] ??
            req.headers?.["x-real-ip"]
        )
        : req.socket?.remoteAddress;

    if (typeof rawIp !== "string") {
        return null;
    }

    const ip = rawIp.split(",")[0].trim();

    return isIP(ip) ? ip : null;
}

export async function checkRateLimit(req, supabase) {
    const secret = process.env.RATE_LIMIT_SECRET;

    // Jangan izinkan pencarian jika konfigurasi hilang.
    if (!secret || secret.length < 32) {
        console.error("RATE_LIMIT_SECRET belum dikonfigurasi.");
        return { status: "unavailable" };
    }

    const ip = getClientIp(req);

    if (!ip) {
        console.error("IP pengunjung tidak dapat diverifikasi.");
        return { status: "unavailable" };
    }

    // Database hanya menerima hash, bukan IP mentah.
    const keyHash = createHmac("sha256", secret)
        .update(`star-up-announcement:v1:${ip}`)
        .digest("hex");

    try {
        const { data, error } = await supabase.rpc(
            "consume_announcement_rate_limit",
            {
                p_key_hash: keyHash
            }
        );

        if (error) {
            console.error("Rate limit RPC gagal:", error.message);
            return { status: "unavailable" };
        }

        // Fungsi RETURNS TABLE dapat menghasilkan array.
        const result = Array.isArray(data) ? data[0] : data;

        if ((Array.isArray(data) && data.length !== 1) || !result || typeof result.allowed !== "boolean") {
            console.error("Respons rate limiting tidak valid.");
            return { status: "unavailable" };
        }

        if (!result.allowed) {
            const seconds = Number(result.retry_after_seconds);

            if (result.retry_after_seconds == null || !Number.isFinite(seconds) || seconds <= 0) {
                console.error("Waktu tunggu rate limiting tidak valid.");
                return { status: "unavailable" };
            }
            return { status: "blocked", retryAfter: Math.ceil(seconds) };
        }

        return { status: "allowed" };

    } catch (error) {
        console.error("Pemeriksaan rate limit gagal:", error.message);
        return { status: "unavailable" };
    }
}
