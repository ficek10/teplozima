/* Teploměr – mezipaměť pro rychlé opakované načtení a hraní offline.
   Stránka a tajna.js: nejdřív síť (aby se hned projevily změny), bez sítě z mezipaměti.
   Slovník a data: hned z mezipaměti, na pozadí se ověří novější verze pro příští návštěvu. */
const CACHE="teplomer-v3";
const DATA=/\.(txt|json)$/;
self.addEventListener("install",e=>self.skipWaiting());
self.addEventListener("activate",e=>e.waitUntil((async()=>{
  for(const k of await caches.keys()) if(k!==CACHE) await caches.delete(k);
  await self.clients.claim();
})()));
self.addEventListener("fetch",e=>{
  const req=e.request; if(req.method!=="GET") return;
  const url=new URL(req.url);
  const same=url.origin===location.origin;
  const cdn=/cdnjs\.cloudflare\.com|fonts\.(googleapis|gstatic)\.com/.test(url.host);
  if(!same&&!cdn) return;
  if(same&&DATA.test(url.pathname)&&!url.pathname.endsWith("manifest.json")) e.respondWith(staleWhileRevalidate(e,req));
  else if(cdn) e.respondWith(cacheFirst(req));
  else e.respondWith(networkFirst(req));
});
async function staleWhileRevalidate(e,req){
  const c=await caches.open(CACHE), hit=await c.match(req);
  const net=fetch(req,{cache:"no-cache"}).then(r=>{if(r.ok)c.put(req,r.clone());return r});
  if(hit){e.waitUntil(net.catch(()=>{}));return hit}
  return net;
}
async function cacheFirst(req){
  const c=await caches.open(CACHE), hit=await c.match(req); if(hit) return hit;
  const r=await fetch(req); if(r.ok||r.type==="opaque") c.put(req,r.clone()); return r;
}
async function networkFirst(req){
  const c=await caches.open(CACHE);
  try{const r=await fetch(req); if(r.ok) c.put(req,r.clone()); return r}
  catch(err){const hit=await c.match(req,{ignoreSearch:true}); if(hit) return hit; throw err}
}
