const http = require('http');
const URL = require('url');

const PORT = process.env.PORT || 8080;
const TARGET_HOST = 're.new-redirect.online';

const server = http.createServer((req, res) => {
    // إعدادات CORS لتوافق المشغلات
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

    // إعداد الهيدرز الأمنية لمحاكاة مشغل ياسين تي في الرسمي
    const options = {
        hostname: TARGET_HOST,
        port: 80,
        path: req.url,
        method: req.method,
        headers: {
            'Host': TARGET_HOST,
            'User-Agent': 'YTVPlayer/1.0 (Android; Mobile)',
            'Referer': `http://${TARGET_HOST}/`,
            'Origin': `http://${TARGET_HOST}`
        }
    };

    const proxyReq = http.request(options, (proxyRes) => {
        let contentType = proxyRes.headers['content-type'] || '';
        
        // إذا كان الملف المطلوب هو قائمة التشغيل m3u8، نقوم بتعديل الروابط داخلياً
        if (contentType.includes('mpegurl') || contentType.includes('x-mpegurl') || req.url.includes('.m3u8')) {
            let body = '';
            proxyRes.on('data', chunk => { body += chunk; });
            proxyRes.on('end', () => {
                // إجبار الروابط الداخلية والقطع على المرور عبر سيرفر Render الخاص بك
                const parsedUrl = URL.parse(req.url, true);
                const queryStr = parsedUrl.search || '';
                
                let modifiedBody = body.replace(/[^#\r\n]+/g, (line) => {
                    if (line.trim().startsWith('http') || line.trim().includes('.ts') || line.trim().includes('segment')) {
                        // إذا كان رابطاً كاملاً أو قطعة فيديو، نربطها بسيرفرنا
                        if (!line.startsWith('http')) {
                            const basePath = req.url.substring(0, req.url.lastIndexOf('/') + 1);
                            return `${protocol}://${myHost}${basePath}${line.trim()}${queryStr}`;
                        }
                        return line.trim();
                    }
                    return line;
                });
                
                res.writeHead(proxyRes.statusCode, proxyRes.headers);
                res.end(modifiedBody);
            });
        } else {
            // إذا كان الطلب عبارة عن قطعة فيديو حية (TS)، يمررها السيرفر مباشرة كاميرا/صوت
            res.writeHead(proxyRes.statusCode, proxyRes.headers);
            proxyRes.pipe(res, { end: true });
        }
    });

    proxyReq.on('error', (err) => {
        res.writeHead(500);
        res.end('Stream Proxy Error');
    });

    req.pipe(proxyReq, { end: true });
});

server.listen(PORT, () => {
    console.log(`🚀 سيرفر البث الكامل يعمل الآن بنجاح على المنفذ: ${PORT}`);
});
