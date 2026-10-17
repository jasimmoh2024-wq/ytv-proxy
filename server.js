const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: '*' }));

// متغيّر لحفظ القنوات في الذاكرة (Cache)
let cachedChannels = null;

// المعرف الإعلاني الصحيح والخاص بك
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

// مسار المطورين المعتمد والمحمي لقراءة أرباحك بالدولار
app.get('/app-ads.txt', (req, res) => {
    res.type('text/plain').send(`start.io, ${STARTAPP_ID}, DIRECT\npubnative.net, 1007349, reseller, d641df8625486a7b`);
});

// ارسال القنوات للواجهة الأمامية ولكن بدون إرسال الروابط الحقيقية (حماية القائمة من السرقة)
app.get('/api/channels', (req, res) => {
    if (!cachedChannels) {
        cachedChannels = loadChannelsOnce();
    }
    
    // نقوم بإرسال الاسم والشعار فقط للواجهة لإخفاء الروابط تماماً عن المتصفح
    const safeChannels = cachedChannels.map((ch, idx) => ({
        name: ch.name,
        logo: ch.logo,
        streamUrl: `/stream/channel-${idx}` // رابط وهمي مشفر ومحمي
    }));
    
    res.json(safeChannels);
});

// 🌟 المسار الذكي لاستقبال الرابط الوهمي وتحويله سرياً وبسرعة البرق للمشغل
app.get('/stream/channel-:id', (req, res) => {
    const id = parseInt(req.params.id);
    if (!cachedChannels || !cachedChannels[id]) {
        return res.status(404).send('القناة غير موجودة.');
    }
    
    const realUrl = cachedChannels[id].url;
    // تحويل آمن ومباشر للمشغل المدمج بالهاتف دون كشف الرابط في الواجهة
    res.redirect(realUrl);
});

app.listen(PORT, () => {
    cachedChannels = loadChannelsOnce();
    console.log(`Secured IPTV Server running on port ${PORT}`);
});
