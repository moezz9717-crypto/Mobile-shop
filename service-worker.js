/* ====== Service Worker لتطبيق خزنة فودافون كاش ======
   - يخزّن ملفات الواجهة (App Shell) للعمل دون اتصال.
   - عند نزول إصدار جديد، غيّر رقم CACHE_VERSION فيظهر للمستخدم زر تحديث.
*/

const CACHE_VERSION = 'vfcash-v7';                 // ← غيّر الرقم مع كل تحديث للتطبيق
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png'
];

// تثبيت: تخزين ملفات الواجهة
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL))
  );
});

// تفعيل: حذف النسخ القديمة من الكاش
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// استقبال أمر تخطّي الانتظار من الصفحة (زر التحديث)
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

// جلب: 
//  - طلبات Supabase والشبكة الخارجية: من الشبكة دائمًا (مع تجاهل الكاش).
//  - ملفات الواجهة: من الكاش أولًا ثم الشبكة (Cache First).
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // لا نتدخل في طلبات غير GET أو طلبات Supabase / CDN
  if (req.method !== 'GET' || url.origin !== self.location.origin) {
    return; // المتصفح يتولّاها مباشرة (تحتاج إنترنت)
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((res) => {
          // خزّن نسخة من ملفات الموقع نفسه
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((c) => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match('./index.html')); // صفحة احتياطية دون اتصال
    })
  );
});
