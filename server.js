const express = require('express');
const axios = require('axios');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: '*', methods: ['GET'] }));

// 1. واجهة العرض الرئيسية (ستقرأ ملف index.html تلقائياً عند فتح السيرفر)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 2. رابط لجلب القنوات المكتوبة داخل ملف channels.m3u المرفوع لديك
app.get('/api/channels', (req, res) => {
    const filePath = path.join(__dirname, 'channels.m3u');
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'ملف channels.m3u غير موجود في السيرفر' });
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const channels = [];
    let currentChannel = {};

    // تحليل ملف M3U واستخراج أسماء القنوات وروابطها
    lines.forEach(line => {
        line = line.trim();
        if (line.startsWith('#EXTINF:')) {
            const nameMatch = line.match(/,(.+)\$/);
            currentChannel.name = nameMatch ? nameMatch[1] : 'قناة غير مسمى';
        } else if (line.startsWith('http://') || line.startsWith('https://')) {
            currentChannel.url = line;
            channels.push(currentChannel);
            currentChannel = {};
        }
    });

    res.json(channels);
});

// 3. الوسيط الذكي لتشغيل البث بدون تحميل وحل الحظر الأمني
app.get('/stream', async (req, res) => {
    const targetUrl = req.query.url;
    if (!targetUrl) return res.status(400).send('الرجاء إدخال رابط القناة.');

    try {
        const response = await axios({
            method: 'get',
            url: targetUrl,
            responseType: 'stream',
            timeout: 10000,
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });

        res.setHeader('Content-Type', 'video/mp2t');
        res.setHeader('Connection', 'keep-alive');
        response.data.pipe(res);

        req.on('close', () => response.data.destroy());
    } catch (error) {
        res.status(500).send('خطأ في جلب البث المباشر.');
    }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
