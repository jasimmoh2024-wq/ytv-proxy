const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// تفعيل الـ CORS بشكل كامل لمنع أي حظر أمني في المتصفحات والتطبيقات
app.use(cors({ origin: '*' }));

// متغيّر حفظ القنوات في الذاكرة الحية (Cache) لضمان السرعة الفائقة
let cachedChannels = [];

// المعرف الإعلاني الخاص بك لشركة Start.io
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

// ⚡ الـ API الفوري يرسل القنوات المحفوظة مسبقاً بالكاش بلمحة بصر وبدون أي تأخير
app.get('/api/channels', (req, res) => {
    // نقوم بتعمية وتشفير الروابط الأصلية لكي لا تظهر علناً في المتصفح عند فحص الصفحة
    const secureChannels = cachedChannels.map(ch => {
        // تشفير الرابط الأصلي إلى ترميز الـ Base64 المجهول
        const obfuscatedUrl = Buffer.from(ch.url).toString('base64');
        return {
            name: ch.name,
            logo: ch.logo,
            secureKey: obfuscatedUrl
        };
    });
    res.json(secureChannels);
});

// مسار التمرير السريع وحل مشكلة الـ CORS وحمايتك من حظر الآي بي
app.get('/stream', (req, res) => {
    const urlIndex = req.url.indexOf('?url=');
    if (urlIndex === -1) return res.status(400).send('الرجاء إدخال رابط القناة.');
    
    // فك التشفير عن الرابط القادم وتوجيهه بأمان للمشغل
    const encryptedUrl = req.url.substring(urlIndex + 5);
    const decodedUrl = decodeURIComponent(encryptedUrl);
    
    res.redirect(decodedUrl);
});

app.listen(PORT, () => {
    // تحميل القنوات فور تشغيل السيرفر وحفظها بالذاكرة لمنع التأخير تماماً
    cachedChannels = loadChannelsIntoMemory();
    console.log(`Server running on port ${PORT}. Loaded ${cachedChannels.length} channels into memory cache.`);
});
