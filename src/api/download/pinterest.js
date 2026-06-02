const axios = require('axios');
const cheerio = require('cheerio');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function cleanText(text) {
    return String(text || '').trim();
}

async function pinterestSearch(query, limit = 20) {
    try {
        const url = `https://www.pinterest.com/resource/BaseSearchResource/get/`;
        const params = {
            source_url: `/search/pins/?q=${encodeURIComponent(query)}`,
            data: JSON.stringify({
                options: {
                    query: query,
                    scope: 'pins',
                    page_size: Math.min(limit, 100),
                    redux_normalize_feed: true
                },
                context: {}
            })
        };

        const response = await axios.get(url, {
            params: params,
            headers: {
                'User-Agent': UA,
                'Accept': 'application/json',
                'Accept-Language': 'en-US,en;q=0.9',
                'x-pinterest-pws-handler': 'www/home.js'
            }
        });

        const results = response.data.resource_response?.data?.results || [];

        return results.slice(0, limit).map(item => ({
            id: item.id,
            title: item.title || cleanText(item.images?.orig?.title) || 'Sin título',
            description: item.description || '',
            link: `https://pinterest.com/pin/${item.id}`,
            image: item.images?.orig?.url || item.images?.['564x']?.url || null,
            thumbnail: item.images?.['236x']?.url || item.images?.orig?.url || null,
            author: item.pinner?.username || null,
            likes: item.like_count || 0,
            comments: item.comment_count || 0,
            repins: item.repin_count || 0
        }));
    } catch (error) {
        console.error('Pinterest search error:', error.message);
        return [];
    }
}

async function pinterestDownload(url) {
    try {
        const response = await axios.get(url, {
            headers: {
                'User-Agent': UA,
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
            }
        });

        const html = response.data;

        const imageMatch = html.match(/<meta property="og:image" content="([^"]+)"/i);
        const videoMatch = html.match(/<meta property="og:video" content="([^"]+)"/i) ||
                          html.match(/<meta property="og:video:url" content="([^"]+)"/i) ||
                          html.match(/<video[^>]*src="([^"]+)"/i);

        const titleMatch = html.match(/<meta property="og:title" content="([^"]+)"/i);
        const descriptionMatch = html.match(/<meta name="description" content="([^"]+)"/i);

        let mediaUrl = null;
        let type = 'image';

        if (videoMatch) {
            mediaUrl = videoMatch[1];
            type = 'video';
        } else if (imageMatch) {
            mediaUrl = imageMatch[1];
            type = 'image';
        }

        if (!mediaUrl) {
            throw new Error('No se pudo obtener el contenido multimedia');
        }

        return {
            title: titleMatch ? titleMatch[1] : 'Pinterest Media',
            description: descriptionMatch ? descriptionMatch[1] : '',
            type: type,
            url: mediaUrl,
            source_url: url
        };
    } catch (error) {
        throw new Error(`Error descargando: ${error.message}`);
    }
}

module.exports = function(app) {

    app.get('/pinterest', async (req, res) => {
        const query = String(req.query.query || "").trim();
        const limit = parseInt(req.query.limit) || 20;
        const downloadUrl = String(req.query.url || "").trim();

        if (downloadUrl) {
            try {
                const result = await pinterestDownload(downloadUrl);

                if (req.query.download === 'true') {
                    return res.redirect(result.url);
                }

                return res.status(200).json({
                    status: true,
                    creator: "ELVIGILANTE",
                    result: result
                });
            } catch (error) {
                return res.status(500).json({
                    status: false,
                    creator: "ELVIGILANTE",
                    error: error.message
                });
            }
        }

        if (!query) {
            return res.status(400).json({
                status: false,
                creator: "ELVIGILANTE",
                error: "Se requiere 'query' para buscar o 'url' para descargar",
                usage: {
                    search: "/pinterest?query=gatitos&limit=20",
                    download: "/pinterest?url=https://pinterest.com/pin/12345"
                }
            });
        }

        try {
            const results = await pinterestSearch(query, Math.min(limit, 100));

            return res.status(200).json({
                status: true,
                creator: "ELVIGILANTE",
                query: query,
                total_results: results.length,
                result: results
            });
        } catch (error) {
            return res.status(500).json({
                status: false,
                creator: "ELVIGILANTE",
                error: error.message
            });
        }
    });
};
