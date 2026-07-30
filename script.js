const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

// Screen size ke hisab se image resolution auto-adjust
const IMAGE_SIZE = window.innerWidth < 600 ? 'w342' : 'w500';
const TMDB_IMAGE_BASE = `https://image.tmdb.org/t/p/${IMAGE_SIZE}`;

const movieInput = document.getElementById('movieInput');
let autocompleteTimeout;
let currentMovieId = null;

const indianLangs = ['hi', 'ta', 'te', 'ml', 'kn'];

window.addEventListener('DOMContentLoaded', () => {
  loadHomePageLiveNewReleases();
});

movieInput.addEventListener('input', function() {
  clearTimeout(autocompleteTimeout);
  const value = this.value.trim();
  if (value.length < 2) {
    document.getElementById('autocompleteContainer').innerHTML = '';
    return;
  }
  autocompleteTimeout = setTimeout(() => showAutocomplete(value), 300);
});

movieInput.addEventListener('keypress', function(e) {
  if (e.key === 'Enter') handleSearch();
});

async function showAutocomplete(query) {
  try {
    const res = await fetch(`${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&language=en-US&include_adult=false`);
    const data = await res.json();
    const autocompleteContainer = document.getElementById('autocompleteContainer');
    
    if (!data.results || data.results.length === 0) {
      autocompleteContainer.innerHTML = '';
      return;
    }

    let results = sortResultsByRelevance(data.results, query);
    const suggestions = results.slice(0, 5);

    autocompleteContainer.innerHTML = `
      <div class="autocomplete-box">
        ${suggestions.map(movie => `
          <div class="autocomplete-item" onclick="selectAutocomplete(${movie.id}, '${movie.title.replace(/'/g, "\\'")}')">
            🎬 ${movie.title} (${movie.release_date ? movie.release_date.split('-')[0] : 'N/A'})
          </div>
        `).join('')}
      </div>
    `;
  } catch (error) {
    console.error('Autocomplete error:', error);
  }
}

function selectAutocomplete(movieId, title) {
  currentMovieId = movieId;
  movieInput.value = title;
  document.getElementById('autocompleteContainer').innerHTML = '';
  fetchMovieDetails(movieId);
}

// Home Screen Live Auto Release Handler
async function loadHomePageLiveNewReleases() {
  const recContainer = document.getElementById('recommendationsContainer');
  recContainer.innerHTML = `<div class="loader"></div>`;

  try {
    const currentDate = new Date().toISOString().split('T')[0];
    
    const [bollywoodRes, hollywoodRes] = await Promise.all([
      fetch(`${TMDB_BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&language=en-US&sort_by=primary_release_date.desc&primary_release_date.lte=${currentDate}&with_original_language=hi&vote_count.gte=5&page=1`),
      fetch(`${TMDB_BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&language=en-US&sort_by=primary_release_date.desc&primary_release_date.lte=${currentDate}&with_original_language=en&vote_count.gte=10&page=1`)
    ]);

    const bollywoodData = await bollywoodRes.json();
    const hollywoodData = await hollywoodRes.json();

    let bollywoodList = (bollywoodData.results || []).filter(m => m.poster_path).slice(0, 6);
    let hollywoodList = (hollywoodData.results || []).filter(m => m.poster_path).slice(0, 6);

    recContainer.innerHTML = '';

    if (bollywoodList.length > 0) {
      renderSection('🆕 New & Recent Bollywood Releases', bollywoodList, recContainer);
    }

    if (hollywoodList.length > 0) {
      renderSection('🆕 New & Recent Hollywood Releases', hollywoodList, recContainer);
    }

  } catch (error) {
    console.error('Latest releases error:', error);
    recContainer.innerHTML = `<p class="status-msg">❌ Unable to fetch live updates.</p>`;
  }
}

