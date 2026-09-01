const http = require('http');
const https = require('https');

const PORT = process.env.PORT || 8080;
// السيرفر الجديد المكتشف في فحصك
const TARGET_HOST = 'shd-amg-fast.edgenextcdn.net';

const server = http.createServer((req, res) => {
    // إعدادات CORS لتوافق مشغلات أندرويد والمنصة
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    const myHost = req.headers.host;
    const protocol = req.connection.encrypted ? 'https' : 'http';

    // إعداد الهيدرز والمحاكاة الكاملة المتوافقة مع جدار حماية EdgeNext CDN
    const options = {
        hostname: TARGET_HOST,
        port: 443, // استخدام الاتصال الآمن المشفر قسرياً
        path: req.url,
        method: req.method,
        headers: {
            'Host': TARGET_HOST,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36',
            'Referer': 'https://x.com',
            'Accept-Encoding': 'identity', // إلغاء الضغط لقراءة الروابط داخلياً
            'Connection': 'keep-alive'
        }
    };

    const proxyReq = https.request(options, (proxyRes) => {
        let contentType = proxyRes.headers['content-type'] || '';
        
        // تعديل روابط ملف الـ m3u8 لكي تمر القطع والمسارات عبر سيرفرك قسرياً
        if (contentType.includes('mpegurl') || contentType.includes('x-mpegurl') || req.url.includes('.m3u8')) {
            let body = '';
            proxyRes.on('data', chunk => { body += chunk; });
            proxyRes.on('end', () => {
                let modifiedBody = body.replace(/[^#\r\n]+/g, (line) => {
                    let trimmed = line.trim();
                    if (trimmed.startsWith('/') || trimmed.includes('.js') || trimmed.includes('.ts')) {
                        return `${protocol}://${myHost}${trimmed}`;
                    }
                    return line;
                });
                
                res.writeHead(proxyRes.statusCode, proxyRes.headers);
                res.end(modifiedBody);
            });
        } else {
            // ضخ قطع الفيديو الحقيقية (Stream Piping) عبر الأي بي الثابت الخاص بك
            res.writeHead(proxyRes.statusCode, proxyRes.headers);
            proxyRes.pipe(res, { end: true });
        }
    });

    proxyReq.on('error', (err) => {
        res.writeHead(500);
        res.end('EdgeNext CDN Proxy Error');
    });

    req.pipe(proxyReq, { end: true });
});

server.listen(PORT, () => {
    console.log(`🚀 سيرفر محاكاة EdgeNext يعمل الآن بنجاح على المنفذ: ${PORT}`);
});
