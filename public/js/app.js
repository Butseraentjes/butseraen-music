let currentPageToken = '';
let currentSearchTerm = '';
let isSearchMode = false;
let currentMode = 'latest'; // 'latest' or 'playlists'
let currentPlaylistId = '';
let allPlaylists = [];
let allVideos = [];

async function loadChannelStats() {
    try {
        const response = await fetch('/api/channel-stats');
        if (response.ok) {
            const stats = await response.json();
            updateStatsDisplay(stats);
        }
    } catch (error) {
        console.log('Could not load channel stats:', error);
    }
}

function updateStatsDisplay(stats) {
    document.getElementById('totalVideos').textContent = stats.videoCount || '-';
    document.getElementById('totalViews').textContent = formatNumber(stats.viewCount) || '-';
    document.getElementById('totalSubscribers').textContent = formatNumber(stats.subscriberCount) || '-';
}

function formatNumber(num) {
    if (!num) return '-';
    const number = parseInt(num);
    if (number >= 1000000) return (number / 1000000).toFixed(1) + 'M';
    if (number >= 1000) return (number / 1000).toFixed(1) + 'K';
    return number.toLocaleString();
}

async function loadLatestVideos() {
    currentMode = 'latest';
    isSearchMode = false;
    currentPageToken = '';
    currentSearchTerm = '';
    currentPlaylistId = '';
    
    showLoading();
    
    try {
        const response = await fetch('/api/videos?maxResults=24&order=date');
        const data = await response.json();
        
        if (data.videos) {
            // Sort by date to ensure newest first
            allVideos = data.videos.sort((a, b) => {
                return new Date(b.publishedAt) - new Date(a.publishedAt);
            });
            
            displayVideos(allVideos, true);
            currentPageToken = data.nextPageToken || '';
            updateLoadMoreButton();
        } else {
            throw new Error('Geen video data ontvangen');
        }
    } catch (error) {
        console.error('Fout bij laden van videos:', error);
        showError('Fout bij het laden van videos. Controleer je API instellingen.');
    } finally {
        hideLoading();
    }
}

async function loadPlaylists() {
    try {
        showLoading();
        const response = await fetch('/api/playlists');
        const data = await response.json();
        
        if (data.playlists) {
            allPlaylists = data.playlists;
            populatePlaylistSelector();
            
            // Show message to select playlist
            const grid = document.getElementById('videoGrid');
            grid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 60px; color: var(--primary-gold);">
                    <i class="fas fa-list" style="font-size: 3rem; margin-bottom: 20px;"></i>
                    <h3>Select a playlist above to view videos</h3>
                    <p style="color: #bbb; margin-top: 10px;">You have ${allPlaylists.length} playlist(s) available</p>
                </div>
            `;
        } else {
            throw new Error('Geen playlists gevonden');
        }
    } catch (error) {
        console.error('Fout bij laden van playlists:', error);
        showError('Fout bij het laden van playlists.');
    } finally {
        hideLoading();
    }
}

function populatePlaylistSelector() {
    const select = document.getElementById('playlistSelect');
    select.innerHTML = '<option value="">Select a playlist...</option>';
    
    allPlaylists.forEach(playlist => {
        const option = document.createElement('option');
        option.value = playlist.id;
        option.textContent = `${playlist.title} (${playlist.itemCount} videos)`;
        select.appendChild(option);
    });
}

async function loadPlaylistVideos(playlistId) {
    if (!playlistId) return;
    
    currentPlaylistId = playlistId;
    showLoading();
    
    try {
        const response = await fetch(`/api/playlist/${playlistId}/videos?maxResults=50`);
        const data = await response.json();
        
        if (data.videos) {
            allVideos = data.videos;
            displayVideos(allVideos, true);
            
            // Update load more button (playlists don't typically need pagination)
            document.getElementById('loadMore').style.display = 'none';
        } else {
            throw new Error('Geen videos gevonden in playlist');
        }
    } catch (error) {
        console.error('Fout bij laden van playlist videos:', error);
        showError('Fout bij het laden van playlist videos.');
    } finally {
        hideLoading();
    }
}

async function searchVideos() {
    const searchTerm = document.getElementById('searchInput').value.trim();
    if (!searchTerm) {
        alert('Voer een zoekterm in');
        return;
    }

    isSearchMode = true;
    currentSearchTerm = searchTerm;
    currentPageToken = '';
    
    showLoading();
    
    try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(searchTerm)}&maxResults=20`);
        const data = await response.json();
        
        if (data.videos) {
            allVideos = data.videos;
            displayVideos(allVideos, true);
            document.getElementById('loadMore').style.display = 'none';
        } else {
            throw new Error('Geen zoekresultaten ontvangen');
        }
    } catch (error) {
        console.error('Fout bij zoeken:', error);
        showError('Fout bij het zoeken. Probeer het opnieuw.');
    } finally {
        hideLoading();
    }
}

