const express = require('express');
const axios = require('axios');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: '*', methods: ['GET'] }));

// قراءة الواجهة
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// جلب القنوات والشعارات من ملف m3u
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
            channels.push({
                name: currentName,
                url: line,
                logo: currentLogo || 'https://lo1.in'
            });
            currentName = ''; 
            currentLogo = '';
        }
    }
    res.json(channels);
});

// وسيط البث (Proxy) المطور لحل اللغز وتخطي الحظر
app.get('/stream', async (req, res) => {
    const targetUrl = req.query.url;
    if (!targetUrl) return res.status(400).send('الرجاء إدخال رابط القناة.');

    try {
        const response = await axios({
            method: 'get',
            url: targetUrl,
            responseType: 'stream',
            timeout: 30000,
            headers: { 
                // هنا يكمن السر الحقيقي: خداع السيرفر بأن الطلب قادم من مشغل IPTV مشهور وصحيح
                'User-Agent': 'IPTVSmarters',
                'Accept': '*/*',
                'Connection': 'keep-alive'
            }
        });

        // إجبار المتصفح على معالجة البث كبث فيديو حي فوري
        res.setHeader('Content-Type', 'video/mp2t');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        
        response.data.pipe(res);

        req.on('close', () => {
            if (response.data) response.data.destroy();
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('خطأ في جلب البث المباشر من السيرفر المحمي.');
    }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
