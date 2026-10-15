const express = require('express');
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

// الكود الذكي المطور لقراءة القنوات والشعارات بدقة
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
            // 1. كود سحب الشعار الذكي والملائم لملفك
            let logoMatch = line.match(/tvg-logo="([^"]+)"/i);
            currentLogo = logoMatch ? logoMatch[1] : 'https://lo1.in';

            // 2. استخراج اسم القناة
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
                logo: currentLogo || 'https://lo1.in' // تزويد الواجهة بالشعار
            });
            
            // إعادة التصفير للقناة التالية
            currentName = ''; 
            currentLogo = '';
        }
    }

    res.json(channels);
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
