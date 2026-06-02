const axios = require('axios');
const cheerio = require('cheerio');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function cleanText(x) {
    return String(x || '').replace(/\s+/g, ' ').trim();
}

function normalizeUrl(u) {
    const s = cleanText(u);
    if (!s) return null;
    if (/^https?:\/\//i.test(s)) return s;
    if (s.startsWith('//')) return 'https:' + s;
    if (s.startsWith('/')) return 'https://www.mediafire.com' + s;
    return s;
}

function pickFilename($) {
    let filename = cleanText($('.intro .filename').text());
    if (!filename) filename = cleanText($('meta[property="og:title"]').attr('content'));
    if (!filename) filename = cleanText($('title').text());
    return filename || null;
}

function pickFiletypeText($) {
    const t = cleanText($('.filetype').text());
    return t || null;
}

function pickTypeFromFilename(name) {
    if (!name) return null;
    const m = String(name).match(/\.([a-z0-9]{1,10})$/i);
    return m?.[1]?.toLowerCase() || null;
}

function pickDetails($) {
    let size = null;
    let uploaded = null;

    $('ul.details li').each((_, el) => {
        const text = cleanText($(el).text());

        if (!size && /File size:/i.test(text)) {
            size = cleanText($(el).find('span').text()) || null;
        }

        if (!uploaded && /Uploaded:/i.test(text)) {
            uploaded = cleanText($(el).find('span').text()) || null;
        }
    });

    return { size, uploaded };
}

async function mediafireDl(url, timeout = 45000) {
    const mediafireUrl = cleanText(url);
    if (!mediafireUrl) throw new Error('URL requerida');

    const res = await axios.get(mediafireUrl, {
        timeout,
        maxRedirects: 5,
        headers: {
            'User-Agent': UA,
            'Accept-Language': 'en-US,en;q=0.9',
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        },
        validateStatus: () => true
    });

    if (res.status < 200 || res.status >= 400) {
        throw new Error(`MediaFire HTTP ${res.status}`);
    }

    const $ = cheerio.load(String(res.data || ''));

    const downloadLinkRaw =
        $('#downloadButton').attr('href') ||
        $('a#downloadButton').attr('href') ||
        null;

    const downloadLink = normalizeUrl(downloadLinkRaw);

    if (!downloadLink) {
        throw new Error('Download link not found');
    }

    const filename = pickFilename($);
    const filetype = pickFiletypeText($);
    const { size, uploaded } = pickDetails($);
    const type = pickTypeFromFilename(filename) || (filetype ? cleanText(filetype).toLowerCase() : null);

    return {
        downloadLink,
        filename,
        filetype,
        size,
        uploaded,
        type
    };
}

module.exports = function(app) {

    app.get('/download/mediafire', async (req, res) => {
        const url = String(req.query.url || "").trim();

        if (!url) {
            return res.status(400).json({
                status: false,
                creator: "ELVIGILANTE",
                error: 'El parámetro "url" es requerido.',
                message: 'Please provide a MediaFire URL: ?url=MEDIAFIRE_URL'
            });
        }

        try {
            const result = await mediafireDl(url);

            const direct = result?.downloadLink || null;

            if (!direct) {
                return res.status(502).json({
                    status: false,
                    creator: "ELVIGILANTE",
                    error: "No se pudo obtener el link directo de MediaFire.",
                    result: result || null
                });
            }

            // Si se solicita descarga directa
            if (req.query.download === 'true') {
                return res.redirect(direct);
            }

            const normalizedResult = {
                link: direct,
                filename: result?.filename ?? null,
                filetype: result?.filetype ?? null,
                size: result?.size ?? null,
                uploaded: result?.uploaded ?? null,
                type: result?.type ?? null
            };

            return res.status(200).json({
                status: true,
                creator: "ELVIGILANTE",
                result: normalizedResult,
                download_url: `/download/mediafire?url=${encodeURIComponent(url)}&download=true`
            });

        } catch (err) {
            const message = String(err?.message || "");
            const statusCode =
                /URL requerida/i.test(message) ? 400 :
                /MediaFire HTTP 404/i.test(message) ? 404 :
                /MediaFire HTTP (401|403)/i.test(message) ? 403 :
                /Download link not found/i.test(message) ? 502 :
                /timeout|ETIMEDOUT|ECONNABORTED/i.test(message) ? 504 :
                500;

            return res.status(statusCode).json({
                status: false,
                creator: "ELVIGILANTE",
                error: message && statusCode !== 500 ? message : "Ocurrió un error en el servidor."
            });
        }
    });
};
