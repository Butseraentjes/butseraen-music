const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// YouTube API configuratie
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const CHANNEL_ID = process.env.YOUTUBE_CHANNEL_ID;

// Middleware - CSP uitgeschakeld voor testen
app.use(helmet({
  contentSecurityPolicy: false
}));
app.use(compression());
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// API Routes
app.get('/api/playlists', async (req, res) => {
  try {
    const response = await axios.get('https://www.googleapis.com/youtube/v3/playlists', {
      params: {
        key: YOUTUBE_API_KEY,
        channelId: CHANNEL_ID,
        part: 'snippet,contentDetails',
        maxResults: 50
      }
    });

    const playlists = response.data.items.map(playlist => ({
      id: playlist.id,
      title: playlist.snippet.title,
      description: playlist.snippet.description,
      thumbnail: playlist.snippet.thumbnails.medium?.url || playlist.snippet.thumbnails.default?.url,
      itemCount: playlist.contentDetails.itemCount,
      publishedAt: playlist.snippet.publishedAt
    }));

    res.json({ playlists });
  } catch (error) {
    console.error('YouTube API Error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Fout bij ophalen van playlists' });
  }
});

app.get('/api/playlist/:id/videos', async (req, res) => {
  try {
    const { id } = req.params;
    const { maxResults = 20, pageToken = '' } = req.query;
    
    const response = await axios.get('https://www.googleapis.com/youtube/v3/playlistItems', {
      params: {
        key: YOUTUBE_API_KEY,
        playlistId: id,
        part: 'snippet',
        maxResults: maxResults,
        pageToken: pageToken
      }
    });

    // Haal video details op
    const videoIds = response.data.items.map(item => item.snippet.resourceId.videoId).join(',');
    
    let videosWithDetails = [];
    if (videoIds) {
      const detailsResponse = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
        params: {
          key: YOUTUBE_API_KEY,
          id: videoIds,
          part: 'statistics,contentDetails'
        }
      });

      videosWithDetails = response.data.items.map(item => {
        const details = detailsResponse.data.items.find(detail => detail.id === item.snippet.resourceId.videoId);
        return {
          id: item.snippet.resourceId.videoId,
          title: item.snippet.title,
          description: item.snippet.description,
          thumbnail: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url,
          publishedAt: item.snippet.publishedAt,
          viewCount: details?.statistics?.viewCount || 0,
          likeCount: details?.statistics?.likeCount || 0,
          duration: details?.contentDetails?.duration || ''
        };
      });
    }

    res.json({
      videos: videosWithDetails,
      nextPageToken: response.data.nextPageToken,
      totalResults: response.data.pageInfo.totalResults
    });
  } catch (error) {
    console.error('YouTube API Error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Fout bij ophalen van playlist videos' });
  }
});

