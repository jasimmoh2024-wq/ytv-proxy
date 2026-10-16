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

// قراءة وتوليد القنوات بشكل سليم بدون انهيار السيرفر
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
            // تصحيح الخطأ: استخراج النص من المصفوفة أولاً قبل عمل trim
            currentLogo = (logoMatch && logoMatch[1]) ? logoMatch[1].trim() : '';

            let nameMatch = line.match(/tvg-name="([^"]+)"/i);
            if (nameMatch && nameMatch[1]) {
                currentName = nameMatch[1].trim();
            } else {
                let commaIndex = line.lastIndexOf(',');
                if (commaIndex !== -1) {
                    currentName = line.substring(commaIndex + 1).trim();
                } else {
                    currentName = 'قناة مباشرة';
                }
            }
        } else if (line.startsWith('http://') || line.startsWith('https://')) {
            if (currentName === '') currentName = 'قناة غير مسمى';
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

// البروكسي الفولاذي لإعادة توجيه البث بأمان وتخطي حجب الـ HTTP
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
            timeout: 20000,
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        const contentType = response.headers['content-type'] || 'application/x-mpegURL';
        res.setHeader('Content-Type', contentType); 
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Connection', 'keep-alive');

        response.data.pipe(res);
        req.on('close', () => {
            if (response.data) response.data.destroy();
        });

    } catch (error) {
        // خطة بديلة لتفادي الشاشة السوداء: تحويل مباشر للرابط الأصلي إذا كان المتصفح يدعمه
        res.redirect(decodedUrl);
    }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
