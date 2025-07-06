const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// YouTube API configuratie
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const CHANNEL_ID = process.env.YOUTUBE_CHANNEL_ID;

// API Routes
app.get('/api/videos', async (req, res) => {
  try {
    const { maxResults = 12, pageToken = '' } = req.query;
    
    const response = await axios.get('https://www.googleapis.com/youtube/v3/search', {
      params: {
        key: YOUTUBE_API_KEY,
        channelId: CHANNEL_ID,
        part: 'snippet',
        order: 'date',
        type: 'video',
        maxResults: maxResults,
        pageToken: pageToken
      }
    });

    // Haal extra video details op
    const videoIds = response.data.items.map(item => item.id.videoId).join(',');
    const detailsResponse = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
      params: {
        key: YOUTUBE_API_KEY,
        id: videoIds,
        part: 'statistics,contentDetails'
      }
    });

    // Combineer data
    const videosWithDetails = response.data.items.map(item => {
      const details = detailsResponse.data.items.find(detail => detail.id === item.id.videoId);
      return {
        id: item.id.videoId,
        title: item.snippet.title,
        description: item.snippet.description,
        thumbnail: item.snippet.thumbnails.medium.url,
        publishedAt: item.snippet.publishedAt,
        viewCount: details?.statistics?.viewCount || 0,
        likeCount: details?.statistics?.likeCount || 0,
        duration: details?.contentDetails?.duration || ''
      };
    });

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
