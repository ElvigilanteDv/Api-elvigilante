const axios = require('axios');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function fesnuk(post) {
    if (!post?.trim()) throw new Error("Please specify the Facebook URL");
    if (!/(facebook\.com|fb\.watch)/.test(post)) throw new Error("Please enter a valid Facebook URL");

    const headers = {
        "sec-fetch-user": "?1",
        "sec-ch-ua-mobile": "?0",
        "sec-fetch-site": "none",
        "sec-fetch-dest": "document",
        "sec-fetch-mode": "navigate",
        "cache-control": "max-age=0",
        authority: "www.facebook.com",
        "upgrade-insecure-requests": "1",
        "accept-language": "en-GB,en;q=0.9,tr-TR;q=0.8,tr;q=0.7,en-US;q=0.6",
        "sec-ch-ua": '"Google Chrome";v="89", "Chromium";v="89", ";Not A Brand";v="99"',
        "user-agent": UA,
        "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9"
    };

    const parseString = (str) => {
        try {
            return JSON.parse(`{"text":"${str}"}`).text;
        } catch {
            return str;
        }
    };

    const cleanText = (txt) =>
        txt
            .replace(/\\u[\dA-Fa-f]{4}/g, (m) => String.fromCharCode(parseInt(m.replace(/\\u/g, ""), 16)))
            .replace(/\\+/g, "")
            .replace(/\n/g, " ")
            .trim();

    const msToTime = (ms) => {
        const n = Number(ms);
        if (!Number.isFinite(n) || n <= 0) return null;
        const totalSeconds = Math.floor(n / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        if (hours > 0) {
            return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
        }
        return `${minutes}:${String(seconds).padStart(2, "0")}`;
    };

    const { data } = await axios.get(post, { headers }).catch((err) => {
        console.error("Error fetching media information:", err);
        throw new Error("Unable to fetch media information at this time. Please try again.");
    });

    const html = data.replace(/&quot;/g, '"').replace(/&amp;/g, "&");

    let imagePost = false;
    let imageUrl = null;
    const imageUrls = html.match(/https:\/\/scontent\.[^"]+\.jpg(\?[^"]*)?/g);
    if (imageUrls) {
        const seen = new Set();
        imageUrl = imageUrls
            .filter((url) => url.includes("/v/t39.30808-6/") && !/\/s\d{1,3}x\d{1,3}\//.test(url))
            .map((url) => {
                const base = url.split("?")[0];
                if (!seen.has(base)) {
                    seen.add(base);
                    return url;
                }
                return null;
            })
            .filter(Boolean);
        imagePost = imageUrl.length > 0;
    }

    const comments = [
        ...(html.matchAll(/"author":\{"__typename":"User","id":"(.*?)","name":"(.*?)".*?"body":\{"text":"(.*?)"/g) || [])
    ].map((m) => ({
        author: { id: m[1], name: m[2] },
        text: cleanText(m[3])
    }));

    const sdMatch = html.match(/"browser_native_sd_url":"(.*?)"/) ||
        html.match(/"playable_url":"(.*?)"/) ||
        html.match(/sd_src\s*:\s*"([^"]*)"/) ||
        html.match(/(?<="src":")[^"]*(https:\/\/[^"]*)/);

    const hdMatch = html.match(/"browser_native_hd_url":"(.*?)"/) ||
        html.match(/"playable_url_quality_hd":"(.*?)"/) ||
        html.match(/hd_src\s*:\s*"([^"]*)"/);

    const title = html.match(/<meta\sname="description"\scontent="(.*?)"/)?.[1] ||
        html.match(/<title>(.*?)<\/title>/)?.[1] || "";

    const thumb = html.match(/"preferred_thumbnail":{"image":{"uri":"(.*?)"/)?.[1];

    const durationMsRaw = html.match(/"playable_duration_in_ms":(\d+)/)?.[1];
    const duration_ms = durationMsRaw ? Number(durationMsRaw) : null;
    const duration = duration_ms ? msToTime(duration_ms) : null;

    const type = imagePost ? "image" : sdMatch?.[1] ? "video" : "none";

    return {
        type,
        title: parseString(title),
        duration,
        thumbnail: thumb ? parseString(thumb) : null,
        sd: sdMatch?.[1] ? parseString(sdMatch[1]) : null,
        hd: hdMatch?.[1] ? parseString(hdMatch[1]) : null
    };
}

module.exports = function(app) {
    app.get('/download/facebook', async (req, res) => {
        const url = String(req.query.url || "").trim();
        if (!url) {
            return res.status(400).json({
                status: false,
                creator: "ELVIGILANTE",
                error: "El parámetro 'url' es requerido.",
                usage: "/download/facebook?url=URL_DEL_VIDEO"
            });
        }

        try {
            const result = await fesnuk(url);
            if (req.query.download === 'true') {
                const videoUrl = result.hd || result.sd;
                if (videoUrl) return res.redirect(videoUrl);
                throw new Error('No se encontró video para descargar');
            }
            return res.json({
                status: true,
                creator: "ELVIGILANTE",
                result: result
            });
        } catch (err) {
            const message = String(err?.message || '');
            const statusCode = /valid Facebook URL|specify/i.test(message) ? 400 : 500;
            return res.status(statusCode).json({
                status: false,
                creator: "ELVIGILANTE",
                error: message || "Ocurrió un error en el servidor."
            });
        }
    });
};
