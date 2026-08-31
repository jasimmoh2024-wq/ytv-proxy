const http = require('http');

const PORT = process.env.PORT || 8080;
const TARGET_SERVER = 're.new-redirect.online';

const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    const options = {
        hostname: TARGET_SERVER,
        port: 80,
        path: req.url,
        method: req.method,
        headers: {
            'Host': TARGET_SERVER,
            'User-Agent': 'YTVPlayer/1.0 (Android; Mobile)',
            'Referer': `http://${TARGET_SERVER}/`
        }
    };

    const proxyReq = http.request(options, (proxyRes) => {
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        proxyRes.pipe(res, { end: true });
    });

    proxyReq.on('error', (err) => {
        res.writeHead(500);
        res.end('Server Error');
    });

    req.pipe(proxyReq, { end: true });
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
