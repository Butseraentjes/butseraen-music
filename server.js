let currentPageToken = '';
let currentSearchTerm = '';
let isSearchMode = false;

async function loadLatestVideos() {
    isSearchMode = false;
    currentPageToken = '';
    currentSearchTerm = '';
    
    showLoading();
    
    try {
        const response = await fetch('/api/videos');
        const data = await response.json();
        
        if (data.videos) {
            displayVideos(data.videos, true);
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
        const response = await fetch(`/api/search?q=${encodeURIComponent(searchTerm)}`);
        const data = await response.json();
        
        if (data.videos) {
            displayVideos(data.videos, true);
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

async function loadMoreVideos() {
    if (!currentPageToken || isSearchMode) return;
    
    showLoading();
    
    try {
        const response = await fetch(`/api/videos?pageToken=${currentPageToken}`);
        const data = await response.json();
        
        if (data.videos) {
            displayVideos(data.videos, false);
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
    const viewCount = parseInt(video.viewCount || 0).toLocaleString('nl-NL');
    
    card.innerHTML = `
        <img src="${video.thumbnail}" alt="${video.title}" class="video-thumbnail">
        <div class="video-info">
            <h3 class="video-title">${video.title}</h3>
            <p class="video-description">${video.description}</p>
            <div class="video-meta">
                <span>${publishDate}</span>
                <span>${viewCount} weergaven</span>
            </div>
        </div>
    `;
    
    return card;
}

async function openVideoModal(videoId) {
    const modal = document.getElementById('videoModal');
    const modalContent = document.getElementById('modalContent');
    
    modalContent.innerHTML = '<p>Laden...</p>';
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
            <h2>${video.title}</h2>
            <p style="color: #666; margin: 10px 0;">
                ${new Date(video.publishedAt).toLocaleDateString('nl-NL')} • 
                ${parseInt(video.viewCount || 0).toLocaleString('nl-NL')} weergaven
            </p>
            <p style="line-height: 1.6; margin-top: 15px;">${video.description}</p>
        `;
    } catch (error) {
        console.error('Fout bij laden van video details:', error);
        modalContent.innerHTML = '<p>Fout bij het laden van video details.</p>';
    }
}

function closeModal() {
    document.getElementById('videoModal').style.display = 'none';
}

function updateLoadMoreButton() {
    const loadMoreBtn = document.getElementById('loadMore');
    loadMoreBtn.style.display = currentPageToken ? 'block' : 'none';
}

function showLoading() {
    document.getElementById('loading').style.display = 'block';
}

function hideLoading() {
    document.getElementById('loading').style.display = 'none';
}

function showError(message) {
    const grid = document.getElementById('videoGrid');
    grid.innerHTML = `<div style="text-align: center; color: white; padding: 40px;">
        <h3>⚠️ ${message}</h3>
    </div>`;
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    // Button event listeners
    document.getElementById('searchBtn').addEventListener('click', searchVideos);
    document.getElementById('latestBtn').addEventListener('click', loadLatestVideos);
    document.getElementById('loadMoreBtn').addEventListener('click', loadMoreVideos);
    document.getElementById('closeModal').addEventListener('click', closeModal);

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

    // Load videos when page loads
    loadLatestVideos();
});
