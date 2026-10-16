const express = require('express');
const axios = require('axios');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// تفعيل بروتوكولات الأمان والحركة الشاملة لمشغلات الفيديو الخارجية والأندرويد
app.use(cors({ origin: '*', methods: ['GET'], allowedHeaders: ['Content-Type', 'Range'] }));

// 1. مسار قراءة الواجهة السينمائية الرئيسية
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 2. مسار ملف التحقق المدمج والمحدث لشركتي الإعلانات (Start.io & PubNative) لتوثيق الحساب
app.get('/app-ads.txt', (req, res) => {
    res.type('text/plain');
    res.send('start.io, 110183401, DIRECT\npubnative.net, 1007349, reseller, d641df8625486a7b');
});

// 3. مسار قراءة القنوات والأفلام من ملف الـ M3U وبناء الباقتين مع استخراج الشعارات تلقائياً
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
            // 🌟 التعديل الجوهري الحاسم: استخراج رابط اللوجو/البوستر بدقة عبر فحص وسم tvg-logo
            let logoMatch = line.match(/tvg-logo="([^"]+)"/i);
            if (logoMatch && logoMatch[1]) {
                currentLogo = logoMatch[1];
            } else {
                currentLogo = ''; // تصفير إذا لم يوجد
            }

            let nameMatch = line.match(/tvg-name="([^"]+)"/i);
            if (nameMatch && nameMatch[1]) {
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
                logo: currentLogo, // تمرير رابط الصورة الفعلي للواجهة
                url: line
            });
            currentName = '';
            currentLogo = '';
        }
    }
    res.json(channels);
});

// 4. وسيط البث (Proxy) المتوافق تماماً مع مشغل ExoPlayer للأندرويد والأفلام
app.get('/stream', async (req, res) => {
    const targetUrl = req.query.url;
    if (!targetUrl) return res.status(400).send('الرجاء إدخال رابط القناة.');

    try {
        const response = await axios({
            method: 'get',
            url: targetUrl,
            responseType: 'stream',
            timeout: 20000,
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Linux; Android 10; ExoPlayer) AppleWebKit/537.36',
                'Accept': '*/*'
            }
        });

        let contentType = 'video/mp2t'; 
        if (targetUrl.toLowerCase().includes('.mp4')) contentType = 'video/mp4';
        if (targetUrl.toLowerCase().includes('.m3u8')) contentType = 'application/x-mpegURL';

        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('Accept-Ranges', 'bytes'); 

        response.data.pipe(res);

        req.on('close', () => {
            response.data.destroy();
        });

    } catch (error) {
        console.error("خطأ البروكسي الحرج:", error.message);
        res.status(500).send('خطأ في جلب البث المباشر الممرر.');
    }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
