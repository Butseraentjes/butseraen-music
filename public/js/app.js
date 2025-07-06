let currentPageToken = '';
let currentSearchTerm = '';
let isSearchMode = false;
let currentCategory = 'all';
let allVideos = [];

// Category keywords for filtering
const categoryKeywords = {
    western: ['western', 'butseraen', 'instrumental', 'music', 'town', 'frontier', 'cowboy', 'wild west', 'cinematic'],
    tractor: ['tractor', 'landbouw', 'farming', 'agricultural', 'machine', 'traktor'],
    family: ['family', 'helena', 'efteling', 'weekend', 'holiday', 'vacation', 'trip', 'marraine', 'rachel'],
    school: ['school', 'scholenveld', 'leerkrachten', 'children', 'event', 'loop', 'lebbeke']
};

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

function categorizeVideo(video) {
    const title = video.title.toLowerCase();
    const description = video.description.toLowerCase();
    const text = title + ' ' + description;
    
    for (const [category, keywords] of Object.entries(categoryKeywords)) {
        if (keywords.some(keyword => text.includes(keyword))) {
            return category;
        }
    }
    return 'other';
}

async function loadLatestVideos() {
    isSearchMode = false;
    currentPageToken = '';
    currentSearchTerm = '';
    
    showLoading();
    
    try {
        // Vraag expliciet naar videos gesorteerd op datum (nieuwste eerst)
        const response = await fetch('/api/videos?maxResults=24&order=date');
        const data = await response.json();
        
        if (data.videos) {
            // Sorteer nog een keer op datum om zeker te zijn dat nieuwste eerst komen
            const sortedVideos = data.videos.sort((a, b) => {
                return new Date(b.publishedAt) - new Date(a.publishedAt);
            });
            
            // Add categories to videos
            allVideos = sortedVideos.map(video => ({
                ...video,
                category: categorizeVideo(video)
            }));
            
            filterAndDisplayVideos();
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
        const response = await fetch(`/api/search?q=${encodeURIComponent(searchTerm)}&maxResults=20`);
        const data = await response.json();
        
        if (data.videos) {
            allVideos = data.videos.map(video => ({
                ...video,
                category: categorizeVideo(video)
            }));
            
            filterAndDisplayVideos();
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

function filterAndDisplayVideos() {
    let videosToShow = allVideos;
    
    if (currentCategory !== 'all') {
        videosToShow = allVideos.filter(video => video.category === currentCategory);
    }
    
    displayVideos(videosToShow, true);
    
    // Update de grid display text
    const grid = document.getElementById('videoGrid');
    if (videosToShow.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1 / -1;" class="error-message">
                <i class="fas fa-search"></i>
                <h3>Geen videos gevonden in deze categorie</h3>
                <p>Probeer een andere categorie of zoekterm.</p>
            </div>
        `;
    }
}

function setActiveCategory(category) {
    currentCategory = category;
    
    // Update button states
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-category="${category}"]`).classList.add('active');
    
    // Filter and display videos
    filterAndDisplayVideos();
}

async function loadMoreVideos() {
    if (!currentPageToken || isSearchMode) return;
    
    showLoading();
    
    try {
        const response = await fetch(`/api/videos?pageToken=${currentPageToken}&maxResults=12&order=date`);
        const data = await response.json();
        
        if (data.videos) {
            const newVideos = data.videos.map(video => ({
                ...video,
                category: categorizeVideo(video)
            }));
            
            allVideos = [...allVideos, ...newVideos];
            filterAndDisplayVideos();
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
    const viewCount = formatNumber(parseInt(video.viewCount || 0));
    
    // Get category display info
    const categoryInfo = getCategoryDisplayInfo(video.category);
    
    // Calculate how many days ago the video was published
    const daysAgo = Math.floor((new Date() - new Date(video.publishedAt)) / (1000 * 60 * 60 * 24));
    let timeAgo = '';
    if (daysAgo === 0) timeAgo = 'Today';
    else if (daysAgo === 1) timeAgo = 'Yesterday';
    else if (daysAgo < 30) timeAgo = `${daysAgo} days ago`;
    else if (daysAgo < 365) timeAgo = `${Math.floor(daysAgo / 30)} months ago`;
    else timeAgo = `${Math.floor(daysAgo / 365)} years ago`;
    
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
                    <span class="video-category">
                        <i class="${categoryInfo.icon}"></i> ${categoryInfo.name}
                    </span>
                </div>
            </div>
        </div>
    `;
    
    return card;
}

function getCategoryDisplayInfo(category) {
    const categoryMap = {
        western: { name: 'Western Music', icon: 'fas fa-guitar' },
        tractor: { name: 'Tractor Show', icon: 'fas fa-tractor' },
        family: { name: 'Family Time', icon: 'fas fa-heart' },
        school: { name: 'School Event', icon: 'fas fa-graduation-cap' },
        other: { name: 'Other', icon: 'fas fa-video' }
    };
    
    return categoryMap[category] || categoryMap.other;
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
    loadMoreBtn.style.display = (currentPageToken && currentCategory === 'all') ? 'block' : 'none';
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
    document.getElementById('latestBtn').addEventListener('click', loadLatestVideos);
    document.getElementById('loadMoreBtn').addEventListener('click', loadMoreVideos);
    document.getElementById('closeModal').addEventListener('click', closeModal);

    // Category filter listeners
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            setActiveCategory(btn.dataset.category);
        });
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
