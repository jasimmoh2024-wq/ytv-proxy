const express = require('express');
const axios = require('axios');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: '*' }));

let cachedChannels = null;
const STARTAPP_ID = "209100049";

function loadChannelsOnce() {
    const filePath = path.join(__dirname, 'channels.m3u');
    if (!fs.existsSync(filePath)) return [];
    
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const channels = [];
    let currentName = '';
    let currentLogo = '';

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();
        
        if (line.startsWith('#EXTINF:')) {
            let logoMatch = line.match(/tvg-logo="([^"]+)"/i) || line.match(/logo="([^"]+)"/i);
            currentLogo = (logoMatch && logoMatch[1]) ? logoMatch[1] : '';

            let nameMatch = line.match(/tvg-name="([^"]+)"/i);
            if (nameMatch && nameMatch[1]) {
                currentName = nameMatch[1];
            } else {
                let commaIndex = line.lastIndexOf(',');
                if (commaIndex !== -1) {
                    currentName = line.substring(commaIndex + 1).trim();
                } else {
                    currentName = 'قناة بث';
                }
            }
        } else if (line.startsWith('http://') || line.startsWith('https://')) {
            if (currentName === '') currentName = 'قناة بث';
            
            // تشفير الرابط الأصلي إلى Base64 قبل إرساله للواجهة لحماية مصادرك تماماً
            const secureKey = Buffer.from(line).toString('base64');
            
            channels.push({
                name: currentName,
                logo: currentLogo,
                secureKey: secureKey
            });
            currentName = '';
            currentLogo = '';
        }
    }
    return channels;
}

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/app-ads.txt', (req, res) => {
    res.type('text/plain');
    res.send(`start.io, ${STARTAPP_ID}, DIRECT\npubnative.net, 1007349, reseller, d641df8625486a7b`);
});

app.get('/api/channels', (req, res) => {
    if (!cachedChannels) {
        cachedChannels = loadChannelsOnce();
    }
    res.json(cachedChannels);
});

// البروكسي السريع والمتوافق مع المشغلات لفتح الصوت والصورة معاً وحل مشكلة الـ CORS
app.get('/stream', async (req, res) => {
    const encryptedUrl = req.query.url;
    if (!encryptedUrl) return res.status(400).send('الرجاء إدخال رابط القناة.');

    // فك التشفير عن الرابط بأمان داخل السيرفر
    const targetUrl = Buffer.from(encryptedUrl, 'base64').toString('utf-8');

    try {
        const response = await axios({
            method: 'get',
            url: targetUrl,
            responseType: 'stream',
            timeout: 20000,
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Linux; Android 10; ExoPlayer) AppleWebKit/537.36',
                'Accept': '*/*'
            }
        });

        res.setHeader('Content-Type', response.headers['content-type'] || 'video/mp2t');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('Accept-Ranges', 'bytes'); 

        response.data.pipe(res);

        req.on('close', () => {
            response.data.destroy();
        });

    } catch (error) {
        res.status(500).send('خطأ في جلب البث المباشر.');
    }
});

app.listen(PORT, () => {
    cachedChannels = loadChannelsOnce();
    console.log(`Server running on port ${PORT}`);
});
