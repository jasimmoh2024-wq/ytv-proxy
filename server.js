const express = require('express');
const axios = require('axios');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// تفعيل CORS بالكامل لحل مشكلة عدم تشغيل الروابط في المتصفح
app.use(cors({ origin: '*', methods: ['GET'], allowedHeaders: ['Content-Type', 'Range'] }));

// تقديم الصفحة الرئيسية للموقع
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// مسار معالجة وقراءة ملف القنوات النقي والمصلح 100%
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
        if (!line) continue; 
        
        if (line.startsWith('#EXTINF:')) {
            // استخراج نص الرابط الخاص بالشعار بشكل نقي ومباشر
            let logoMatch = line.match(/tvg-logo="([^"]+)"/i);
            currentLogo = (logoMatch && logoMatch[1]) ? logoMatch[1] : '';

            // استخراج اسم القناة بشكل نقي ومباشر
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
            
            // تمرير الرابط المباشر إلى الـ HTML لضمان قراءته وتشغيله
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

// البروكسي الآمن لمعالجة تدفق البث وتخطي الحظر بدون كراش السيرفر
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

        res.setHeader('Content-Type', response.headers['content-type'] || 'video/mp2t');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('Accept-Ranges', 'bytes'); 

        response.data.on('error', (err) => {
            console.error('Stream processing error:', err.message);
            if (!res.headersSent) res.status(500).send('انقطع البث.');
        });

        response.data.pipe(res);

        req.on('close', () => {
            response.data.destroy();
        });

    } catch (error) {
        console.error('Proxy Error:', error.message);
        if (!res.headersSent) res.status(500).send('خطأ في جلب البث.');
    }
});

app.listen(PORT, () => console.log(`Server running securely on port ${PORT}`));
