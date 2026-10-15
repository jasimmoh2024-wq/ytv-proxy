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

// 3. مسار قراءة القنوات والأفلام من ملف الـ M3U وبناء الباقتين تلقائياً
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
            let logoMatch = line.match(/tvg-logo="([^"]+)"/i);
            currentLogo = (logoMatch && logoMatch) ? logoMatch : '';

            let nameMatch = line.match(/tvg-name="([^"]+)"/i);
            if (nameMatch && nameMatch) {
                currentName = nameMatch;
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
                url: line
            });
            currentName = '';
            currentLogo = '';
        }
    }
    res.json(channels);
});

// 4. وسيط البث (Proxy) العملاق والمعدل بالكامل ليتوافق 100% مع مشغل ExoPlayer للأندرويد والأفلام والـ Xtream معاً
app.get('/stream', async (req, res) => {
    const targetUrl = req.query.url;
    if (!targetUrl) return res.status(400).send('الرجاء إدخال رابط القناة.');

    try {
        // إعداد البث المباشر المفتوح لمطابقة شروط مشغل الأندرويد لـ ExoPlayer
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

        // فحص ذكي لنوع الملف لتهيئة الهيدرز وضمان التشغيل الفوري للنوعين بدون تشنج
        let contentType = 'video/mp2t'; // الافتراضي لقنوات الـ TS والـ Xtream التي بدون امتداد
        if (targetUrl.toLowerCase().includes('.mp4')) contentType = 'video/mp4';
        if (targetUrl.toLowerCase().includes('.m3u8')) contentType = 'application/x-mpegURL';

        // ضخ الهيدرز العسكرية الحتمية التي تنتظرها شريحة مشغل الهاتف والأندرويد لتفادي التعطل صامتاً
        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Connection', 'keep-alive');
        
        // تفعيل ميزة السماح بتقديم وتأخير الفيديو لملفات الأفلام (حتمي ومصيري لـ ExoPlayer)
        res.setHeader('Accept-Ranges', 'bytes'); 

        // ضخ الأنبوب الحي المفتوح والمستمر فورا للمشغل
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
