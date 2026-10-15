// ابحث عن السطر الخاص بـ if (line.startsWith('#EXTINF:')) واستبدل الجزء الداخلي ليكون هكذا:
if (line.startsWith('#EXTINF:')) {
    // استخراج الشعار تلقائياً
    let logoMatch = line.match(/tvg-logo="([^"]+)"/i);
    let currentLogo = logoMatch ? logoMatch[1] : '';

    let nameMatch = line.match(/tvg-name="([^"]+)"/i);
    if (nameMatch && nameMatch[1]) {
        currentName = nameMatch[1];
    } else {
        let commaIndex = line.lastIndexOf(',');
        currentName = commaIndex !== -1 ? line.substring(commaIndex + 1).trim() : 'قناة بدون اسم';
    }
    
    // حفظ البيانات مؤقتاً لتمريرها
    currentChannelLogo = currentLogo; 
} else if (line.startsWith('http://') || line.startsWith('https://')) {
    channels.push({
        name: currentName,
        url: line,
        logo: currentChannelLogo // إضافة الشعار للـ API
    });
    currentName = '';
    currentChannelLogo = '';
}
