const axios = require('axios');

module.exports = function(app) {

    app.get('/search/tiktok', async (req, res) => {
        const query = req.query.query;
        let limit = parseInt(req.query.limit) || 10;

        if (!query) {
            return res.status(400).json({
                status: false,
                creator: "EL VIGILANTE",
                error: "Falta el parámetro 'query'",
                usage: "/search/tiktok?query=badbunny&limit=5"
            });
        }

        if (limit > 30) limit = 30;

        try {
            const { data } = await axios.get(
                `https://www.tikwm.com/api/feed/search?keywords=${encodeURIComponent(query)}&count=${limit}`,
                { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 10000 }
            );

            if (data.code === 0 && data.data?.videos) {
                const videos = data.data.videos.map(v => ({
                    id: v.video_id || '',
                    titulo: v.title || 'Sin título',
                    autor: v.author?.nickname || 'Desconocido',
                    duracion: v.duration || '00:00',
                    vistas: v.play_count?.toLocaleString() || '0',
                    cover: v.cover || '',
                    tiktok_url: `https://www.tiktok.com/@${v.author?.unique_id || 'user'}/video/${v.video_id || ''}`
                }));

                return res.json({
                    status: true,
                    creator: "EL VIGILANTE",
                    query: query,
                    total: videos.length,
                    resultados: videos
                });
            }

            return res.json({
                status: false,
                creator: "EL VIGILANTE",
                mensaje: "No se encontraron videos"
            });

        } catch (error) {
            return res.status(500).json({
                status: false,
                creator: "EL VIGILANTE",
                error: "Error en la búsqueda"
            });
        }
    });

};
