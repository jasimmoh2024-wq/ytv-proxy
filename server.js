const http = require('http');
const httpProxy = require('http');

const PORT = process.env.PORT || 8080;

const server = http.createServer((req, res) => {
    // إعدادات الـ CORS الكاملة لتوافق جميع المشغلات
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // تحديد السيرفر المستهدف ديناميكياً بناءً على التحويلات الحاصلة في ياسين
    let targetHost = 're.new-redirect.online';
    if (req.url.includes('0021012254')) {
        targetHost = 'h26.flavello.lol'; // السيرفر الحقيقي للفيديو المكتشف في الفحص
    }

    const myHost = req.headers.host;
    const protocol = req.connection.encrypted ? 'https' : 'http';

    const options = {
        hostname: targetHost,
        port: 80,
        path: req.url,
        method: req.method,
        headers: {
            'Host': targetHost,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36',
            'Referer': 'https://x.com/', // الهيدر الرسمي المكتشف في البيانات الخاصة بك
            'Connection': 'keep-alive'
        }
    };

    const proxyReq = http.request(options, (proxyRes) => {
        // إذا قام السيرفر بالتحويل (302) نتعقبه برمجياً
        if (proxyRes.statusCode === 302 || proxyRes.statusCode === 301) {
            let redirectUrl = proxyRes.headers.location;
            redirectUrl = redirectUrl.replace('http://new-redirect.online', '');
            redirectUrl = redirectUrl.replace('http://h26.flavello.lol', '');
            res.writeHead(302, { 'Location': `${protocol}://${myHost}${redirectUrl}` });
            res.end();
            return;
        }

        let contentType = proxyRes.headers['content-type'] || '';
        
        // تعديل محتويات ملف الـ m3u8 والامتدادات المضللة .js
        if (contentType.includes('mpegurl') || contentType.includes('x-mpegurl') || req.url.includes('.m3u8')) {
            let body = '';
            proxyRes.on('data', chunk => { body += chunk; });
            proxyRes.on('end', () => {
                let modifiedBody = body.replace(/[^#\r\n]+/g, (line) => {
                    let trimmed = line.trim();
                    if (trimmed.startsWith('/') || trimmed.includes('.js')) {
                        // إجبار قطع الـ .js المضللة على المرور عبر سيرفرك
                        return `${protocol}://${myHost}${trimmed}`;
                    }
                    return line;
                });
                
                res.writeHead(proxyRes.statusCode, proxyRes.headers);
                res.end(modifiedBody);
            });
        } else {
            // ضخ قطع الفيديو مباشرة للمشاهدين عبر السيرفر بأمان
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
    console.log(`🚀 السيرفر الخارق يعمل الآن ومتوافق مع التعديلات الجديدة على المنفذ: ${PORT}`);
});
