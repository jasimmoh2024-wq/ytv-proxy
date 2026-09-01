const http = require('http');
const https = require('https');

const PORT = process.env.PORT || 8080;

const server = http.createServer((req, res) => {
    // إعدادات الـ CORS الكاملة لتوافق المشغلات
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // لغز السيرفرين: تحديد السيرفر المستهدف بناءً على نوع الملف المطلوب
    let targetHost = 're.new-redirect.online';
    
    // إذا كان الطلب يحتوي على مسار الفيديو الفعلي المكتشف في فحصك، نتوجه للسيرفر الحقيقي
    if (req.url.includes('0021012254') || req.url.includes('.js')) {
        targetHost = 'h26.flavello.lol';
    }

    const myHost = req.headers.host;
    const protocol = req.connection.encrypted ? 'https' : 'http';

    const options = {
        hostname: targetHost,
        port: 443, // استخدام المنفذ الآمن المشفر دائماً
        path: req.url,
        method: req.method,
        headers: {
            'Host': targetHost,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36',
            'Referer': 'https://x.com',
            'Accept-Encoding': 'identity', // إلغاء الضغط لقراءة الروابط داخلياً
            'Connection': 'keep-alive'
        }
    };

    const proxyReq = https.request(options, (proxyRes) => {
        
        // معالجة الـ Redirect (302 Found) إذا حاول السيرفر تغيير المسار
        if (proxyRes.statusCode === 302 || proxyRes.statusCode === 301) {
            let redirectUrl = proxyRes.headers.location;
            redirectUrl = redirectUrl.replace(/https?:\/\/re\.new-redirect\.online/g, '');
            redirectUrl = redirectUrl.replace(/https?:\/\/h26\.flavello\.lol/g, '');
            res.writeHead(302, { 'Location': `${protocol}://${myHost}${redirectUrl}` });
            res.end();
            return;
        }

        let contentType = proxyRes.headers['content-type'] || '';
        
        // تعديل محتويات ملف الـ m3u8 لكي تمر القطع المضللة (.js) عبر سيرفر Render الخاص بك
        if (contentType.includes('mpegurl') || contentType.includes('x-mpegurl') || req.url.includes('.m3u8')) {
            let body = '';
            proxyRes.on('data', chunk => { body += chunk; });
            proxyRes.on('end', () => {
                let modifiedBody = body.replace(/[^#\r\n]+/g, (line) => {
                    let trimmed = line.trim();
                    if (trimmed.startsWith('/') || trimmed.includes('.js')) {
                        // إجبار القطع الحقيقية المضللة بصيغة .js على المرور عبر سيرفرك
                        return `${protocol}://${myHost}${trimmed}`;
                    }
                    return line;
                });
                
                res.writeHead(proxyRes.statusCode, proxyRes.headers);
                res.end(modifiedBody);
            });
        } else {
            // ضخ قطع الفيديو المشفرة مباشرة للمستخدم عبر سيرفرك (Stream Piping)
            res.writeHead(proxyRes.statusCode, proxyRes.headers);
            proxyRes.pipe(res, { end: true });
        }
    });

    proxyReq.on('error', (err) => {
        res.writeHead(500);
        res.end('Secure Proxy Routing Error');
    });

    req.pipe(proxyReq, { end: true });
});

server.listen(PORT, () => {
    console.log(`🚀 السيرفر المطور لحل مشكلة السيرفرين يعمل الآن على المنفذ: ${PORT}`);
});
