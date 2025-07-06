# 🎵 Mijn Muziek Website

Een moderne, responsieve muziekwebsite die jouw YouTube-kanaal integreert en bezoekers laat browsen door je muziek.

## ✨ Features

- **YouTube API Integratie**: Automatisch ophalen van je laatste videos
- **Zoekfunctionaliteit**: Gebruikers kunnen zoeken door je muziek
- **Responsive Design**: Werkt perfect op mobiel en desktop
- **Video Player**: Ingebouwde YouTube speler
- **Modern UI**: Aantrekkelijke gradient design met animaties

## 🚀 Snelle Start

### 1. Repository Setup
```bash
git clone <je-repository>
cd muziek-website
npm install
```

### 2. YouTube API Key Verkrijgen

1. Ga naar [Google Cloud Console](https://console.cloud.google.com/)
2. Maak een nieuw project aan of selecteer een bestaand project
3. Activeer de YouTube Data API v3
4. Ga naar "Credentials" en maak een API Key aan
5. Kopieer je API key

### 3. YouTube Channel ID Vinden

1. Ga naar je YouTube kanaal
2. Klik op "Kanaal aanpassen"
3. Ga naar "Instellingen" → "Kanaal" → "Geavanceerde instellingen"
4. Kopieer je Kanaal-ID

**Of gebruik deze methode:**
- Ga naar je kanaal URL: `youtube.com/channel/UCxxxxxxxxxx`
- Het deel na `/channel/` is je Channel ID

### 4. Environment Variables

1. Kopieer `.env.example` naar `.env`
2. Vul je gegevens in:
```env
YOUTUBE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
YOUTUBE_CHANNEL_ID=UCxxxxxxxxxxxxxxxxxxxxxxxxx
PORT=3000
NODE_ENV=production
```

### 5. Lokaal Testen
```bash
npm run dev
```
Bezoek `http://localhost:3000`

## 📁 Project Structuur

```
muziek-website/
├── server.js              # Express server met API routes
├── package.json           # Dependencies en scripts
├── .env.example          # Environment variables template
├── .env                  # Je persoonlijke environment variables
├── public/
│   └── index.html        # Frontend HTML/CSS/JS
└── README.md            # Deze file
```

## 🌐 Deployment

### Op Render.com

1. **Repository koppelen**
   - Ga naar [Render.com](https://render.com)
   - Klik op "New" → "Web Service"
   - Koppel je GitHub repository

2. **Build Settings**
   - Build Command: `npm install`
   - Start Command: `npm start`

3. **Environment Variables**
   - Voeg je `YOUTUBE_API_KEY` toe
   - Voeg je `YOUTUBE_CHANNEL_ID` toe
   - Zet `NODE_ENV` op `production`

4. **Deploy**
   - Klik op "Create Web Service"
   - Wacht tot deployment voltooid is

### Op andere platforms

**Heroku:**
```bash
heroku create je-muziek-website
heroku config:set YOUTUBE_API_KEY=je_api_key
heroku config:set YOUTUBE_CHANNEL_ID=je_channel_id
git push heroku main
```

**Vercel/Netlify:**
Voor deze platforms heb je mogelijk een andere setup nodig omdat ze statische hosting bieden.

## 🎨 Aanpassingen

### Styling wijzigen
Bewerk de CSS in `public/index.html` tussen de `<style>` tags.

### Meer functies toevoegen
- Voeg nieuwe API endpoints toe in `server.js`
- Pas de frontend JavaScript aan in `public/index.html`

### Branding
- Wijzig de titel in `public/index.html`
- Voeg je logo toe
- Pas de kleuren aan in de CSS

## 🔧 API Endpoints

- `GET /api/videos` - Haal laatste videos op
- `GET /api/videos?pageToken=xxx` - Paginatie
- `GET /api/video/:id` - Specifieke video details
- `GET /api/search?q=zoekterm` - Zoeken in videos

## 🔐 Beveiliging

- API keys worden veilig opgeslagen in environment variables
- CORS en Helmet middleware voor extra beveiliging
- Rate limiting zou in productie toegevoegd kunnen worden

## 🐛 Troubleshooting

**"Fout bij laden van videos"**
- Controleer of je API key correct is
- Zorg dat YouTube Data API v3 actief is
- Controleer of je Channel ID klopt

**Videos laden niet**
- Controleer browser console voor errors
- Zorg dat je kanaal publiek is
- Test API endpoints apart: `/api/videos`

## 📱 Browser Ondersteuning

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobiele browsers

## 🆘 Support

Bij problemen:
1. Controleer browser console
2. Controleer server logs
3. Test API endpoints handmatig
4. Controleer environment variables

## 📄 Licentie

Dit project is open source. Pas het aan naar je wensen!
