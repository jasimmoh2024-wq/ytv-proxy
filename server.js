const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

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
    
    // إرسال روابط مقنعة تنتهي بـ .m3u8 لإجبار نظام الهاتف على تشغيل الفيديو كاملًا
    const safeChannels = cachedChannels.map((ch, idx) => ({
        name: ch.name,
        logo: ch.logo,
        url: `${req.protocol}://${req.get('host')}/stream/channel-${idx}.m3u8`
    }));
    
    res.json(safeChannels);
});

// 🌟 المسار السحري لحل مشكلة (الصوت بدون صورة) مع حماية الروابط من التجسس
app.get('/stream/channel-:id.m3u8', (req, res) => {
    const id = parseInt(req.params.id);
    if (!cachedChannels || !cachedChannels[id]) {
        return res.status(404).send('القناة غير موجودة.');
    }
    
    const targetUrl = cachedChannels[id].url;
    const clientProtocol = targetUrl.startsWith('https') ? https : http;

    // السيرفر يتصل بالقناة نيابة عن المستخدم ويمرر البيانات مع ترويسة الفيديو المباشر لإجبار الصورة على العمل
    clientProtocol.get(targetUrl, (streamResponse) => {
        res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
        res.setHeader('Access-Control-Allow-Origin', '*');
        
        // ضخ البث الحي مباشرة للمشغل الخارجي دون كشف رابطك الأصلي
        streamResponse.pipe(res);
    }).on('error', () => {
        res.redirect(targetUrl); // خيار احتياطي آمن لضمان استمرارية التشغيل
    });
});

app.listen(PORT, () => {
    cachedChannels = loadChannelsOnce();
    console.log(`Secured Server running on port ${PORT}`);
});
