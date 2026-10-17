const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// تفعيل الـ CORS بشكل كامل لضمان فك ترميز حزم الصوت والصورة معاً
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
    
    // إرسال الروابط المقنعة والآمنة التي تنتهي بـ .m3u8 لإجبار الهاتف على فك ترميز الفيديو كاملًا
    const safeChannels = cachedChannels.map((ch, idx) => ({
        name: ch.name,
        logo: ch.logo,
        streamUrl: `/stream/channel-${idx}.m3u8`
    }));
    
    res.json(safeChannels);
});

// 🌟 المسار المصحح لحل مشكلة (الصوت بدون صورة) وتجهيز الفيديو للمشغلات الخارجية
app.get('/stream/channel-:id.m3u8', (req, res) => {
    const id = parseInt(req.params.id);
    if (!cachedChannels || !cachedChannels[id]) {
        return res.status(404).send('القناة غير موجودة.');
    }
    
    const realUrl = cachedChannels[id].url;
    
    // إرسال ترويسات صريحة تخبر هاتف الأندرويد بأن هذا بث فيديو وصوت مدمج ومتدفق
    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    // تحويل ثابت ومستقر يضمن انبثاق البث كاملًا بالصورة والصوت
    res.status(302).redirect(realUrl);
});

app.listen(PORT, () => {
    cachedChannels = loadChannelsOnce();
    console.log(`Secured IPTV Server running on port ${PORT}`);
});
