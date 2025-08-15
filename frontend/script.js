const OMDB_API_KEY = 'fd161998';
const TMDB_API_KEY = 'bf99b4e624a319715068fad2ea7e4886';
const BACKEND_URL = 'terminalapp2.railway.internal'; // Change to your deployed backend URL
const output = document.getElementById('output');
const input = document.getElementById('input');
let commandHistory = [];
let historyIndex = -1;
let currentSearchMode = 'detailed'; // 'detailed' or 'yflix'

// Event listeners
input.addEventListener('keydown', async (e) => {
    if (e.key === 'Enter') {
        const query = input.value.trim();
        if (query) {
            await handleCommand(query);
            commandHistory.push(query);
            historyIndex = commandHistory.length;
            input.value = '';
        }
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (historyIndex > 0) {
            historyIndex--;
            input.value = commandHistory[historyIndex];
        }
    } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (historyIndex < commandHistory.length - 1) {
            historyIndex++;
            input.value = commandHistory[historyIndex];
        } else {
            historyIndex = commandHistory.length;
            input.value = '';
        }
    }
});

async function handleCommand(command) {
    // Add command to output
    output.innerHTML += `<div class="command-history">&gt; ${command}</div>`;
    
    const lowerCommand = command.toLowerCase();
    
    if (lowerCommand === 'help') {
        showHelp();
    } else if (lowerCommand === 'clear') {
        clearTerminal();
    } else if (lowerCommand.startsWith('mode ')) {
        const mode = lowerCommand.replace('mode ', '').trim();
        switchMode(mode);
    } else if (lowerCommand === 'yflix' || lowerCommand.startsWith('yflix ')) {
        const query = lowerCommand === 'yflix' ? '' : command.substring(6).trim();
        if (query) {
            await searchYflix(query);
        } else {
            output.innerHTML += '<div class="error">Please provide a movie name after "yflix". Example: yflix don</div>';
        }
    } else {
        // Default search based on current mode
        if (currentSearchMode === 'yflix') {
            await searchYflix(command);
        } else {
            await searchMovie(command);
        }
    }
    
    // Scroll to bottom
    output.scrollTop = output.scrollHeight;
}

function switchMode(mode) {
    if (mode === 'detailed' || mode === 'detail') {
        currentSearchMode = 'detailed';
        output.innerHTML += '<div style="color: #22c55e; margin-bottom: 1rem;">✓ Switched to detailed movie search mode (OMDB + TMDB)</div>';
    } else if (mode === 'yflix' || mode === 'browse') {
        currentSearchMode = 'yflix';
        output.innerHTML += '<div style="color: #22c55e; margin-bottom: 1rem;">✓ Switched to yflix browse mode</div>';
    } else {
        output.innerHTML += '<div class="error">Invalid mode. Use "mode detailed" or "mode yflix"</div>';
    }
}

function showHelp() {
    output.innerHTML += `
        <div class="help">
            <div><strong>🎬 MovieGPT Commands:</strong></div>
            <div><span class="help-command">movie name</span> - Search for detailed movie info (current mode: ${currentSearchMode})</div>
            <div><span class="help-command">yflix [movie name]</span> - Search yflix.to for movies</div>
            <div><span class="help-command">mode detailed</span> - Switch to detailed search mode (OMDB + TMDB)</div>
            <div><span class="help-command">mode yflix</span> - Switch to yflix browse mode</div>
            <div><span class="help-command">help</span> - Show this help message</div>
            <div><span class="help-command">clear</span> - Clear the terminal</div>
            <div><span class="help-command">↑/↓</span> - Navigate command history</div>
            <div style="margin-top: 1rem; color: #71717a; font-style: italic;">
                Contact: <a href="https://instagram.com/za1n.2c" target="_blank" class="footer-link">@za1n.2c</a> for support
            </div>
        </div>
    `;
}

function clearTerminal() {
    output.innerHTML = `
        <div class="prompt-line">
            <span class="prompt">MovieGPT [${currentSearchMode}]:</span>
        </div>
    `;
    output.innerHTML += `<div style="color: #888; margin-bottom: 20px;">Current mode: <span style="color: #22c55e;">${currentSearchMode}</span> | Type a movie name to search, or "help" for commands</div>`;
}

