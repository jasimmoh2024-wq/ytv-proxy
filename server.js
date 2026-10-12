const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// 1. تفعيل الـ CORS للسماح لصفحة الـ HTML وأي متصفح خارجي بقراءة البث بدون قيود أمنية
app.use(cors({
    origin: '*',
    methods: ['GET'],
    allowedHeaders: ['Content-Type']
}));

// 2. الصفحة الرئيسية للتأكد من أن السيرفر يعمل بنجاح
app.get('/', (req, res) => {
    res.send('<h1>سيرفر الوسيط (IPTV Proxy Backend) يعمل بنجاح!</h1>');
});

// 3. رابط الوسيط الذكي لتمرير القنوات (Proxy Endpoint)
app.get('/stream', async (req, res) => {
    // جلب رابط القناة الأصلي المرسل عبر الـ URL Parameter
    // مثال للاستخدام: https://onrender.com
    const targetUrl = req.query.url;

    if (!targetUrl) {
        return res.status(400).json({ error: 'الرجاء إدخال رابط القناة الفعلي في خيار ?url=' });
    }

    try {
        // الاتصال بسيرفر الـ IPTV الأصلي وجلب البث كتدفق مستمر (Stream)
        const response = await axios({
            method: 'get',
            url: targetUrl,
            responseType: 'stream',
            timeout: 10000, // مهلة 10 ثوانٍ للاتصال بالسيرفر الأصلي
            headers: {
                // محاكاة متصفح أو مشغل ذكي لضمان عدم حظر سيرفر الـ IPTV لطلبك
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        // أهم خطوة: إجبار المتصفح على قراءة الملف كبث فيديو مباشر (MPEG-TS) ومنعه من تحميله كملف تنزيل
        res.setHeader('Content-Type', 'video/mp2t'); 
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        // تمرير دفق الفيديو من سيرفر الـ IPTV الأصلي إلى المتصفح مباشرة وثانية بثانية
        response.data.pipe(res);

        // التعامل مع انقطاع اتصال المستخدم لغلق التدفق وتوفير موارد السيرفر
        req.on('close', () => {
            response.data.destroy();
        });

    } catch (error) {
        console.error('خطأ في جلب القناة:', error.message);
        res.status(500).send('تعذر الاتصال بسيرفر القنوات الأصلي، تأكد من أن الرابط يعمل أو أن القناة ليست متوقفة.');
    }
});

// تشغيل الخادم
app.listen(PORT, () => {
    console.log(`Server is running successfully on port ${PORT}`);
});
