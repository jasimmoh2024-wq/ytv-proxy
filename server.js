const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
// المنفذ الافتراضي لـ Render أو 3000 محلياً
const PORT = process.env.PORT || 3000; 

// تفعيل الـ CORS لجميع النطاقات لتتمكن مشغلات ExoPlayer و التطبيقات الخارجية من جلب البيانات بدون حظر
app.use(cors({ origin: '*', methods: ['GET'] }));

// إتاحة قراءة ملفات الواجهة والملفات الاستاتيكية
app.use(express.static(path.join(__dirname)));

// قراءة الواجهة الرئيسية للقنوات
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// قاعدة بيانات القنوات الذكية المتوافقة مع ExoPlayer (صيغة JSON المحدثة)
const globalChannels = [
    {
        name: "قناة الأنمي والمغامرة الكوميدي - Big Buck Bunny",
        logo: "https://wikimedia.org",
        url: "https://googleapis.com"
    },
    {
        name: "قناة الخيال العلمي القصير - Sintel",
        logo: "https://wikimedia.org",
        url: "https://googleapis.com"
    },
    {
        name: "قناة الرسوم المتحركة والدراما - Tears of Steel",
        logo: "https://wikimedia.org",
        url: "https://googleapis.com"
    }
];

// 1. رابط الـ API بصيغة JSON (المستخدم في ملف index.html)
app.get('/api/channels', (req, res) => {
    res.json(globalChannels);
});

// 2. رابط إضافي بصيغة M3U (إذا كنت تريد إدخال الرابط مباشرة في تطبيقات IPTV المشغلة لـ ExoPlayer)
app.get('/api/playlist.m3u', (req, res) => {
    let m3uContent = "#EXTM3U\n";
    
    globalChannels.forEach(channel => {
        m3uContent += `#EXTINF:-1 tvg-logo="${channel.logo}",${channel.name}\n${channel.url}\n`;
    });
    
    res.setHeader('Content-Type', 'audio/x-mpegurl');
    res.setHeader('Content-Disposition', 'attachment; filename=playlist.m3u');
    res.send(m3uContent);
});

app.listen(PORT, () => console.log(`ExoPlayer Stream Server running on port ${PORT}`));