// Original movie search function (OMDB + TMDB)
async function searchMovie(query) {
    const loadingMsg = document.createElement('div');
    loadingMsg.className = 'loading';
    loadingMsg.textContent = 'Searching Movie Database...';
    output.appendChild(loadingMsg);
    
    try {
        const response = await fetch(`https://www.omdbapi.com/?t=${encodeURIComponent(query)}&type=movie&apikey=${OMDB_API_KEY}`);
        const data = await response.json();
        
        if (data.Response === 'True') {
            loadingMsg.textContent = 'Fetching TMDB data...';
            const tmdbData = await fetchTMDBData(data.imdbID);
            loadingMsg.remove();
            displayMovie(data, tmdbData);
        } else {
            loadingMsg.remove();
            output.innerHTML += '<div class="error">No movies found in detailed search. Try "yflix [movie name]" for more results.</div>';
        }
    } catch (error) {
        console.error('Error:', error);
        if (loadingMsg && loadingMsg.parentNode) {
            loadingMsg.remove();
        }
        output.innerHTML += '<div class="error">Error: Failed to fetch movie data. Please check your connection and try again.</div>';
    }
}

// New yflix search function
async function searchYflix(query) {
    const loadingMsg = document.createElement('div');
    loadingMsg.className = 'loading';
    loadingMsg.textContent = 'Searching yflix.to...';
    output.appendChild(loadingMsg);
    
    try {
        const response = await fetch(`${BACKEND_URL}/api/search-yflix/${encodeURIComponent(query)}`);
        const data = await response.json();
        
        loadingMsg.remove();
        
        if (data.success && data.results.length > 0) {
            displayYflixResults(data.results, query);
        } else {
            output.innerHTML += `<div class="error">No movies found on yflix.to for "${query}". Try a different search term.</div>`;
        }
    } catch (error) {
        console.error('Error searching yflix:', error);
        if (loadingMsg && loadingMsg.parentNode) {
            loadingMsg.remove();
        }
        output.innerHTML += '<div class="error">Error: Failed to connect to yflix search service. Make sure the backend server is running.</div>';
    }
}

function displayYflixResults(results, query) {
    let resultsHtml = `
        <div class="yflix-results">
            <div class="movie-title">🎬 Found ${results.length} movies for "${query}" on yflix.to</div>
    `;
    
    results.forEach((movie, index) => {
        resultsHtml += `
            <div class="movie-info yflix-item" style="margin-bottom: 1rem; cursor: pointer;" onclick="openYflixMovie('${movie.link}', '${movie.title.replace(/'/g, "\\'")}')">
                <div style="display: flex; align-items: center; gap: 1rem;">
                    ${movie.poster ? `<img src="${movie.poster}" alt="${movie.title}" style="width: 60px; height: 80px; object-fit: cover; border-radius: 6px;" onerror="this.style.display='none'">` : '<div style="width: 60px; height: 80px; background: rgba(255,255,255,0.1); border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 24px;">🎬</div>'}
                    <div style="flex: 1;">
                        <div style="font-weight: 600; color: #22c55e; margin-bottom: 0.25rem;">${movie.title}</div>
                        ${movie.year ? `<div style="color: #a1a1aa; font-size: 0.875rem;">Year: ${movie.year}</div>` : ''}
                        ${movie.quality ? `<div style="color: #fbbf24; font-size: 0.875rem;">Quality: ${movie.quality}</div>` : ''}
                        ${movie.rating ? `<div style="color: #f97316; font-size: 0.875rem;">Rating: ${movie.rating}</div>` : ''}
                        <div style="color: #71717a; font-size: 0.75rem; margin-top: 0.25rem;">Click to view on yflix.to</div>
                    </div>
                </div>
            </div>
        `;
    });
    
    resultsHtml += `
        </div>
        <div style="margin-top: 1rem; padding: 1rem; background: rgba(34, 197, 94, 0.05); border: 1px solid rgba(34, 197, 94, 0.2); border-radius: 8px; font-size: 0.875rem;">
            <div style="color: #22c55e; font-weight: 600;">💡 Tip:</div>
            <div style="color: #a1a1aa; margin-top: 0.5rem;">Click on any movie to view it on yflix.to. For detailed movie information, use "mode detailed" and search again.</div>
        </div>
    `;
    
    output.innerHTML += resultsHtml;
}

