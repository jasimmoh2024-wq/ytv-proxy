const express = require('express');
const axios = require('axios');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

const SECRET_TOKENS = new Map();
const ALLOWED_DOMAINS = ['jasimmoh2024-wq.github.io', 'ytv-proxy', 'localhost', '127.0.0.1'];

app.use(cors({ origin: '*', methods: ['GET'], allowedHeaders: ['Content-Type', 'Range'] }));

// === 1. ملف app-ads.txt لشركة START.IO ===
app.get('/app-ads.txt', (req, res) => {
    res.set('Content-Type', 'text/plain');
    res.send('start.io, 110183401, DIRECT, d4c1a32e9ccbda8e');
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/api/get-token', (req, res) => {
    const token = crypto.randomBytes(16).toString('hex');
    SECRET_TOKENS.set(token, Date.now() + 10 * 60 * 1000);
    for (let [k, v] of SECRET_TOKENS) if (v < Date.now()) SECRET_TOKENS.delete(k);
    res.json({ token });
});

app.get('/api/channels', (req, res) => {
    const token = req.query.token;
    if (!token || !SECRET_TOKENS.has(token) || SECRET_TOKENS.get(token) < Date.now()) {
        return res.status(403).json({ error: 'ممنوع' });
    }
    SECRET_TOKENS.delete(token);
    const filePath = path.join(__dirname, 'channels.m3u');
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'ملف channels.m3u غير موجود' });
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const channels = [];
    let currentName = '', currentLogo = '';
    for (let line of lines) {
        line = line.trim();
        if (!line) continue; 
        if (line.startsWith('#EXTINF:')) {
            let logoMatch = line.match(/tvg-logo="([^"]+)"/i);
            currentLogo = logoMatch ? logoMatch[1] : '';
            let nameMatch = line.match(/tvg-name="([^"]+)"/i);
            currentName = nameMatch ? nameMatch[1] : line.substring(line.lastIndexOf(',') + 1).trim() || 'عرض بدون اسم';
        } else if (line.startsWith('http')) {
            channels.push({ name: currentName || 'عرض غير مسمّى', logo: currentLogo, url: Buffer.from(line).toString('base64') });
            currentName = ''; currentLogo = '';
        }
    }
    res.json(channels);
});

app.get('/stream', async (req, res) => {
    let targetUrl = req.query.url;
    if (!targetUrl) return res.status(400).send('رابط ناقص');
    try{
        try{ if(!targetUrl.startsWith('http')) targetUrl = Buffer.from(targetUrl, 'base64').toString('utf-8'); }catch(e){}
        const response = await axios({ method: 'get', url: targetUrl, responseType: 'stream', timeout: 20000, headers: { 'User-Agent': 'Mozilla/5.0 (Linux; Android 10; ExoPlayer) AppleWebKit/537.36', 'Accept': '*/*' } });
        res.setHeader('Content-Type', response.headers['content-type'] || 'video/mp2t');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Access-Control-Allow-Origin', '*');
        response.data.pipe(res);
        req.on('close', () => response.data.destroy());
    }catch(e){ if (!res.headersSent) res.status(500).send('خطأ في البث'); }
});

app.listen(PORT, () => console.log(`Server running on ${PORT}`));
