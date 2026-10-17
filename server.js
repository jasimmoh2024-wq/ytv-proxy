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

// 🌟 تم تحديث وحقن المعرف الإعلاني الصحيح والخاص بك هنا (209100049) لحفظ الأرباح بالدولار
app.get('/app-ads.txt', (req, res) => {
    res.type('text/plain');
    res.send('start.io, 209100049, DIRECT\npubnative.net, 1007349, reseller, d641df8625486a7b');
});

// مسار قراءة القنوات وبناء قائمة الشعارات والبوسترات الذكية
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
            // استخراج رابط الصورة أو الشعار بدقة وعمق من وسم tvg-logo
            let logoMatch = line.match(/tvg-logo="([^"]+)"/i);
            currentLogo = (logoMatch && logoMatch[1]) ? logoMatch[1] : '';

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
                logo: currentLogo,
                url: line
            });
            currentName = '';
            currentLogo = '';
        }
    }
    res.json(channels);
});

// البروكسي الصافي السريع المتوافق تماماً مع مشغل ExoPlayer للأندرويد
app.get('/stream', async (req, res) => {
    const targetUrl = req.query.url;
    if (!targetUrl) return res.status(400).send('الرجاء إدخال رابط القناة.');

    try {
        const response = await axios({
            method: 'get',
            url: targetUrl,
            responseType: 'stream',
            timeout: 30000, // زيادة المهلة إلى 30 ثانية لضمان الاستقرار عند ضعف الشبكة
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Linux; Android 10; ExoPlayer) AppleWebKit/537.36',
                'Accept': '*/*',
                'Connection': 'keep-alive' // إبقاء الاتصال حياً مع مصدر البث الرئيسي
            }
        });

        // ترويسات متطورة لمنع النظام من تجميد تدفق الفيديو أو اعتباره خمولاً
        res.setHeader('Content-Type', response.headers['content-type'] || 'video/mp2t');
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Expires', '0');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('Keep-Alive', 'timeout=15, max=100'); // الحفاظ على حيوية القناة
        res.setHeader('Accept-Ranges', 'bytes'); 

        // تمرير البيانات بنظام التدفق المستمر والآمن
        response.data.pipe(res);

        // حماية الخادم من الانهيار عند حدوث خطأ مفاجئ في التدفق
        response.data.on('error', (err) => {
            console.error('حدث خطأ أثناء تدفق البيانات من المصدر:', err.message);
            response.data.destroy();
            if (!res.headersSent) res.status(500).send('انقطع الاتصال بالمصدر.');
        });

        // تنظيف الذاكرة وإغلاق التدفق فور قيام المستخدم بإغلاق القناة أو التطبيق
        req.on('close', () => {
            response.data.destroy();
        });

    } catch (error) {
        console.error('فشل جلب البث المباشر:', error.message);
        if (!res.headersSent) res.status(500).send('خطأ في جلب البث المباشر.');
    }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