// Function to open yflix movie (called from HTML)
window.openYflixMovie = function(link, title) {
    output.innerHTML += `<div style="color: #22c55e; margin: 1rem 0;">🔗 Opening "${title}" on yflix.to...</div>`;
    window.open(link, '_blank');
};

async function fetchTMDBData(imdbID) {
    try {
        const response = await fetch(`https://api.themoviedb.org/3/find/${imdbID}?api_key=${TMDB_API_KEY}&external_source=imdb_id`);
        const data = await response.json();
        
        if (data.movie_results && data.movie_results.length > 0) {
            return data.movie_results[0];
        }
        return null;
    } catch (error) {
        console.error('TMDB API Error:', error);
        return null;
    }
}

function displayMovie(movie, tmdbData = null) {
    let runtime = movie.Runtime;
    if (runtime && runtime !== 'N/A') {
        const minutes = parseInt(runtime);
        if (!isNaN(minutes)) {
            runtime = `${Math.floor(minutes / 60)}h${minutes % 60}min`;
        }
    }
    
    let watchLink1 = null;
    let watchLink2 = null;
    if (tmdbData && tmdbData.id && tmdbData.title) {
        const formattedTitle = tmdbData.title.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
        watchLink1 = `https://pstream.mov/media/tmdb-movie-${tmdbData.id}-${formattedTitle}`;
        watchLink2 = `https://www.vlop.fun/watch/${tmdbData.id}`;
    }
    
    const movieHtml = `
        <div class="movie-info">
            <div class="movie-title">${movie.Title}</div> (${movie.Year}) - Detailed Info:
            <div><span class="rating">⭐ ${movie.imdbRating}/10 (IMDB)</span>${tmdbData ? ` | <span class="rating">🎬 ${tmdbData.vote_average.toFixed(1)}/10 (TMDB)</span>` : ''}</div>
            <div><span class="label">Duration:</span> .... ${runtime}</div>
            <div><span class="label">Director:</span> .... ${movie.Director}</div>
            <div><span class="label">Writer:</span> ...... ${movie.Writer}</div>
            <div><span class="label">Stars:</span> ....... ${movie.Actors}</div>
            <div><span class="label">ImdbID:</span> ....... ${movie.imdbID}</div>
            ${tmdbData ? `<div><span class="label">TMDB ID:</span> ...... ${tmdbData.id}</div>` : ''}
            ${tmdbData ? `<div><span class="label">TMDB Title:</span> ... ${tmdbData.title}</div>` : ''}
            <div><span class="label">Genre:</span> ....... <span class="genre">${movie.Genre}</span></div>
            ${movie.Plot !== 'N/A' ? `<div class="plot">Plot: ${movie.Plot}</div>` : ''}
            ${watchLink2 ? `<div><span class="label">Watch Now:</span> .... <a href="${watchLink2}" target="_blank" class="watch-link">🎬 Server 1 (ad-free)</a></div>` : ''}
            ${watchLink1 ? `<div><span class="label">Watch Now:</span> .... <a href="${watchLink1}" target="_blank" class="watch-link">🎬 Server 2 (ad-free)</a></div>` : ''}
        </div>
        <div style="margin-top: 1rem; padding: 1rem; background: rgba(59, 130, 246, 0.05); border: 1px solid rgba(59, 130, 246, 0.2); border-radius: 8px; font-size: 0.875rem;">
            <div style="color: #3b82f6; font-weight: 600;">🔍 Want more options?</div>
            <div style="color: #a1a1aa; margin-top: 0.5rem;">Try "yflix ${movie.Title}" to see more streaming options from yflix.to</div>
        </div>
    `;
    
    output.innerHTML += movieHtml;
}

// Initialize
output.innerHTML += `<div style="color: #888; margin-bottom: 20px;">Current mode: <span style="color: #22c55e;">${currentSearchMode}</span> | Type a movie name to search, or "help" for commands</div>`;

// Keep input focused
input.focus();
document.addEventListener('click', () => input.focus());
