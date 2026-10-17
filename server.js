const express = require('express');
const axios = require('axios');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// تفعيل وتخطي حماية CORS لجميع طلبات قنوات الويب والتطبيقات
app.use(cors({ origin: '*', methods: ['GET'], allowedHeaders: ['Content-Type', 'Range'] }));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// ملف حماية الأرباح الفنية app-ads.txt الخاص بـ Start.io
app.get('/app-ads.txt', (req, res) => {
    res.type('text/plain');
    res.send('start.io, 209100049, DIRECT\npubnative.net, 1007349, reseller, d641df8625486a7b');
});

// مسار فك وتحليل قنوات M3U البرمجية لاستخراج الشعارات والأسماء بدقة 
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
            // استخراج رابط الشعار tvg-logo بشكل نصوص صافية
            let logoMatch = line.match(/tvg-logo="([^"]+)"/i);
            currentLogo = (logoMatch && logoMatch[1]) ? logoMatch[1] : '';

            // استخراج اسم القناة بشكل نصوص صافية 
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

// البروكسي الحامي والموجه للتدفق لمنع تجميد شبكة الهاتف عند الدخول بوضع الخمول
app.get('/stream', async (req, res) => {
    const targetUrl = req.query.url;
    if (!targetUrl) return res.status(400).send('الرجاء إدخال رابط القناة.');

    try {
        const response = await axios({
            method: 'get',
            url: targetUrl,
            responseType: 'stream',
            timeout: 30000, // زيادة المهلة لتفادي الانقطاعات المفاجئة للإنترنت
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Linux; Android 10; ExoPlayer) AppleWebKit/537.36',
                'Accept': '*/*',
                'Connection': 'keep-alive'
            }
        });

        // ترويسات متطورة تجبر متصفح الهاتف ومشغل الفيديو الداخلي على اعتبار التدفق نشطاً دائماً
        res.setHeader('Content-Type', response.headers['content-type'] || 'video/mp2t');
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Expires', '0');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('Keep-Alive', 'timeout=15, max=100');
        res.setHeader('Accept-Ranges', 'bytes'); 

        response.data.pipe(res);

        // حماية خادم Render من التوقف المفاجئ في حال خروج المستخدم السريع
        response.data.on('error', (err) => {
            console.error('خطأ في تدفق بيانات المصدر:', err.message);
            response.data.destroy();
        });

        req.on('close', () => {
            response.data.destroy();
        });

    } catch (error) {
        if (!res.headersSent) res.status(500).send('خطأ في جلب البث المباشر.');
    }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
