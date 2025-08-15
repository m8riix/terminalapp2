const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
const PORT = process.env.PORT || 3001;

// Enable CORS for your frontend domain
app.use(cors({
    origin: ['http://localhost:3000', 'https://yourdomain.com'], // Add your actual domain
    methods: ['GET', 'POST'],
    credentials: true
}));

app.use(express.json());

// Route to search yflix.to
app.get('/api/search-yflix/:query', async (req, res) => {
    try {
        const query = req.params.query;
        const searchUrl = `https://yflix.to/browser?keyword=${encodeURIComponent(query)}`;
        
        console.log(`Searching yflix.to for: ${query}`);
        
        // Make request to yflix.to
        const response = await axios.get(searchUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Accept-Encoding': 'gzip, deflate',
                'DNT': '1',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
            },
            timeout: 10000
        });

        const $ = cheerio.load(response.data);
        const movies = [];

        // Parse the search results (you'll need to adjust selectors based on yflix.to's HTML structure)
        $('.movie-item, .film-item, .item, .card').each((index, element) => {
            const $element = $(element);
            
            const title = $element.find('h3, .title, .name, .film-name').text().trim() || 
                         $element.find('a').attr('title') || '';
            
            const link = $element.find('a').attr('href') || '';
            const fullLink = link.startsWith('http') ? link : `https://yflix.to${link}`;
            
            const year = $element.find('.year, .date').text().trim() || '';
            
            const poster = $element.find('img').attr('src') || $element.find('img').attr('data-src') || '';
            const fullPoster = poster && !poster.startsWith('http') ? `https://yflix.to${poster}` : poster;
            
            const rating = $element.find('.rating, .imdb').text().trim() || '';
            const quality = $element.find('.quality, .hd').text().trim() || '';
            
            if (title && link) {
                movies.push({
                    title: title,
                    year: year,
                    link: fullLink,
                    poster: fullPoster,
                    rating: rating,
                    quality: quality
                });
            }
        });

        // If no movies found with above selectors, try more generic approach
        if (movies.length === 0) {
            $('a').each((index, element) => {
                const $element = $(element);
                const href = $element.attr('href');
                const text = $element.text().trim();
                
                if (href && href.includes('/movie/') && text.length > 0) {
                    const fullLink = href.startsWith('http') ? href : `https://yflix.to${href}`;
                    movies.push({
                        title: text,
                        year: '',
                        link: fullLink,
                        poster: '',
                        rating: '',
                        quality: ''
                    });
                }
            });
        }

        console.log(`Found ${movies.length} movies for query: ${query}`);
        
        res.json({
            success: true,
            query: query,
            searchUrl: searchUrl,
            results: movies.slice(0, 20) // Limit to 20 results
        });

    } catch (error) {
        console.error('Error searching yflix.to:', error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch data from yflix.to',
            message: error.message
        });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Server is running' });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

module.exports = app;
