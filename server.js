const express = require('express');
const axios = require('axios');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: '*', methods: ['GET'] }));

// 1. مسار قراءة الواجهة السينمائية الرئيسية
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 🛠️ 2. مسار عرض ملف التحقق لشركة الإعلانات لتوثيق حسابك وإزالة التحذيرات
app.get('/app-ads.txt', (req, res) => {
    res.type('text/plain');
    res.send('start.io, 110183401, DIRECT');
});

// 3. مسار قراءة القنوات والأفلام من ملف الـ M3U وبناء البوسترات تلقائياً
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
            // استخراج اللوجو أو البوستر تلقائياً إن وجد داخل ملف القنوات
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

// 4. وسيط البث (Proxy) المطور والمتوافق تماماً مع مشغل ExoPlayer للأندرويد [2.38K]
app.get('/stream', async (req, res) => {
    const targetUrl = req.query.url;
    if (!targetUrl) return res.status(400).send('الرجاء إدخال رابط القناة.');

    try {
        const response = await axios({
            method: 'get',
            url: targetUrl,
            responseType: 'stream',
            timeout: 15000,
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' 
            }
        });

        // جلب نوع الملف الحقيقي (Content-Type) وحجمه وتمريره للمشغل لضمان عمل الأفلام وقنوات الـ TS معاً [1.1.6، 1.1.7]
        const contentType = response.headers['content-type'] || 'video/mp2t';
        res.setHeader('Content-Type', contentType);
        res.setHeader('Connection', 'keep-alive');
        
        if (response.headers['content-length']) {
            res.setHeader('Content-Length', response.headers['content-length']);
        }

        response.data.pipe(res);

        req.on('close', () => response.data.destroy());
    } catch (error) {
        res.status(500).send('خطأ في جلب البث المباشر.');
    }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