app.get('/api/videos', async (req, res) => {
  try {
    const { maxResults = 12, pageToken = '', order = 'date' } = req.query;
    
    // Gebruik activities API om echt de nieuwste content te krijgen
    let response;
    if (order === 'date' && !pageToken) {
      // Voor de eerste pagina, probeer activities API voor echte nieuwste content
      try {
        response = await axios.get('https://www.googleapis.com/youtube/v3/activities', {
          params: {
            key: YOUTUBE_API_KEY,
            channelId: CHANNEL_ID,
            part: 'snippet,contentDetails',
            maxResults: maxResults,
            publishedAfter: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString() // Laatste jaar
          }
        });
        
        // Filter alleen video uploads
        const videoActivities = response.data.items.filter(item => 
          item.snippet.type === 'upload' && 
          item.contentDetails?.upload?.videoId
        );
        
        if (videoActivities.length > 0) {
          // Haal video details op
          const videoIds = videoActivities.map(item => item.contentDetails.upload.videoId).join(',');
          
          const detailsResponse = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
            params: {
              key: YOUTUBE_API_KEY,
              id: videoIds,
              part: 'snippet,statistics,contentDetails'
            }
          });

          const videosWithDetails = detailsResponse.data.items.map(video => ({
            id: video.id,
            title: video.snippet.title,
            description: video.snippet.description,
            thumbnail: video.snippet.thumbnails.medium?.url || video.snippet.thumbnails.default?.url,
            publishedAt: video.snippet.publishedAt,
            viewCount: video.statistics?.viewCount || 0,
            likeCount: video.statistics?.likeCount || 0,
            duration: video.contentDetails?.duration || ''
          }));

          // Sorteer op publicatiedatum (nieuwste eerst)
          videosWithDetails.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

          return res.json({
            videos: videosWithDetails,
            nextPageToken: null, // Activities API heeft andere paginatie
            totalResults: videosWithDetails.length
          });
        }
      } catch (activityError) {
        console.log('Activities API failed, falling back to search API');
      }
    }
    
    // Fallback naar search API
    response = await axios.get('https://www.googleapis.com/youtube/v3/search', {
      params: {
        key: YOUTUBE_API_KEY,
        channelId: CHANNEL_ID,
        part: 'snippet',
        order: 'date', // Probeer alsnog date ordering
        type: 'video',
        maxResults: maxResults * 2, // Haal meer op om te kunnen filteren
        pageToken: pageToken,
        publishedAfter: new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000).toISOString() // Laatste 2 jaar
      }
    });

    const videoIds = response.data.items.map(item => item.id.videoId).join(',');
    
    let videosWithDetails = [];
    if (videoIds) {
      const detailsResponse = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
        params: {
          key: YOUTUBE_API_KEY,
          id: videoIds,
          part: 'statistics,contentDetails'
        }
      });

      videosWithDetails = response.data.items.map(item => {
        const details = detailsResponse.data.items.find(detail => detail.id === item.id.videoId);
        return {
          id: item.id.videoId,
          title: item.snippet.title,
          description: item.snippet.description,
          thumbnail: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url,
          publishedAt: item.snippet.publishedAt,
          viewCount: details?.statistics?.viewCount || 0,
          likeCount: details?.statistics?.likeCount || 0,
          duration: details?.contentDetails?.duration || ''
        };
      });
      
      // EXTRA SORTERING: Sorteer nogmaals op datum om zeker te zijn
      videosWithDetails.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
      
      // Neem alleen de gevraagde hoeveelheid
      videosWithDetails = videosWithDetails.slice(0, maxResults);
    }

    res.json({
      videos: videosWithDetails,
      nextPageToken: response.data.nextPageToken,
      totalResults: response.data.pageInfo.totalResults
    });
  } catch (error) {
    console.error('YouTube API Error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Fout bij ophalen van videos' });
  }
});

app.get('/api/video/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const response = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
      params: {
        key: YOUTUBE_API_KEY,
        id: id,
        part: 'snippet,statistics,contentDetails'
      }
    });

    if (response.data.items.length === 0) {
      return res.status(404).json({ error: 'Video niet gevonden' });
    }

    const video = response.data.items[0];
    res.json({
      id: video.id,
      title: video.snippet.title,
      description: video.snippet.description,
      thumbnail: video.snippet.thumbnails.high.url,
      publishedAt: video.snippet.publishedAt,
      viewCount: video.statistics.viewCount,
      likeCount: video.statistics.likeCount,
      duration: video.contentDetails.duration,
      tags: video.snippet.tags || []
    });
  } catch (error) {
    console.error('YouTube API Error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Fout bij ophalen van video' });
  }
});

app.get('/api/channel-stats', async (req, res) => {
  try {
    const response = await axios.get('https://www.googleapis.com/youtube/v3/channels', {
      params: {
        key: YOUTUBE_API_KEY,
        id: CHANNEL_ID,
        part: 'statistics,snippet'
      }
    });

    if (response.data.items.length === 0) {
      return res.status(404).json({ error: 'Kanaal niet gevonden' });
    }

    const channel = response.data.items[0];
    res.json({
      subscriberCount: channel.statistics.subscriberCount,
      videoCount: channel.statistics.videoCount,
      viewCount: channel.statistics.viewCount,
      title: channel.snippet.title,
      description: channel.snippet.description
    });
  } catch (error) {
    console.error('YouTube API Error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Fout bij ophalen van kanaal statistieken' });
  }
});

app.get('/api/search', async (req, res) => {
  try {
    const { q, maxResults = 10 } = req.query;
    
    if (!q) {
      return res.status(400).json({ error: 'Zoekterm is verplicht' });
    }

    const response = await axios.get('https://www.googleapis.com/youtube/v3/search', {
      params: {
        key: YOUTUBE_API_KEY,
        channelId: CHANNEL_ID,
        part: 'snippet',
        q: q,
        type: 'video',
        maxResults: maxResults
      }
    });

    const videos = response.data.items.map(item => ({
      id: item.id.videoId,
      title: item.snippet.title,
      description: item.snippet.description,
      thumbnail: item.snippet.thumbnails.medium.url,
      publishedAt: item.snippet.publishedAt
    }));

    res.json({ videos });
  } catch (error) {
    console.error('YouTube API Error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Fout bij zoeken' });
  }
});

// Serve React app
app.get('*', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

app.listen(PORT, () => {
  console.log(`Server draait op poort ${PORT}`);
});
