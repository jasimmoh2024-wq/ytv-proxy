const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

const app = express();
const PORT = process.env.PORT || 3000;

// تفعيل الـ CORS بشكل كامل لمنع أي حظر أمني في المشغل الداخلي
app.use(cors({ origin: '*' }));

let cachedChannels = [];
const STARTAPP_ID = "209100049";

function loadChannelsIntoMemory() {
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
    const safeChannels = cachedChannels.map((ch, idx) => ({
        name: ch.name,
        logo: ch.logo,
        streamUrl: `/stream/channel-${idx}.m3u8` // روابط وهمية محمية بالكامل
    }));
    res.json(safeChannels);
});

// 🌟 مسار الـ Proxy المطور: يقرأ البث سرياً بالخلفية ويضخه مباشرة للمشغل الداخلي لمنع حظر الصورة
app.get('/stream/channel-:id.m3u8', (req, res) => {
    const id = parseInt(req.params.id);
    if (!cachedChannels || !cachedChannels[id]) {
        return res.status(404).send('القناة غير موجودة.');
    }
    
    const targetUrl = cachedChannels[id].url;
    const clientProtocol = targetUrl.startsWith('https') ? https : http;

    // السيرفر يتصل بالقناة الأصلية بالخفاء نيابة عن المستخدم ويمرر البث مباشرة مع ترويسة الفيديو الصريحة
    clientProtocol.get(targetUrl, (streamResponse) => {
        res.setHeader('Content-Type', 'application/x-mpegURL');
        res.setHeader('Access-Control-Allow-Origin', '*');
        streamResponse.pipe(res);
    }).on('error', () => {
        res.status(500).send('خطأ في جلب البث المباشر.');
    });
});

app.listen(PORT, () => {
    cachedChannels = loadChannelsIntoMemory();
    console.log(`Secured IPTV Server running on port ${PORT}. Cached ${cachedChannels.length} channels.`);
});
