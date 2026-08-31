const http = require('http');

const PORT = process.env.PORT || 8080;
const TARGET_HOST = 're.new-redirect.online';

const server = http.createServer((req, res) => {
    // 1. إعدادات CORS لتوافق مشغل منصة App Creator 24 والأندرويد
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // 2. أوامر المحاكاة والهيدرز الدقيقة الخاصة بمشغل الوسائط VLC الرسمي
    const options = {
        hostname: TARGET_HOST,
        port: 80,
        path: req.url,
        method: req.method,
        headers: {
            'Host': TARGET_HOST,
            'User-Agent': 'VLC/3.0.18 LibVLC/3.0.18', // هوية مشغل VLC الرسمية عالمياً
            'Icy-MetaData': '1',
            'Range': req.headers.range || 'bytes=0-',
            'Connection': 'keep-alive'
        }
    };

    // 3. إرسال الطلب المحاكي واستقبال البث من السيرفر الأصلي
    const proxyReq = http.request(options, (proxyRes) => {
        // تمرير أكواد الاستجابة والبيانات الأصلية للفيديو (MPEG-TS أو HLS)
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        
        // ضخ بيانات الفيديو مباشرة (Piping) من السيرفر إلى المنصة بدون انقطاع
        proxyRes.pipe(res, { end: true });
    });

    proxyReq.on('error', (err) => {
        console.error('❌ خطأ في محاكاة VLC ونقل البيانات:', err.message);
        res.writeHead(500);
        res.end('VLC Emulation Error');
    });

    req.pipe(proxyReq, { end: true });
});

server.listen(PORT, () => {
    console.log(`🚀 سيرفر محاكاة VLC يعمل بنجاح عبر الأي بي الثابت على المنفذ: ${PORT}`);
});