// Search Logic
async function handleSearch() {
  const inputVal = movieInput.value.trim();
  if (!inputVal) {
    currentMovieId = null;
    document.getElementById('selectedContainer').innerHTML = '';
    loadHomePageLiveNewReleases();
    return;
  }

  document.getElementById('autocompleteContainer').innerHTML = '';
  document.getElementById('selectedContainer').innerHTML = '';
  document.getElementById('recommendationsContainer').innerHTML = `<div class="loader"></div>`;

  try {
    const searchRes = await fetch(`${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(inputVal)}&language=en-US&include_adult=false`);
    const searchData = await searchRes.json();

    if (!searchData.results || searchData.results.length === 0) {
      document.getElementById('recommendationsContainer').innerHTML = `<p class="status-msg">❌ No movie found matching this title.</p>`;
      return;
    }

    let sortedResults = sortResultsByRelevance(searchData.results, inputVal);
    currentMovieId = sortedResults[0].id;
    fetchMovieDetails(currentMovieId);
  } catch (error) {
    console.error('Search error:', error);
    document.getElementById('recommendationsContainer').innerHTML = `<p class="status-msg">❌ Search failed. Try again!</p>`;
  }
}

function sortResultsByRelevance(results, query) {
  const q = query.toLowerCase().trim();
  return results.sort((a, b) => {
    const titleA = (a.title || '').toLowerCase();
    const titleB = (b.title || '').toLowerCase();

    const exactA = titleA === q ? 3 : titleA.startsWith(q) ? 2 : titleA.includes(q) ? 1 : 0;
    const exactB = titleB === q ? 3 : titleB.startsWith(q) ? 2 : titleB.includes(q) ? 1 : 0;

    if (exactA !== exactB) return exactB - exactA;
    return (b.popularity || 0) - (a.popularity || 0);
  });
}

async function fetchMovieDetails(movieId) {
  const selectedContainer = document.getElementById('selectedContainer');

  try {
    const movieRes = await fetch(`${TMDB_BASE_URL}/movie/${movieId}?api_key=${TMDB_API_KEY}&append_to_response=belongs_to_collection&language=en-US`);
    const movieData = await movieRes.json();

    const poster = movieData.poster_path ? `${TMDB_IMAGE_BASE}${movieData.poster_path}` : 'https://via.placeholder.com/200x300/1e293b/f43f5e?text=No+Poster';

    selectedContainer.innerHTML = `
      <div class="selected-movie-box">
        <img src="${poster}" alt="${movieData.title}">
        <div class="selected-info">
          <h2>🎬 ${movieData.title} (${movieData.release_date ? movieData.release_date.split('-')[0] : 'N/A'})</h2>
          <p style="margin-bottom: 10px;">
            ${movieData.genres.map(g => `<span class="badge">${g.name}</span>`).join('')}
          </p>
          <p style="color: #cbd5e1; font-size: 0.95rem; margin-bottom: 10px; line-height: 1.5;">
            <strong>📖 Story Overview:</strong> ${movieData.overview || 'No description available.'}
          </p>
          <p style="color: #fbbf24; font-size: 0.85rem;">⭐ Rating: ${movieData.vote_average ? movieData.vote_average.toFixed(1) : 'N/A'}/10</p>
        </div>
      </div>
    `;

    await fetchSeparatedRecommendations(movieData);

  } catch (error) {
    console.error('Movie details error:', error);
  }
}

async function fetchSeparatedRecommendations(movieData) {
  const recContainer = document.getElementById('recommendationsContainer');
  recContainer.innerHTML = `<div class="loader"></div>`;

  try {
    const [bollywoodList, hollywoodList] = await Promise.all([
      fetchIndustryMoviesByStory(movieData, 'hi'),
      fetchIndustryMoviesByStory(movieData, 'en')
    ]);

    recContainer.innerHTML = '';

    if (bollywoodList.length > 0) {
      renderSection(`🇮🇳 Similar Theme Bollywood Matches (${bollywoodList.length})`, bollywoodList, recContainer);
    }

    if (hollywoodList.length > 0) {
      renderSection(`🎬 Similar Theme Hollywood Matches (${hollywoodList.length})`, hollywoodList, recContainer);
    }

    if (bollywoodList.length === 0 && hollywoodList.length === 0) {
      recContainer.innerHTML = `<p class="status-msg">😔 No similar story movies found.</p>`;
    }

  } catch (error) {
    console.error('Recommendations error:', error);
    recContainer.innerHTML = `<p class="status-msg">❌ Error fetching recommendations.</p>`;
  }
}

