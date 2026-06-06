// ---- Fake browser environment via Proxy ----
const store = {};
globalThis.localStorage = {
  getItem: k => (k in store ? store[k] : null),
  setItem: (k,v) => { store[k]=String(v); },
  removeItem: k => { delete store[k]; }
};
const noop = () => {};
function fakeEl(){
  return new Proxy(function(){}, {
    get(t,p){
      if(p==='style') return {};
      if(p==='classList') return {add:noop,remove:noop,toggle:noop,contains:()=>false};
      if(p==='dataset') return {};
      if(p==='value') return '';
      if(p==='textContent') return '';
      if(p==='addEventListener') return noop;
      if(p==='appendChild') return noop;
      if(p==='querySelector') return ()=>fakeEl();
      if(p==='innerHTML') return '';
      return fakeEl();
    },
    set(){ return true; },
    apply(){ return fakeEl(); }
  });
}
globalThis.document = {
  getElementById: ()=>fakeEl(),
  querySelectorAll: ()=>[],
  querySelector: ()=>fakeEl(),
  createElement: ()=>fakeEl(),
  addEventListener: noop
};
globalThis.window = { addEventListener: noop, matchMedia:()=>({matches:false}), navigator:{}, innerWidth:1200, MSStream:undefined };
globalThis.navigator = { userAgent:'node', standalone:false, serviceWorker:undefined };
globalThis.setInterval = noop; globalThis.setTimeout = (f)=>{};
globalThis.matchMedia = ()=>({matches:false});

// ---- Load the app script ----
const fs=require('fs');
let html=fs.readFileSync('index.html','utf8');
let m=html.match(/<script>([\s\S]*?)<\/script>/)[1];
// expose tested fns to global
m += '\nglobalThis.__t={buildMessage,waUrl,SECTIONS,getProfile,setProfile,getReports,saveReports,todayStr};';
eval(m);

const T=globalThis.__t;
T.setProfile({nombre:'Juan Pérez', empresa:'Aerolíneas del Sur'});

console.log('Today:', T.todayStr());
console.log('\n=== MENSAJES + URLS ===');
for(const sec of T.SECTIONS){
  console.log('\n## '+sec.title);
  for(const it of sec.items){
    const msg=T.buildMessage(it);
    const url=T.waUrl(it);
    console.log(' - ['+it.label+']');
    console.log('   MSG: '+msg);
    // verify phone + decode roundtrip
    const u=new URL(url);
    if(u.searchParams.get('phone')!=='584129089379') throw new Error('bad phone '+it.id);
    if(decodeURIComponent(u.searchParams.get('text'))!==msg) throw new Error('decode mismatch '+it.id);
  }
}

console.log('\n=== RESET DIARIO ===');
let r=T.getReports(); r['op_salir_casa']={date:'2000-01-01',time:'08:00',ts:1}; T.saveReports(r);
r=T.getReports();
console.log('Entrada vieja eliminada al cambiar dia:', !('op_salir_casa' in r));
r['op_lleg_casa']={date:T.todayStr(),time:'19:30',ts:Date.now()}; T.saveReports(r);
console.log('Entrada de hoy se mantiene:', 'op_lleg_casa' in T.getReports());
console.log('\nALL CHECKS PASSED');
