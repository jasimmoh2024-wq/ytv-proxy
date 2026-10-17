const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

const app = express();
const PORT = process.env.PORT || 3000;

// تفعيل الـ CORS بشكل كامل لمنع أي حظر أمني في التطبيقات
app.use(cors({ origin: '*' }));

// متغيّر حفظ القنوات في الذاكرة الحية (Cache) لضمان السرعة الفائقة
let cachedChannels = [];

// المعرف الإعلاني الصحيح والخاص بك لشركة Start.io
const STARTAPP_ID = "209100049";

// دالة ذكية لمعالجة ملف الـ M3U مرة واحدة فقط وحفظه بالكاش لعدم التأخير
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

// مسار المطورين المعتمد والمحمي لقراءة أرباحك بالدولار
app.get('/app-ads.txt', (req, res) => {
    res.type('text/plain').send(`start.io, ${STARTAPP_ID}, DIRECT\npubnative.net, 1007349, reseller, d641df8625486a7b`);
});

// ⚡ الـ API الفوري يرسل القائمة بروابط وهمية تابعة لسيرفرك فقط لحمايتها من السرقة
app.get('/api/channels', (req, res) => {
    const safeChannels = cachedChannels.map((ch, idx) => ({
        name: ch.name,
        logo: ch.logo,
        streamUrl: `/stream/channel-${idx}.m3u8` // رابط وهمي آمن تماماً
    }));
    res.json(safeChannels);
});

// 🌟 المسار السحري الاحترافي (Stream Proxy): يقوم بطلب البث في الخلفية وتمريره للمشغل مباشرة
app.get('/stream/channel-:id.m3u8', (req, res) => {
    const id = parseInt(req.params.id);
    if (!cachedChannels || !cachedChannels[id]) {
        return res.status(404).send('القناة غير موجودة.');
    }
    
    const targetUrl = cachedChannels[id].url;
    const clientStr = targetUrl.startsWith('https') ? https : http;

    // السيرفر يتصل بالقناة الأصلية بالخفاء نيابة عن المستخدم ويمرر البث مباشرة
    clientStr.get(targetUrl, (streamResponse) => {
        res.setHeader('Content-Type', streamResponse.headers['content-type'] || 'application/vnd.apple.mpegurl');
        res.setHeader('Access-Control-Allow-Origin', '*');
        streamResponse.pipe(res);
    }).on('error', () => {
        res.status(500).send('خطأ في جلب البث المباشر.');
    });
});

app.listen(PORT, () => {
    cachedChannels = loadChannelsIntoMemory();
    console.log(`Server running on port ${PORT}. Loaded ${cachedChannels.length} channels.`);
});
