const axios = require('axios');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

module.exports = function(app) {
    app.get('/translate', async (req, res) => {
        const text = String(req.query.text || "").trim();
        const target = String(req.query.target || "es").trim();

        if (!text) {
            return res.status(400).json({
                status: false,
                creador: "ELVIGILANTE",
                error: "Se requiere el parámetro 'text'"
            });
        }

        try {
            const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${target}&dt=t&q=${encodeURIComponent(text)}`;

            const response = await axios.get(url, {
                headers: { 'User-Agent': UA }
            });

            const translated = response.data[0][0][0];
            const sourceLang = response.data[2];

            const idiomas = {
                es: 'Español', en: 'Inglés', fr: 'Francés', it: 'Italiano', pt: 'Portugués',
                de: 'Alemán', ja: 'Japonés', ko: 'Coreano', zh: 'Chino', ru: 'Ruso',
                ar: 'Árabe', hi: 'Hindi', nl: 'Holandés', pl: 'Polaco'
            };

            return res.status(200).json({
                status: true,
                creador: "ELVIGILANTE",
                resultado: {
                    original: text,
                    traducido: translated,
                    idioma_origen: idiomas[sourceLang] || sourceLang,
                    idioma_destino: idiomas[target] || target
                }
            });

        } catch (error) {
            console.error('Translate error:', error.message);
            return res.status(500).json({
                status: false,
                creador: "ELVIGILANTE",
                error: error.message
            });
        }
    });
};
