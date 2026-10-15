const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: '*', methods: ['GET'] }));

// قراءة الواجهة الرئيسية المحدثة لمكتبة الأفلام
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// قاعدة بيانات الأفلام (الـ API الذكي)
// يمكنك إضافة وتحديث أفلامك هنا بسهولة (الاسم، رابط البوستر/الشعار، رابط الفيلم المباشر)
app.get('/api/movies', (req, res) => {
    const moviesData = [
        {
            name: "فيلم الأكشن والإثارة - نتفليكس 1",
            logo: "https://lo1.in", // يمكنك وضع رابط بوستر الفيلم هنا
            url: "https://googleapis.com" // رابط الفيلم المباشر (يدعم mp4, mkv, webm وغيرها)
        },
        {
            name: "فيلم الرعب والغموض - نتفليكس 2",
            logo: "https://lo1.in",
            url: "https://googleapis.com"
        },
        {
            name: "فيلم الخيال العلمي - نتفليكس 3",
            logo: "https://lo1.in",
            url: "https://googleapis.com"
        }
    ];

    res.json(moviesData);
});

app.listen(PORT, () => console.log(`Movies Server running on port ${PORT}`));
