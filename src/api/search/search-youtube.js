const yts = require('yt-search');

module.exports = function(app) {
    app.get('/search/youtube', async (req, res) => {
        const query = req.query.q;
        let limit = parseInt(req.query.limit) || 20;

        if (!query) {
            return res.status(400).json({
                status: false,
                creator: "EL VIGILANTE",
                error: "Falta el parámetro 'q'",
                usage: "/search/youtube?q=badbunny"
            });
        }

        try {
            const result = await yts(query);
            const videos = result.videos.slice(0, Math.min(limit, 50));

            return res.json({
                status: true,
                creator: "EL VIGILANTE",
                query: query,
                total: videos.length,
                result: videos.map(v => ({
                    title: v.title || "Sin título",
                    channel: v.author?.name || "Desconocido",
                    duration: v.timestamp || "00:00",
                    views: v.views?.toLocaleString() || "0",
                    url: v.url
                }))
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
