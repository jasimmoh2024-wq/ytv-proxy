const express = require('express');
const axios = require('axios');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: '*', methods: ['GET'] }));

// قراءة الواجهة الرئيسية
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// جلب القنوات بشكل آمن مع إخفاء الروابط الأصلية عن الواجهة
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
            currentLogo = logoMatch ? logoMatch[1] : 'https://lo1.in';

            let nameMatch = line.match(/tvg-name="([^"]+)"/i);
            if (nameMatch && nameMatch[1]) {
                currentName = nameMatch[1];
            } else {
                let commaIndex = line.lastIndexOf(',');
                currentName = commaIndex !== -1 ? line.substring(commaIndex + 1).trim() : 'قناة بدون اسم';
            }
        } else if (line.startsWith('http://') || line.startsWith('https://')) {
            if (currentName === '') currentName = 'قناة غير مسمّاة';
            
            // قمنا بتشفير المعرف البرمجي هنا لكي لا يظهر رابطك الأصلي في كود المتصفح إطلاقاً
            const secureId = Buffer.from(line).toString('base64');

            channels.push({
                name: currentName,
                id: secureId, // نرسل معرف مشفر بدلاً من الرابط
                logo: currentLogo || 'https://lo1.in'
            });
            currentName = ''; 
            currentLogo = '';
        }
    }
    res.json(channels);
});

// دالة التوجيه السري المخصصة لـ VLC (تخفي الرابط وتفك الحظر وتمرر البث)
app.get('/vlc-play/:id', async (req, res) => {
    try {
        // فك تشفير الرابط الحقيقي داخل السيرفر سرياً
        const targetUrl = Buffer.from(req.params.id, 'base64').toString('utf-8');
        
        // جلب البيانات مع انتحال شخصية مشغل IPTV
        const response = await axios({
            method: 'get',
            url: targetUrl,
            responseType: 'stream',
            timeout: 30000,
            headers: { 
                'User-Agent': 'IPTVSmarters',
                'Accept': '*/*',
                'Connection': 'keep-alive'
            }
        });

        // تمرير دفق الفيديو الحي لـ VLC
        res.setHeader('Content-Type', 'video/mp2t');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        
        response.data.pipe(res);

        req.on('close', () => {
            if (response.data) response.data.destroy();
        });
    } catch (error) {
        res.status(500).send('خطأ أمني في جلب البث الخارجي.');
    }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
