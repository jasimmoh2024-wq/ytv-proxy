const express = require('express');
const axios = require('axios');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET_TOKENS = new Map();

app.use(cors({ origin: '*', methods: ['GET','OPTIONS'], allowedHeaders: ['*'] }));
app.options('*', cors());

app.get('/app-ads.txt', (req, res) => {
    res.set('Content-Type', 'text/plain');
    res.send('start.io, 110183401, DIRECT, d4c1a32e9ccbda8e');
});
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

app.get('/api/get-token', (req, res) => {
    const token = crypto.randomBytes(16).toString('hex');
    SECRET_TOKENS.set(token, Date.now() + 10*60*1000);
    res.json({ token });
});

app.get('/api/channels', (req, res) => {
    const filePath = path.join(__dirname, 'channels.m3u');
    if (!fs.existsSync(filePath)) return res.status(404).json({error:'لا يوجد ملف'});
    const content = fs.readFileSync(filePath,'utf-8');
    const lines = content.split('\n');
    const channels=[];
    let name='', logo='';
    for(let line of lines){
        line=line.trim(); if(!line) continue;
        if(line.startsWith('#EXTINF:')){
            let lm=line.match(/tvg-logo="([^"]+)"/i); logo=lm?lm[1]:'';
            let nm=line.match(/tvg-name="([^"]+)"/i); name=nm?nm[1]:line.split(',').pop().trim();
        } else if(line.startsWith('http')){
            channels.push({ name: name||'قناة', logo, url: Buffer.from(line).toString('base64'), originalUrl: line });
            name=''; logo='';
        }
    }
    res.json(channels);
});

// === التعديل الجوهري هنا - اعادة كتابة ملفات m3u8 ===
app.get('/stream', async (req, res) => {
    let targetUrl = req.query.url;
    if (!targetUrl) return res.status(400).send('رابط ناقص');
    try { if(!targetUrl.startsWith('http')) targetUrl = Buffer.from(targetUrl,'base64').toString('utf-8'); } catch(e){}

    try{
        const response = await axios({
            method:'get',
            url: targetUrl,
            responseType: 'arraybuffer',
            timeout: 20000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Linux; Android 10; ExoPlayer) AppleWebKit/537.36',
                'Accept': '*/*',
                'Referer': targetUrl,
                'Origin': new URL(targetUrl).origin
            }
        });

        let contentType = response.headers['content-type'] || '';
        let isM3U8 = targetUrl.includes('.m3u8') || contentType.includes('mpegurl') || contentType.includes('x-mpegURL') || contentType.includes('text/plain');

        // اذا هو ملف m3u8 نعيد كتابة الروابط داخله
        if(isM3U8){
            let text = Buffer.from(response.data).toString('utf-8');
            const baseUrl = targetUrl.substring(0, targetUrl.lastIndexOf('/')+1);
            
            text = text.split('\n').map(line=>{
                line=line.trim();
                if(!line || line.startsWith('#')) return line;
                // line هو رابط مقطع
                let fullUrl = line.startsWith('http') ? line : baseUrl + line;
                let proxied = `${req.protocol}://${req.get('host')}/stream?url=${encodeURIComponent(Buffer.from(fullUrl).toString('base64'))}`;
                return proxied;
            }).join('\n');

            res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
            res.setHeader('Access-Control-Allow-Origin','*');
            res.setHeader('Cache-Control','no-cache');
            return res.send(text);
        }

        // اذا هو مقطع فيديو .ts او غيره
        res.setHeader('Content-Type', contentType || 'video/mp2t');
        res.setHeader('Access-Control-Allow-Origin','*');
        res.setHeader('Cache-Control','no-cache');
        res.send(Buffer.from(response.data));

    }catch(e){
        console.log("STREAM ERROR:", targetUrl, e.message);
        if(!res.headersSent) res.status(500).send('خطأ في البث: ' + e.message);
    }
});

app.listen(PORT, ()=>console.log(`Server running on ${PORT}`));