function setActiveMode(mode) {
    currentMode = mode;
    
    // Update button states
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-category="${mode}"]`).classList.add('active');
    
    // Show/hide playlist selector
    const playlistSelector = document.getElementById('playlistSelector');
    const loadPlaylistsBtn = document.getElementById('loadPlaylistsBtn');
    
    if (mode === 'playlists') {
        playlistSelector.style.display = 'block';
        loadPlaylistsBtn.style.display = 'inline-block';
        loadPlaylists();
    } else {
        playlistSelector.style.display = 'none';
        loadPlaylistsBtn.style.display = 'none';
        loadLatestVideos();
    }
}

async function loadMoreVideos() {
    if (!currentPageToken || isSearchMode || currentMode === 'playlists') return;
    
    showLoading();
    
    try {
        const response = await fetch(`/api/videos?pageToken=${currentPageToken}&maxResults=12&order=date`);
        const data = await response.json();
        
        if (data.videos) {
            const newVideos = data.videos;
            allVideos = [...allVideos, ...newVideos];
            displayVideos(allVideos, true);
            currentPageToken = data.nextPageToken || '';
            updateLoadMoreButton();
        }
    } catch (error) {
        console.error('Fout bij laden van meer videos:', error);
        showError('Fout bij het laden van meer videos.');
    } finally {
        hideLoading();
    }
}

function displayVideos(videos, clearFirst = false) {
    const grid = document.getElementById('videoGrid');
    
    if (clearFirst) {
        grid.innerHTML = '';
    }
    
    if (videos.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1 / -1;" class="error-message">
                <i class="fas fa-search"></i>
                <h3>No videos found</h3>
                <p>Try a different search term or playlist.</p>
            </div>
        `;
        return;
    }
    
    videos.forEach(video => {
        const videoCard = createVideoCard(video);
        grid.appendChild(videoCard);
    });
}

function createVideoCard(video) {
    const card = document.createElement('div');
    card.className = 'video-card';
    card.addEventListener('click', () => openVideoModal(video.id));
    
    const publishDate = new Date(video.publishedAt).toLocaleDateString('nl-NL');
    const viewCount = formatNumber(parseInt(video.viewCount || 0));
    
    // Calculate how many days ago the video was published
    const daysAgo = Math.floor((new Date() - new Date(video.publishedAt)) / (1000 * 60 * 60 * 24));
    let timeAgo = '';
    if (daysAgo === 0) timeAgo = 'Today';
    else if (daysAgo === 1) timeAgo = 'Yesterday';
    else if (daysAgo < 30) timeAgo = `${daysAgo} days ago`;
    else if (daysAgo < 365) timeAgo = `${Math.floor(daysAgo / 30)} months ago`;
    else timeAgo = `${Math.floor(daysAgo / 365)} years ago`;
    
    // Get playlist info if in playlist mode
    let categoryBadge = '';
    if (currentMode === 'playlists' && currentPlaylistId) {
        const playlist = allPlaylists.find(p => p.id === currentPlaylistId);
        if (playlist) {
            categoryBadge = `
                <span class="video-category">
                    <i class="fas fa-list"></i> ${playlist.title}
                </span>
            `;
        }
    } else {
        categoryBadge = `
            <span class="video-category">
                <i class="fas fa-video"></i> Latest
            </span>
        `;
    }
    
    card.innerHTML = `
        <div class="video-thumbnail-container">
            <img src="${video.thumbnail}" alt="${video.title}" class="video-thumbnail">
            <div class="video-overlay">
                <div class="play-button">
                    <i class="fas fa-play"></i>
                </div>
            </div>
        </div>
        <div class="video-info">
            <h3 class="video-title">${video.title}</h3>
            <p class="video-description">${video.description}</p>
            <div class="video-meta">
                <div>
                    <div style="margin-bottom: 8px;">${timeAgo} • ${viewCount} views</div>
                    ${categoryBadge}
                </div>
            </div>
        </div>
    `;
    
    return card;
}

