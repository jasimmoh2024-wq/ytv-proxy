const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: '*', methods: ['GET'] }));

// قراءة الواجهة الرئيسية للسينما الشاملة
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// قاعدة بيانات مكتبة الأفلام الشاملة (الـ API)
// يمكنك إضافة وتعديل أي فيلم هنا (الاسم، رابط البوستر الحقيقي للفيلم، رابط الفيديو المباشر)
app.get('/api/movies', (req, res) => {
    const globalMovies = [
        {
            name: "فيلم الأنمي والمغامرة الكوميدي - Big Buck Bunny",
            logo: "https://wikimedia.org", // بوستر حقيقي شغال
            url: "https://googleapis.com" // رابط الفيديو المباشر
        },
        {
            name: "فيلم الخيال العلمي القصير - Sintel",
            logo: "https://wikimedia.org", // بوستر حقيقي شغال
            url: "https://googleapis.com"
        },
        {
            name: "فيلم الرسوم المتحركة والدراما - Tears of Steel",
            logo: "https://wikimedia.org", // بوستر حقيقي شغال
            url: "https://googleapis.com"
        }
    ];

    res.json(globalMovies);
});

app.listen(PORT, () => console.log(`Cinema Global Server running on port ${PORT}`));
