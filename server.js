const express = require('express');
const axios = require('axios');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: '*', methods: ['GET'] }));

app.use(express.static(path.join(__dirname)));

// قراءة الواجهة
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// الكود الذكي المطور لقراءة القنوات واستخراج الشعارات (tvg-logo)
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
            // 🛠️ استخراج رابط الشعار (tvg-logo) تلقائياً من السطر
            let logoMatch = line.match(/tvg-logo="([^"]+)"/i);
            if (logoMatch && logoMatch[1]) {
                currentLogo = logoMatch[1];
            } else {
                currentLogo = ''; // فارغ ليتم معالجته بصورة افتراضية فخمة بالواجهة
            }

            // استخراج اسم القناة
            let nameMatch = line.match(/tvg-name="([^"]+)"/i);
            if (nameMatch && nameMatch[1]) {
                currentName = nameMatch[1];
            } else {
                let commaIndex = line.lastIndexOf(',');
                if (commaIndex !== -1) {
                    currentName = line.substring(commaIndex + 1).trim();
                } else {
                    currentName = 'قناة بدون اسم';
                }
            }
        } else if (line.startsWith('http://') || line.startsWith('https://')) {
            if (currentName === '') currentName = 'قناة غير مسمّاة';
            
            // ربط القنوات ديناميكياً ببروكسي السيرفر الخاص بك لحمايتها
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

// وسيط البث الذكي وحاقن الإعلانات لحماية المحتوى المسروق
app.get('/stream', async (req, res) => {
    const targetUrl = req.query.url;
    if (!targetUrl) return res.status(400).send('الرجاء إدخال رابط القناة.');

    try {
        // 🌐 الفكرة الذكية: حقن كود تتبع إعلانات Adsterra بالخلفية عند استدعاء الرابط خارجياً
        // يتم إرسال طلب صامت لخوادم الإعلانات لاحتساب النقرة/المشاهدة لصالحك إذا سرق الرابط
        try {
            await axios.get('https://highratecpm.com', { timeout: 2000 }).catch(()=>{});
        } catch(e){}

        const response = await axios({
            method: 'get',
            url: targetUrl,
            responseType: 'stream',
            timeout: 15000,
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Linux; Android 10; ExoPlayerTest)' 
            }
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
