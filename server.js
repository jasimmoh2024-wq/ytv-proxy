const http = require('http');
const https = require('https');
const URL = require('url');

const PORT = process.env.PORT || 8080;

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

    // تبديل السيرفر المستهدف ديناميكياً بناءً على فحص البيانات
    let targetHost = 're.new-redirect.online';
    if (req.url.includes('0021012254') || req.url.includes('.js')) {
        targetHost = 'h26.flavello.lol';
    }

    const myHost = req.headers.host;
    const protocol = req.connection.encrypted ? 'https' : 'http';

    // استخدام التشفير الكامل لمحاكاة الطلب الأصلي المكتشف في الـ Logs
    const options = {
        hostname: targetHost,
        port: 443, // التحويل إلى المنفذ المشفر الآمن 443 قسرياً
        path: req.url,
        method: req.method,
        headers: {
            'Host': targetHost,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36',
            'Referer': 'https://x.com',
            'Accept-Encoding': 'identity', // إلغاء الضغط لكي يتمكن السيرفر من قراءة وتعديل الروابط الداخلية
            'Connection': 'keep-alive'
        }
    };

    // استخدام https.request بدلاً من http.request لفتح التشفير
    const proxyReq = https.request(options, (proxyRes) => {
        
        // التعامل مع كود التحويل التلقائي (302 Found) المشفر
        if (proxyRes.statusCode === 302 || proxyRes.statusCode === 301) {
            let redirectUrl = proxyRes.headers.location;
            redirectUrl = redirectUrl.replace('http://new-redirect.online', '');
            redirectUrl = redirectUrl.replace('https://new-redirect.online', '');
            redirectUrl = redirectUrl.replace('http://flavello.lol', '');
            redirectUrl = redirectUrl.replace('https://flavello.lol', '');
            res.writeHead(302, { 'Location': `${protocol}://${myHost}${redirectUrl}` });
            res.end();
            return;
        }

        let contentType = proxyRes.headers['content-type'] || '';
        
        // تعديل روابط ملف الـ m3u8 والقطع المضللة (.js)
        if (contentType.includes('mpegurl') || contentType.includes('x-mpegurl') || req.url.includes('.m3u8')) {
            let body = '';
            proxyRes.on('data', chunk => { body += chunk; });
            proxyRes.on('end', () => {
                let modifiedBody = body.replace(/[^#\r\n]+/g, (line) => {
                    let trimmed = line.trim();
                    if (trimmed.startsWith('/') || trimmed.includes('.js')) {
                        return `${protocol}://${myHost}${trimmed}`;
                    }
                    return line;
                });
                
                res.writeHead(proxyRes.statusCode, proxyRes.headers);
                res.end(modifiedBody);
            });
        } else {
            // ضخ قطع الفيديو المشفرة مباشرة وتمريرها للمشاهد
            res.writeHead(proxyRes.statusCode, proxyRes.headers);
            proxyRes.pipe(res, { end: true });
        }
    });

    proxyReq.on('error', (err) => {
        console.error('❌ خطأ في الاتصال المشفر:', err.message);
        res.writeHead(500);
        res.end('Secure Stream Proxy Error');
    });

    req.pipe(proxyReq, { end: true });
});

server.listen(PORT, () => {
    console.log(`🚀 سيرفر التشفير الكامل يعمل الآن بنجاح على المنفذ: ${PORT}`);
});
