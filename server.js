        // 2. معالج تشغيل البث المباشر المطور للمشغلات الخارجية
        function playChannel(url, name) {
            statusText.textContent = `جاري تجهيز البث للقناة: ${name} ...`;
            
            // تمرير الرابط المباشر من خلال سيرفر رندر الوسيط
            const proxyUrl = `${host}/stream?url=${encodeURIComponent(url)}`;
            
            // تحقق إذا كان المستخدم يفتح الرابط من هاتف أندرويد
            const isAndroid = /Android/i.test(navigator.userAgent);

            if (isAndroid) {
                statusText.textContent = `جاري فتح القناة [${name}] على مشغل ExoPlayer الخارجي بـ أندرويد...`;
                
                // سطر الـ Intent الأساسي لإجبار نظام أندرويد على تشغيل الرابط بدون امتداد عبر مشغل ميديا خارجي
                // نستخدم نوع البث "video/*" للروابط عديمة الامتداد ليتعرف عليها المشغل تلقائياً
                const androidIntent = `intent:${proxyUrl}#Intent;action=view;type=video/*;S.title=${encodeURIComponent(name)};end`;
                
                // تحويل المتصفح فوراً لفتح التطبيق الخارجي بالهاتف
                window.location.href = androidIntent;
            } else {
                // حل بديل للمتصفحات العادية على الكمبيوتر (إضافة امتداد وهمي مخصص لحل مشاكل الامتداد)
                const webUrl = `${proxyUrl}&extension=.m3u8`;
                videoElement.src = webUrl;
                videoElement.load();
                
                videoElement.onplay = () => {
                    statusText.textContent = `يعرض الآن على المتصفح: ${name} ✅`;
                };

                videoElement.onerror = () => {
                    statusText.textContent = `⚠️ فشل التشغيل بالمتصفح! بسبب قيود الحماية (CORS). يرجى فتح الصفحة من الهاتف لتعمل فوراً عبر الـ ExoPlayer الخارجي.`;
                };
            }
        }
