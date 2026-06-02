const axios = require('axios');

module.exports = function(app) {
    app.get('/shorten', async (req, res) => {
        const url = req.query.url;
        if (!url) {
            return res.status(400).json({
                status: false,
                creator: "ELVIGILANTE",
                error: "Falta el parámetro 'url'"
            });
        }

        try {
            const apiUrl = `https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`;
            const response = await axios.get(apiUrl);
            const shortUrl = response.data;

            return res.json({
                status: true,
                creator: "ELVIGILANTE",
                original: url,
                short: shortUrl
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
};
