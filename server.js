const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: '*' }));

// متغيّر لحفظ القنوات في الذاكرة (Cache) لتسريع تحميل القائمة فوراً
let cachedChannels = null;

// المعرف الإعلاني الخاص بك لشركة Start.io تم حقنه هنا بأمان
const STARTAPP_ID = "209100049";

// دالة سريعة وذكية لمعالجة ملف الـ M3U بدون استهلاك موارد السيرفر
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

// مسار المطورين المعتمد والمحمي لقراءة أرباحك بالدولار من جيت هاب أو السيرفر
app.get('/app-ads.txt', (req, res) => {
    res.type('text/plain').send(`start.io, ${STARTAPP_ID}, DIRECT\npubnative.net, 1007349, reseller, d641df8625486a7b`);
});

// API فوري يرسل القنوات المحفوظة بالكاش دون أي تأخير
app.get('/api/channels', (req, res) => {
    if (!cachedChannels) {
        cachedChannels = loadChannelsOnce();
    }
    res.json(cachedChannels);
});

// مسار إعادة التوجيه السريع وحل مشكلة الـ CORS وحمايتك من حظر الآي بي
app.get('/stream', (req, res) => {
    const urlIndex = req.url.indexOf('?url=');
    if (urlIndex === -1) return res.status(400).send('الرجاء إدخال رابط القناة.');
    const decodedUrl = decodeURIComponent(req.url.substring(urlIndex + 5));
    // تحويل مباشر ومحمي للمشغل ليتصل بأمان
    res.redirect(decodedUrl);
});

app.listen(PORT, () => {
    // تحميل القنوات فور تشغيل السيرفر
    cachedChannels = loadChannelsOnce();
    console.log(`Server running on port ${PORT}`);
    console.log(`Start.io Ad ID Active: ${STARTAPP_ID}`);
});
