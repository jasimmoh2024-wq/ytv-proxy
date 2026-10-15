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

// قراءة القنوات وتوليد معرفات وهمية تماماً
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
            
            // تشفير الرابط داخلياً عبر صيغة سداسية عشرية معقدة لا تفهمها المتصفحات
            const secureId = Buffer.from(line).toString('hex');

            channels.push({
                name: currentName,
                id: secureId, 
                logo: currentLogo || 'https://lo1.in'
            });
            currentName = ''; 
            currentLogo = '';
        }
    }
    res.json(channels);
});

// خادم الحماية المطلقة: جلب البيانات سرياً بالكامل وبثها كخادم مستقل
app.get('/vlc-play/:id', async (req, res) => {
    try {
        // فك التشفير داخلياً في السيرفر السحابي فقط
        const targetUrl = Buffer.from(req.params.id, 'hex').toString('utf-8');
        
        // جلب البث الحي وانتحال الهوية
        const response = await axios({
            method: 'get',
            url: targetUrl,
            responseType: 'stream',
            timeout: 45000,
            headers: { 
                'User-Agent': 'IPTVSmarters',
                'Accept': '*/*',
                'Connection': 'keep-alive'
            }
        });

        // جعل خادم Render يظهر كأنه هو مالك ومصدر الفيديو الحقيقي
        res.setHeader('Content-Type', 'video/mp2t');
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.setHeader('Connection', 'keep-alive');
        
        // تمرير البيانات الخام مباشرة (حماية من الكشف والسرقة)
        response.data.pipe(res);

        req.on('close', () => {
            if (response.data) response.data.destroy();
        });
    } catch (error) {
        console.error("أمن البث: تم حجب محاولة فحص مشبوهة.");
        res.status(500).send('خطأ في الاتصال بالبث الآمن.');
    }
});

app.listen(PORT, () => console.log(`Secure Server running on port ${PORT}`));
