const express = require('express');
const axios = require('axios');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: '*', methods: ['GET'], allowedHeaders: ['Content-Type', 'Range'] }));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/app-ads.txt', (req, res) => {
    res.type('text/plain');
    res.send('start.io, 110183401, DIRECT\npubnative.net, 1007349, reseller, d641df8625486a7b');
});

app.get('/api/channels', (req, res) => {
    const filePath = path.join(__dirname, 'channels.m3u');
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'ملف channels.m3u غير موجود' });
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const channels = [];
    let currentName = '';
    let currentLogo = '';

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();
        
        if (line.startsWith('#EXTINF:')) {
            let logoMatch = line.match(/tvg-logo\s*=\s*"([^"]+)"/i) || line.match(/logo\s*=\s*"([^"]+)"/i);
            currentLogo = logoMatch ? logoMatch[1].trim() : '';

            let nameMatch = line.match(/tvg-name="([^"]+)"/i);
            if (nameMatch) {
                currentName = nameMatch[1];
            } else {
                let commaIndex = line.lastIndexOf(',');
                if (commaIndex !== -1) {
                    currentName = line.substring(commaIndex + 1).trim();
                } else {
                    currentName = 'عرض بدون اسم';
                }
            }
        } else if (line.startsWith('http://') || line.startsWith('https://')) {
            if (currentName === '') currentName = 'عرض غير مسمّى';
            channels.push({
                name: currentName,
                logo: currentLogo,
                url: line
            });
            currentName = '';
            currentLogo = '';
        }
    }
    res.json(channels);
});

// البروكسي الفولاذي المطور لقراءة التوعين ديناميكياً ودعم m3u8 و TS
app.get('/stream', async (req, res) => {
    const urlIndex = req.url.indexOf('?url=');
    if (urlIndex === -1) return res.status(400).send('الرجاء إدخال رابط القناة.');
    
    const fullUrl = req.url.substring(urlIndex + 5);
    const decodedUrl = decodeURIComponent(fullUrl);

    try {
        const response = await axios({
            method: 'get',
            url: decodedUrl,
            responseType: 'stream',
            timeout: 30000,
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': '*/*'
            }
        });

        // 🌟 حركة ذكية: جلب الـ Content-Type الحقيقي القادم من سيرفر Xtream لكي لا نخدع الأندرويد
        const contentType = response.headers['content-type'] || 'video/mp2t';
        
        res.setHeader('Content-Type', contentType); 
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('Accept-Ranges', 'bytes'); 

        response.data.pipe(res);
        req.on('close', () => response.data.destroy());

    } catch (error) {
        // إذا فشل البروكسي يتم التحويل المباشر كحل أخير آمن
        res.redirect(decodedUrl);
    }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