async function fetchIndustryMoviesByStory(movieData, langCode) {
  let resultMovies = [];
  const TARGET_LIMIT = 6;

  // 1. Franchise Sequels
  if (movieData.belongs_to_collection && movieData.belongs_to_collection.id) {
    const collectionRes = await fetch(`${TMDB_BASE_URL}/collection/${movieData.belongs_to_collection.id}?api_key=${TMDB_API_KEY}&language=en-US`);
    const collectionData = await collectionRes.json();
    if (collectionData.parts) {
      let parts = collectionData.parts.filter(m => m.id !== movieData.id && (langCode === 'en' ? !indianLangs.includes(m.original_language) : m.original_language === langCode));
      parts.sort((a, b) => new Date(a.release_date || 0) - new Date(b.release_date || 0));
      resultMovies.push(...parts);
    }
  }

  // 2. Story Recommendations
  if (resultMovies.length < TARGET_LIMIT) {
    const recRes = await fetch(`${TMDB_BASE_URL}/movie/${movieData.id}/recommendations?api_key=${TMDB_API_KEY}&language=en-US&page=1`);
    const recData = await recRes.json();
    let storyMatches = filterByLang(recData.results || [], langCode);
    resultMovies.push(...removeDuplicates(storyMatches, movieData.id, resultMovies));
  }

  // 3. Keyword Match
  if (resultMovies.length < TARGET_LIMIT) {
    const cleanTitle = movieData.title.split(/[:\-]/)[0].trim();
    const keySearchRes = await fetch(`${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(cleanTitle)}&language=en-US`);
    const keySearchData = await keySearchRes.json();
    let keyMatches = filterByLang(keySearchData.results || [], langCode);
    resultMovies.push(...removeDuplicates(keyMatches, movieData.id, resultMovies));
  }

  // 4. Genre Fallback
  if (resultMovies.length < TARGET_LIMIT && movieData.genres && movieData.genres.length > 0) {
    const genreIds = movieData.genres.map(g => g.id).join(',');
    const genreRes = await fetch(`${TMDB_BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&language=en-US&with_genres=${genreIds}&with_original_language=${langCode}&sort_by=vote_count.desc&page=1`);
    const genreData = await genreRes.json();
    let genreMovies = genreData.results || [];
    resultMovies.push(...removeDuplicates(genreMovies, movieData.id, resultMovies));
  }

  return resultMovies.slice(0, TARGET_LIMIT);
}

function filterByLang(movies, langCode) {
  if (langCode === 'hi') {
    return movies.filter(m => m.original_language === 'hi');
  } else {
    return movies.filter(m => !indianLangs.includes(m.original_language));
  }
}

function removeDuplicates(newMovies, currentId, existingList) {
  const existingIds = new Set(existingList.map(m => m.id));
  existingIds.add(currentId);

  const seen = new Set();
  return newMovies.filter(movie => {
    if (!movie || !movie.poster_path || existingIds.has(movie.id) || seen.has(movie.id)) return false;
    seen.add(movie.id);
    return true;
  });
}

function renderSection(title, movies, container) {
  const sectionTitle = document.createElement('h3');
  sectionTitle.classList.add('section-title');
  sectionTitle.innerText = title;
  container.appendChild(sectionTitle);

  const grid = document.createElement('div');
  grid.classList.add('movie-grid');

  movies.forEach((movie) => {
    const poster = movie.poster_path ? `${TMDB_IMAGE_BASE}${movie.poster_path}` : 'https://via.placeholder.com/200x300/1e293b/38bdf8?text=No+Poster';
    
    const card = document.createElement('div');
    card.classList.add('card');
    card.onclick = () => {
      movieInput.value = movie.title;
      currentMovieId = movie.id;
      window.scrollTo({ top: 0, behavior: 'smooth' });
      fetchMovieDetails(movie.id);
    };

    card.innerHTML = `
      <div class="quality-badge">⭐ ${movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A'}</div>
      <img src="${poster}" alt="${movie.title}">
      <div class="card-info">
        <h4 class="card-title">${movie.title}</h4>
        <div class="card-meta">📅 ${movie.release_date ? movie.release_date.split('-')[0] : 'N/A'}</div>
      </div>
    `;
    grid.appendChild(card);
  });

  container.appendChild(grid);
}