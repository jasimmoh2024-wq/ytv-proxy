const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

const app = express();
const PORT = process.env.PORT || 3000;

// تفعيل الـ CORS بشكل كامل لكسر أي حظر أمني في الهواتف والمشغلات
app.use(cors({ origin: '*' }));

// متغيّر لحفظ القنوات في الذاكرة لتسريع تحميل القائمة فوراً
let cachedChannels = null;

// المعرف الإعلاني الصحيح والخاص بك لشركة Start.io
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

// إرسال القنوات للواجهة الأمامية بروابط وهمية مشفرة لحمايتها من السرقة
app.get('/api/channels', (req, res) => {
    if (!cachedChannels) {
        cachedChannels = loadChannelsOnce();
    }
    
    const safeChannels = cachedChannels.map((ch, idx) => ({
        name: ch.name,
        logo: ch.logo,
        streamUrl: `/stream/channel-${idx}.m3u8`
    }));
    
    res.json(safeChannels);
});

// 🌟 المسار الاحترافي والنهائي: كسر فخ ترميز الصوت وفتح الصورة كاملة (Light Proxy Pipe)
app.get('/stream/channel-:id.m3u8', (req, res) => {
    const id = parseInt(req.params.id);
    if (!cachedChannels || !cachedChannels[id]) {
        return res.status(404).send('القناة غير موجودة.');
    }
    
    const targetUrl = cachedChannels[id].url;
    const clientProtocol = targetUrl.startsWith('https') ? https : http;

    // السيرفر يقوم بفتح جسر اتصال آمن ومخفي، ويقوم بضخ ترويسة الفيديو المباشرة الصريحة
    clientProtocol.get(targetUrl, (streamResponse) => {
        // إجبار نوع المحتوى ليكون بث ميديا حية وصورة وصوت كاملين (IPTV Stream Profile)
        res.setHeader('Content-Type', 'application/x-mpegURL');
        res.setHeader('Access-Control-Allow-Origin', '*');
        
        // تمرير البيانات الفورية للمشغل الخارجي بالهاتف ليفهم ترميز الصورة فوراً
        streamResponse.pipe(res);
    }).on('error', () => {
        // خيار احتياطي صامت عند حدوث أي انقطاع مفاجئ بالخادم لضمان عدم التوقف
        res.redirect(targetUrl);
    });
});

app.listen(PORT, () => {
    cachedChannels = loadChannelsOnce();
    console.log(`Secured IPTV Server running on port ${PORT}`);
});
