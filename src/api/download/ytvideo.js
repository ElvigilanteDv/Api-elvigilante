const axios = require("axios");
const crypto = require("crypto");

class YouTubeVideoDownloader {
    constructor() {
        this.ky = 'C5D58EF67A7584E4A29F6C35BBC4EB12';
        this.fmt = ['144', '240', '360', '480', '720', '1080'];
        this.m = /^((?:https?:)?\/\/)?((?:www|m|music)\.)?(?:youtube\.com|youtu\.be)\/(?:watch\?v=)?(?:embed\/)?(?:v\/)?(?:shorts\/)?([a-zA-Z0-9_-]{11})/;
        this.is = axios.create({
            headers: {
                'content-type': 'application/json',
                'origin': 'https://yt.savetube.me',
                'user-agent': 'Mozilla/5.0 (Android 15; Mobile; SM-F958; rv:130.0) Gecko/130.0 Firefox/130.0'
            }
        });
    }

    async decrypt(enc) {
        const sr = Buffer.from(enc, 'base64');
        const ky = Buffer.from(this.ky, 'hex');
        const iv = sr.slice(0, 16);
        const dt = sr.slice(16);
        const dc = crypto.createDecipheriv('aes-128-cbc', ky, iv);
        return JSON.parse(Buffer.concat([dc.update(dt), dc.final()]).toString());
    }

    async getCdn() {
        const response = await this.is.get("https://media.savetube.vip/api/random-cdn");
        if (!response.data) return { status: false, msg: "No se pudo obtener CDN" };
        return { status: true, data: response.data.cdn };
    }

    async download(url, quality = '360') {
        const id = url.match(this.m)?.[3];
        if (!id) return { status: false, msg: "No se pudo extraer el ID del video" };
        if (!quality || !this.fmt.includes(quality)) {
            return { status: false, msg: "Formato no soportado", formats: this.fmt };
        }

        const cdn = await this.getCdn();
        if (!cdn.status) return cdn;

        // Obtener información del video
        const infoRes = await this.is.post(`https://${cdn.data}/v2/info`, {
            url: `https://www.youtube.com/watch?v=${id}`
        });
        const decrypted = await this.decrypt(infoRes.data.data);

        // Obtener enlace de descarga
        const dlRes = await this.is.post(`https://${cdn.data}/download`, {
            id: id,
            downloadType: 'video',
            quality: quality,
            key: decrypted.key
        });

        return {
            status: true,
            title: decrypted.title,
            thumbnail: decrypted.thumbnail || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
            duration: decrypted.duration,
            quality: quality + 'p',
            download_url: dlRes.data.data.downloadUrl
        };
    }
}

module.exports = function(app) {
    app.get('/download/ytvideo', async (req, res) => {
        const url = req.query.url;
        const quality = req.query.quality || '360';

        if (!url) {
            return res.status(400).json({
                status: false,
                creator: "ELVIGILANTE",
                error: "Falta el parámetro 'url'",
                usage: "/download/ytvideo?url=YOUTUBE_URL&quality=360"
            });
        }

        const validQualities = ['144', '240', '360', '480', '720', '1080'];
        if (!validQualities.includes(quality)) {
            return res.status(400).json({
                status: false,
                creator: "ELVIGILANTE",
                error: `Calidad inválida. Usa: ${validQualities.join(', ')}`,
                usage: "/download/ytvideo?url=YOUTUBE_URL&quality=360"
            });
        }

        try {
            const downloader = new YouTubeVideoDownloader();
            const result = await downloader.download(url, quality);

            if (!result.status) {
                return res.status(500).json({
                    status: false,
                    creator: "ELVIGILANTE",
                    error: result.msg || "Error al procesar la descarga"
                });
            }

            // Descarga directa
            if (req.query.download === 'true') {
                return res.redirect(result.download_url);
            }

            // Devolver JSON con la información
            return res.json({
                status: true,
                creator: "ELVIGILANTE",
                result: {
                    title: result.title,
                    thumbnail: result.thumbnail,
                    duration: result.duration,
                    quality: result.quality,
                    format: "MP4",
                    download_url: result.download_url
                }
            });
        } catch (error) {
            console.error('[YouTube Video Error]', error.message);
            return res.status(500).json({
                status: false,
                creator: "ELVIGILANTE",
                error: error.message
            });
        }
    });
};
