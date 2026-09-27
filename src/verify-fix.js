const https = require('https');

function check(name, ua) {
  const req = https.request({
    hostname: 'bazar-fashion.vercel.app',
    path: '/product/laptops/dell-precision-5550-intel-core-i9-10885h-nvidia-quadro-t2000-4gb-15-6-inch-4k-touch',
    headers: ua ? { 'user-agent': ua } : {}
  }, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      const ogImage = (data.match(/property="og:image" content="([^"]+)"/) || [])[1];
      const ogTitle = (data.match(/property="og:title" content="([^"]+)"/) || [])[1];
      const matched = res.headers['x-matched-path'] || 'unknown';
      console.log(`[${name}] HTTP ${res.statusCode} | path=${matched}`);
      if (ogTitle) console.log(`  og:title = ${ogTitle.substring(0, 80)}...`);
      if (ogImage) console.log(`  og:image = ${ogImage}`);
      if (!ogImage && res.statusCode !== 200) console.log(`  ⚠️  No og:image found - BROKEN`);
      if (ogImage) console.log(`  ✅ og:image found - WORKING`);
    });
  });
  req.on('error', console.error);
  req.end();
}

console.log('Testing after middleware.js removal...\n');
check('No User-Agent', null);
setTimeout(() => check('WhatsApp Crawler', 'WhatsApp/2.21.12.21 N'), 500);
setTimeout(() => check('Facebook Crawler', 'facebookexternalhit/1.1'), 1000);
setTimeout(() => check('Telegram Bot', 'TelegramBot (like TwitterBot)'), 1500);
