self.addEventListener("install", (e) => {
  console.log("Service Worker Installed");
  self.skipWaiting();
});

self.addEventListener("fetch", () => {});
