javascriptconst http = require('http');
const https = require('https');

const PORT = process.env.PORT || 8080;
const TARGET_HOST = 're.new-redirect.online';

const server = http.createServer((req, res) => {
    // إعدادات CORS لتوافق أندرويد والمنصة
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // بناء الطلب المحاكي الشامل مع الهيدرز الرسمية لمشغل ياسين
    const options = {
        hostname: TARGET_HOST,
        port: 80,
        path: req.url,
        method: req.method,
        headers: {
            'Host': TARGET_HOST,
            'User-Agent': 'YTVPlayer/1.0 (Android; Mobile)',
            'Referer': `http://${TARGET_HOST}/`,
            'Origin': `http://${TARGET_HOST}`,
            'Connection': 'keep-alive'
        }
    };

    const proxyReq = http.request(options, (proxyRes) => {
        // إدارة وتعديل الروابط الداخلية لملفات الفيديو لكي تمر قسرياً عبر سيرفرك الخاص
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        proxyRes.pipe(res, { end: true });
    });

    proxyReq.on('error', (err) => {
        console.error('❌ خطأ في نقل بيانات البث:', err.message);
        res.writeHead(500);
        res.end('Stream Error');
    });

    req.pipe(proxyReq, { end: true });
});

server.listen(PORT, () => {
    console.log(`🚀 سيرفر إعادة البث الكامل يعمل الآن على المنفذ: ${PORT}`);