async function openVideoModal(videoId) {
    const modal = document.getElementById('videoModal');
    const modalContent = document.getElementById('modalContent');
    
    modalContent.innerHTML = `
        <div style="text-align: center; padding: 40px;">
            <i class="fas fa-spinner fa-spin" style="font-size: 2rem; color: var(--primary-gold);"></i>
            <br><br>
            <span style="color: var(--primary-gold);">Loading video...</span>
        </div>
    `;
    modal.style.display = 'block';
    
    try {
        const response = await fetch(`/api/video/${videoId}`);
        const video = await response.json();
        
        modalContent.innerHTML = `
            <iframe class="video-player" 
                    src="https://www.youtube.com/embed/${videoId}?autoplay=1" 
                    frameborder="0" 
                    allowfullscreen>
            </iframe>
            <h2 style="color: var(--primary-gold); margin-bottom: 15px;">${video.title}</h2>
            <p style="color: #bbb; margin-bottom: 20px; font-size: 1.1rem;">
                <i class="fas fa-calendar"></i> ${new Date(video.publishedAt).toLocaleDateString('nl-NL')} • 
                <i class="fas fa-eye"></i> ${formatNumber(parseInt(video.viewCount || 0))} views •
                <i class="fas fa-thumbs-up"></i> ${formatNumber(parseInt(video.likeCount || 0))} likes
            </p>
            <div style="line-height: 1.6; color: #ccc;">${video.description.replace(/\n/g, '<br>')}</div>
        `;
    } catch (error) {
        console.error('Fout bij laden van video details:', error);
        modalContent.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #ff6b6b;">
                <i class="fas fa-exclamation-triangle" style="font-size: 2rem;"></i>
                <br><br>Error loading video details.
            </div>
        `;
    }
}

function closeModal() {
    document.getElementById('videoModal').style.display = 'none';
}

function updateLoadMoreButton() {
    const loadMoreBtn = document.getElementById('loadMore');
    loadMoreBtn.style.display = (currentPageToken && currentMode === 'latest') ? 'block' : 'none';
}

function showLoading() {
    document.getElementById('loading').style.display = 'block';
}

function hideLoading() {
    document.getElementById('loading').style.display = 'none';
}

function showError(message) {
    const grid = document.getElementById('videoGrid');
    grid.innerHTML = `
        <div style="grid-column: 1 / -1;" class="error-message">
            <i class="fas fa-exclamation-triangle"></i>
            <h3>${message}</h3>
        </div>
    `;
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    // Button event listeners
    document.getElementById('searchBtn').addEventListener('click', searchVideos);
    document.getElementById('loadMoreBtn').addEventListener('click', loadMoreVideos);
    document.getElementById('closeModal').addEventListener('click', closeModal);
    document.getElementById('loadPlaylistsBtn').addEventListener('click', loadPlaylists);

    // Mode filter listeners
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            setActiveMode(btn.dataset.category);
        });
    });

    // Playlist selector
    document.getElementById('playlistSelect').addEventListener('change', function() {
        if (this.value) {
            loadPlaylistVideos(this.value);
        }
    });

    // Search input enter key
    document.getElementById('searchInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchVideos();
        }
    });

    // Modal click outside to close
    window.addEventListener('click', function(event) {
        const modal = document.getElementById('videoModal');
        if (event.target === modal) {
            closeModal();
        }
    });

    // Load initial content
    loadChannelStats();
    loadLatestVideos();
});
