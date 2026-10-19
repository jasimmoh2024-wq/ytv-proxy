const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: '*' }));

app.get('/', (req,res)=> res.sendFile(path.join(__dirname,'index.html')));

app.get('/app-ads.txt', (req,res)=>{
  res.type('text/plain');
  res.send('start.io, 110183401, DIRECT, d4c1a32e9ccbda8e');
});

// ✅ يرجع الروابط مباشرة بدون تشفير وبدون توكن
app.get('/api/channels', (req,res)=>{
  const file = path.join(__dirname,'channels.m3u');
  if(!fs.existsSync(file)) return res.status(404).json([]);
  const content = fs.readFileSync(file,'utf-8');
  const lines = content.split('\n');
  const channels=[];
  let name='', logo='';
  for(let line of lines){
    line=line.trim(); if(!line) continue;
    if(line.startsWith('#EXTINF:')){
      const l = line.match(/tvg-logo="([^"]+)"/i); logo = l ? l[1] : '';
      const n = line.match(/tvg-name="([^"]+)"/i); name = n ? n[1] : line.split(',').pop().trim();
    } else if(line.startsWith('http')){
      channels.push({ name: name || 'قناة', logo, url: line });
      name=''; logo='';
    }
  }
  res.json(channels);
});

app.listen(PORT, ()=>console.log('Running '+PORT));
