const http = require('http');
const https = require('https');

const PORT = process.env.PORT || 8080;
const TARGET_HOST = 're.new-redirect.online';

const server = http.createServer((req, res) => {
    // 1. إعدادات الـ CORS لتوافق مشغل منصة App Creator 24 وهواتف أندرويد
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // 2. تتبع التحويلات التلقائية وسيرفرات البث الحقيقية المكتشفة في الفحص (h26.flavello.lol)
    let currentHost = TARGET_HOST;
    if (req.url.includes('0021012254') || req.url.includes('.js')) {
        currentHost = 'h26.flavello.lol';
    }

    const myHost = req.headers.host;
    const protocol = req.connection.encrypted ? 'https' : 'http';

    // 3. الأوامر البرمجية التي تجعل السيرفر يبدو كمشغل تطبيق ياسين تي في الرسمي
    const options = {
        hostname: currentHost,
        port: 443, // استخدام المنفذ الآمن المشفر قسرياً كما ظهر في الـ Request الأصلي
        path: req.url,
        method: req.method,
        headers: {
            'Host': currentHost,
            // نسخ بصمة المتصفح والمشغل الدقيقة من بيانات الفحص الخاصة بك
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36',
            'Referer': 'https://x.com', // الموقع المحيل الإلزامي لتخطي الحظر
            'Accept-Encoding': 'identity', // إجبار السيرفر على عدم ضغط البيانات لقراءة الروابط الداخلية
            'Connection': 'keep-alive'
        }
    };

    // 4. فتح الاتصال المشفر ونقل تيار الفيديو بالنيابة عن التطبيق
    const proxyReq = https.request(options, (proxyRes) => {
        
        // معالجة كود التحويل (302 Found) قسرياً لتتبع روابط التشغيل
        if (proxyRes.statusCode === 302 || proxyRes.statusCode === 301) {
            let redirectUrl = proxyRes.headers.location;
            redirectUrl = redirectUrl.replace(/https?:\/\/re\.new-redirect\.online/g, '');
            redirectUrl = redirectUrl.replace(/https?:\/\/h26\.flavello\.lol/g, '');
            res.writeHead(302, { 'Location': `${protocol}://${myHost}${redirectUrl}` });
            res.end();
            return;
        }

        let contentType = proxyRes.headers['content-type'] || '';
        
        // 5. قراءة وتعديل الروابط والقطع المضللة (.js) داخل ملف الـ m3u8 لتعمل عبر السيرفر
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
            // 6. ضخ بيانات البث والفيديو مباشرة (Stream Piping) من منزلك إلى المشاهدين خارج الشبكة
            res.writeHead(proxyRes.statusCode, proxyRes.headers);
            proxyRes.pipe(res, { end: true });
        }
    });

    proxyReq.on('error', (err) => {
        res.writeHead(500);
        res.end('YTV Emulation Proxy Error');
    });

    req.pipe(proxyReq, { end: true });
});

server.listen(PORT, () => {
    console.log(`🚀 سيرفر محاكاة مشغل ياسين تي في يعمل بنجاح الآن على المنفذ: ${PORT}`);
});
