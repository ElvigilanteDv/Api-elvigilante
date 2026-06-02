const axios = require('axios');
const cheerio = require('cheerio');

module.exports = function(app) {

    app.get('/random/meme', async (req, res) => {
        const descargar = req.query.download || 'false';

        try {
            // Memedroid - memes en español (top del día)
            const { data } = await axios.get('https://es.memedroid.com/memes/top/day', {
                headers: { 
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'text/html,application/xhtml+xml',
                    'Accept-Language': 'es-ES,es;q=0.9'
                }, 
                timeout: 10000 
            });

            const $ = cheerio.load(data);
            const memes = [];

            // Buscar todas las imágenes de memes
            $('img').each((i, el) => {
                const src = $(el).attr('src') || $(el).attr('data-src') || '';
                const alt = $(el).attr('alt') || '';

                // Solo imágenes de memes (no iconos, logos, etc.)
                if (src && (src.includes('memedroid') || src.includes('meme')) && 
                    (src.endsWith('.jpg') || src.endsWith('.jpeg') || src.endsWith('.png') || src.endsWith('.gif')) &&
                    !src.includes('avatar') && !src.includes('logo') && !src.includes('icon')) {
                    memes.push({
                        titulo: alt || 'Meme en español',
                        imagen: src.startsWith('http') ? src : 'https://es.memedroid.com' + src
                    });
                }
            });

            if (memes.length === 0) {
                // Si no encuentra, buscar también en artículos
                $('article, .meme-item, .gallery-item').each((i, el) => {
                    const img = $(el).find('img').attr('src') || $(el).find('img').attr('data-src') || '';
                    const titulo = $(el).find('img').attr('alt') || 'Meme';
                    if (img && (img.endsWith('.jpg') || img.endsWith('.jpeg') || img.endsWith('.png'))) {
                        memes.push({
                            titulo,
                            imagen: img.startsWith('http') ? img : 'https://es.memedroid.com' + img
                        });
                    }
                });
            }

            if (memes.length === 0) {
                return res.json({
                    status: false,
                    creator: "EL VIGILANTE",
                    mensaje: "No se encontraron memes. Intenta de nuevo."
                });
            }

            // Elegir meme aleatorio
            const meme = memes[Math.floor(Math.random() * memes.length)];

            // Si pide descarga, redirigir
            if (descargar === 'true') {
                return res.redirect(meme.imagen);
            }

            return res.json({
                status: true,
                creator: "EL VIGILANTE",
                idioma: "Español",
                fuente: "Memedroid",
                descargar: `/random/meme?download=true`,
                ...meme
            });

        } catch (error) {
            return res.status(500).json({
                status: false,
                creator: "EL VIGILANTE",
                error: "Error al obtener meme"
            });
        }
    });

};
