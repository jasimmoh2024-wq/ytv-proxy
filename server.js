const express = require('express');
const axios = require('axios');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: '*', methods: ['GET'], allowedHeaders: ['Content-Type', 'Range'] }));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/app-ads.txt', (req, res) => {
    res.type('text/plain');
    res.send('start.io, 110183401, DIRECT\npubnative.net, 1007349, reseller, d641df8625486a7b');
});

// مسار قراءة قائمة باقاتك مع الحفاظ على الرابط بكامل توكناته البرمجية السحرية الممررة
app.get('/api/channels', (req, res) => {
    const filePath = path.join(__dirname, 'channels.m3u');
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'ملف channels.m3u غير موجود' });
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const channels = [];
    let currentName = '';
    let currentLogo = '';

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();
        
        if (line.startsWith('#EXTINF:')) {
            let logoMatch = line.match(/tvg-logo\s*=\s*"([^"]+)"/i) || line.match(/logo\s*=\s*"([^"]+)"/i);
            currentLogo = (logoMatch && logoMatch) ? logoMatch[1].trim() : '';

            let nameMatch = line.match(/tvg-name="([^"]+)"/i);
            if (nameMatch && nameMatch) {
                currentName = nameMatch[1];
            } else {
                let commaIndex = line.lastIndexOf(',');
                if (commaIndex !== -1) {
                    currentName = line.substring(commaIndex + 1).trim();
                } else {
                    currentName = 'عرض بدون اسم';
                }
            }
        } else if (line.startsWith('http://') || line.startsWith('https://')) {
            if (currentName === '') currentName = 'عرض غير مسمّى';
            channels.push({
                name: currentName,
                logo: currentLogo,
                url: line // هنا يتم تخزين الرابط كاملاً بالتوكن مالتة المتغير
            });
            currentName = '';
            currentLogo = '';
        }
    }
    res.json(channels);
});

// 🌟 البروكسي المطور الفولاذي: يقوم بالتقاط الرابط وإعادة بناء التوكنات كاملة وتمريرها للسيرفر الأصلي
app.get('/stream', async (req, res) => {
    // التقاط الرابط الكامل الممرر بالاستعلام بما يحتويه من علامات استفهام وتوكنات حماية
    const fullUrl = req.url.substring(req.url.indexOf('?url=') + 5);
    const decodedUrl = decodeURIComponent(fullUrl);

    if (!decodedUrl) return res.status(400).send('الرجاء إدخال رابط القناة.');

    try {
        const response = await axios({
            method: 'get',
            url: decodedUrl, // إرسال الطلب بالتوكن الأصلي كاملاً للحصول على الصلاحية الأمنية للبث
            responseType: 'stream',
            timeout: 30000,
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': '*/*'
            }
        });

        // فرض هيدرز البث الحي المستقر المتوافق مع متصفح قسم الويب
        res.setHeader('Content-Type', 'video/mp2t'); 
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('Accept-Ranges', 'bytes'); 

        response.data.pipe(res);
        req.on('close', () => response.data.destroy());

    } catch (error) {
        // إذا حدث خطأ، يوجه الرابط الأصلي مباشرة كخطة بديلة آمنة لتشغيل الميديا
        res.redirect(decodedUrl);
    }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
