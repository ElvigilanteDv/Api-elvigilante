const axios = require('axios');

module.exports = function(app) {

    app.get('/download/tiktok', async (req, res) => {
        const url = req.query.url;
        const directo = req.query.download || 'false';

        if (!url) {
            return res.status(400).json({
                status: false,
                creator: "EL VIGILANTE",
                error: "Falta el parámetro 'url'",
                usage: "/download/tiktok?url=TIKTOK_URL"
            });
        }

        try {
            const { data } = await axios.get(
                `https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`,
                { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 10000 }
            );

            if (data.code === 0 && data.data) {
                const video = data.data;

                if (directo === 'true' && video.play) {
                    return res.redirect(video.play);
                }

                return res.json({
                    status: true,
                    creator: "EL VIGILANTE",
                    id: video.id || '',
                    titulo: video.title || 'Sin título',
                    autor: video.author?.nickname || 'Desconocido',
                    duracion: video.duration || '00:00',
                    vistas: video.play_count?.toLocaleString() || '0',
                    tiktok_url: video.play || '',
                    musica: video.music || '',
                    cover: video.cover || '',
                    descargar: `/download/tiktok?url=${encodeURIComponent(url)}&download=true`
                });
            }

            return res.json({
                status: false,
                creator: "EL VIGILANTE",
                error: "No se pudo obtener el video. Verifica la URL."
            });

        } catch (error) {
            return res.status(500).json({
                status: false,
                creator: "EL VIGILANTE",
                error: "Error al procesar la descarga"
            });
        }
    });

};
