// 정적 파일만 캐시해서 오프라인에서도 마지막으로 본 화면이 뜨게 함.
// 이 앱은 외부 API를 호출하지 않으므로 별도 예외 처리는 필요 없음.
//
// v2: index.html/manifest처럼 자주 바뀌는 파일은 "네트워크 먼저, 실패하면 캐시"로 바꿈.
// (v1은 캐시를 먼저 보는 방식이라, 깃허브에 새 내용을 올려도 기기에 저장된
//  예전 화면이 계속 떠서 업데이트가 반영되지 않는 문제가 있었음)
const CACHE_NAME = 'sahoi-homework-v2';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

function isFreshFirst(request) {
  const url = request.url;
  return request.mode === 'navigate' || url.endsWith('.html') || url.endsWith('/') || url.endsWith('manifest.json');
}

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  if (isFreshFirst(event.request)) {
    // 네트워크(최신 버전)를 먼저 시도하고, 실패하면(오프라인) 캐시로 대체
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone));
          return res;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // 아이콘 등 잘 안 바뀌는 파일은 기존처럼 캐시 우선
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return (
        cached ||
        fetch(event.request)
          .then((res) => {
            const resClone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone));
            return res;
          })
          .catch(() => cached)
      );
    })
  );
});
