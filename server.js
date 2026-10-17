const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const axios = require('axios'); // تأكد من وجود مكتبة axios في الـ dependencies

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
        const line = lines[i].trim();
        if (line.startsWith('#EXTINF:')) {
            const logoMatch = line.match(/tvg-logo="([^"]+)"/i) || line.match(/logo="([^"]+)"/i);
            currentLogo = logoMatch ? logoMatch[1] : '';
            
            const nameMatch = line.match(/tvg-name="([^"]+)"/i);
            if (nameMatch) {
                currentName = nameMatch[1];
            } else {
                const commaIdx = line.lastIndexOf(',');
                currentName = commaIdx !== -1 ? line.substring(commaIdx + 1).trim() : 'قناة بث';
            }
        } else if (line.startsWith('http://') || line.startsWith('https://')) {
            channels.push({
                name: currentName || 'قناة غير مسمى',
                logo: currentLogo,
                url: line
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
    res.type('text/plain').send(`start.io, ${STARTAPP_ID}, DIRECT\npubnative.net, 1007349, reseller, d641df8625486a7b`);
});

app.get('/api/channels', (req, res) => {
    if (!cachedChannels) {
        cachedChannels = loadChannelsOnce();
    }
    res.json(cachedChannels);
});

// 🌟 المسار السحري لحماية وتعمية الروابط (Stream Proxy)
app.get('/stream', async (req, res) => {
    const urlIndex = req.url.indexOf('?url=');
    if (urlIndex === -1) return res.status(400).send('الرجاء إدخال رابط القناة.');
    const targetUrl = decodeURIComponent(req.url.substring(urlIndex + 5));

    try {
        // السيرفر يتصل بالقناة الأصلية بالخفاء نيابة عن المستخدم
        const response = await axios({
            method: 'get',
            url: targetUrl,
            responseType: 'stream',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                'Referer': targetUrl
            }
        });

        // تمرير البيانات مباشرة للمشغل دون كشف الرابط الأصلي
        res.setHeader('Content-Type', response.headers['content-type'] || 'video/mp4');
        response.data.pipe(res);

    } catch (error) {
        // إذا فشل البث بالخلفية يتم عمل تحويل كخيار احتياطي لضمان عمل القناة
        res.redirect(targetUrl);
    }
});

app.listen(PORT, () => {
    cachedChannels = loadChannelsOnce();
    console.log(`Protected Server running on port ${PORT}`);
});
