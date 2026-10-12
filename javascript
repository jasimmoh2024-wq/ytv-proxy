const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// رابط لجلب ملف القنوات بالكامل
app.get('/api/channels', (req, res) => {
    const filePath = path.join(__dirname, 'channels.m3u');
    
    // تحديد نوع الملف في الهيدر ليفهمه مشغل الـ IPTV
    res.setHeader('Content-Type', 'audio/x-mpegurl'); 
    res.sendFile(filePath);
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
