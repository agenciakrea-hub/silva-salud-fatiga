
/* ════════════════ CONFIG ════════════════ */
const APP_VERSION = '1.0';                 // ← Subí este número en cada actualización
const EVA_PHONE   = '584129089379';        // WhatsApp de EVA

// Iconos SVG reutilizables
const I = {
  homeOut:  '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5"/><path d="M16 6h5M18.5 3.5 21 6l-2.5 2.5"/>',
  planeIn:  '<path d="M2 22h20"/><path d="M3.5 16.5 21 11l-1-3-5 1-6-6-2 .6 3.5 5.4-4 1.2-2-1.5-1.5.5z"/>',
  planeOut: '<path d="M2 22h20"/><path d="M22 11 4 16l1-3 5-1 4-7 2 .5-2 6.5 4-1 1.5-2 1.5.5z"/>',
  homeIn:   '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5"/>',
  moon:     '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
  bed:      '<path d="M2 18v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5"/><path d="M2 18h20"/><path d="M6 11V8a2 2 0 0 1 2-2h3v5"/><path d="M22 11V8"/>',
  battery:  '<rect x="2" y="7" width="16" height="10" rx="2"/><line x1="22" y1="11" x2="22" y2="13"/><line x1="6" y1="11" x2="6" y2="13"/>',
  bolt:     '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
  brain:    '<path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44A2.5 2.5 0 0 1 4 17.5a2.5 2.5 0 0 1-.95-4.81A2.5 2.5 0 0 1 4 8a2.5 2.5 0 0 1 2.96-3.44A2.5 2.5 0 0 1 9.5 2z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44A2.5 2.5 0 0 0 20 17.5a2.5 2.5 0 0 0 .95-4.81A2.5 2.5 0 0 0 20 8a2.5 2.5 0 0 0-2.96-3.44A2.5 2.5 0 0 0 14.5 2z"/>',
  dizzy:    '<circle cx="12" cy="12" r="10"/><path d="M8 16s1.5-2 4-2 4 2 4 2"/><path d="m7.5 8 3 3M10.5 8l-3 3M13.5 8l3 3M16.5 8l-3 3"/>'
};

/* ════════════════ SECCIONES ════════════════ */
const SECTIONS = [
  {
    id:'operacional', title:'Data Operacional', sub:'Notificar evento por chat de WhatsApp', layout:'stack',
    items:[
      {id:'op_salir_casa', label:'Saliendo de casa',       desc:'Inicio de traslado al aeropuerto', icon:I.homeOut,  ic:'#fff1e6', icc:'#f47a1f', kind:'op', verb:'estoy *saliendo de casa* rumbo al aeropuerto para iniciar mi turno de vuelo'},
      {id:'op_lleg_aero',  label:'Llegando al aeropuerto',  desc:'Arribo para iniciar el turno',     icon:I.planeIn,  ic:'#fff1e6', icc:'#f47a1f', kind:'op', verb:'estoy *llegando al aeropuerto* para iniciar mi turno de vuelo'},
      {id:'op_salir_aero', label:'Saliendo de aeropuerto',  desc:'Cierre del turno operativo',       icon:I.planeOut, ic:'#fff1e6', icc:'#f47a1f', kind:'op', verb:'estoy *saliendo del aeropuerto* tras finalizar mi turno de vuelo'},
      {id:'op_lleg_casa',  label:'Llegando a casa',         desc:'Fin de la jornada',               icon:I.homeIn,   ic:'#fff1e6', icc:'#f47a1f', kind:'op', verb:'estoy *llegando a casa* tras finalizar mi turno de vuelo'}
    ]
  },
  {
    id:'descanso', title:'Medición de Descanso', sub:'Test KSS y SLL vía WhatsApp', layout:'stack',
    items:[
      {id:'desc_lleg_aero', label:'Llegando al aeropuerto', desc:'Iniciar test KSS y SLL', icon:I.moon, ic:'#e7eefb', icc:'#2d6cdf', kind:'test', verb:'estoy *llegando al aeropuerto*'},
      {id:'desc_lleg_casa', label:'Llegando a casa',        desc:'Iniciar test KSS y SLL', icon:I.bed,  ic:'#e7eefb', icc:'#2d6cdf', kind:'test', verb:'estoy *llegando a casa*'}
    ]
  },
  {
    id:'sensaciones', title:'Sensaciones Personales', sub:'Reportá tu condición actual de turno', layout:'grid',
    items:[
      {id:'sen_cansancio', label:'Cansancio', desc:'Agotamiento físico',     icon:I.battery, ic:'#fff1e6', icc:'#f47a1f', kind:'feel', feel:'Cansancio / Fatiga'},
      {id:'sen_estres',    label:'Estrés',    desc:'Sobrecarga operativa',    icon:I.bolt,    ic:'#feecec', icc:'#e0322f', kind:'feel', feel:'Estrés / Sobrecarga Operativa'},
      {id:'sen_ansiedad',  label:'Ansiedad',  desc:'Falta de foco / presión', icon:I.brain,   ic:'#f0ebfa', icc:'#7c5cc4', kind:'feel', feel:'Ansiedad / Falta de Foco'},
      {id:'sen_malestar',  label:'Malestar',  desc:'Indisposición física',    icon:I.dizzy,   ic:'#e7eefb', icc:'#2d6cdf', kind:'feel', feel:'Malestar / Indisposición Física'}
    ]
  }
];

/* ════════════════ STORAGE ════════════════ */
const K_PROFILE = 'silva_fatiga_profile_v1';
const K_REPORTS = 'silva_fatiga_reports_v1';

function getProfile(){ try { return JSON.parse(localStorage.getItem(K_PROFILE)) || null; } catch(e){ return null; } }
function setProfile(p){ localStorage.setItem(K_PROFILE, JSON.stringify(p)); }

function todayStr(){ const d=new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }

function getReports(){
  let r; try { r = JSON.parse(localStorage.getItem(K_REPORTS)) || {}; } catch(e){ r = {}; }
  const t = todayStr(); let changed = false;
  for (const id in r){ if (r[id].date !== t){ delete r[id]; changed = true; } }   // reset diario
  if (changed) localStorage.setItem(K_REPORTS, JSON.stringify(r));
  return r;
}
function saveReports(r){ localStorage.setItem(K_REPORTS, JSON.stringify(r)); }

/* ════════════════ MENSAJES ════════════════ */
function buildMessage(item){
  const p = getProfile() || {nombre:'', empresa:''};
  const base = `Hola EVA, me encuentro notificando desde el portal de fatiga Silva Salud. Soy ${p.nombre} de ${p.empresa}. `;
  if (item.kind === 'feel')
    return base + `Registro una sensación personal de *${item.feel}* durante mi turno actual de vuelo. Por favor, asísteme e inicia el test de seguridad correspondiente de inmediato.`;
  if (item.kind === 'test')
    return base + `Notifico que ${item.verb}. Por favor, asísteme e inicia el *Test de Medición de Descanso (KSS y SLL)* correspondiente de inmediato.`;
  return base + `Notifico que ${item.verb}.`;
}
function waUrl(item){
  return `https://api.whatsapp.com/send/?phone=${EVA_PHONE}&text=${encodeURIComponent(buildMessage(item))}&type=phone_number&app_absent=0`;
}

/* ════════════════ RENDER ════════════════ */
const checkSVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>';
const chevSVG  = '<svg class="chev" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>';
const undoSVG  = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 14 4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-1"/></svg>';

function renderSections(){
  const root = document.getElementById('sections');
  root.innerHTML = '';
  SECTIONS.forEach(sec => {
    const s = document.createElement('section');
    s.className = 'section';
    s.innerHTML = `<div class="sec-head"><div class="sec-title"><span class="dot"></span>${sec.title}</div><div class="sec-sub">${sec.sub}</div></div>`;
    const cont = document.createElement('div');
    cont.className = sec.layout === 'grid' ? 'grid2' : 'stack';
    sec.items.forEach(it => cont.appendChild(buildItem(it, sec.layout)));
    s.appendChild(cont);
    root.appendChild(s);
  });
  refreshStates();
}

function buildItem(it, layout){
  const wrap = document.createElement('div');
  wrap.className = 'item';
  wrap.dataset.id = it.id;

  const a = document.createElement('a');
  a.className = layout === 'grid' ? 'tile' : 'rbtn';
  a.href = waUrl(it);
  a.target = '_blank';
  a.rel = 'noopener';

  const iconHtml = `<div class="ic" style="background:${it.ic};color:${it.icc}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${it.icon}</svg></div>`;
  const badge = `<span class="badge" data-badge>${checkSVG}<span data-time></span></span>`;

  if (layout === 'grid'){
    a.innerHTML = `${iconHtml}<div class="tt">${it.label}</div><div class="ds">${it.desc}</div>${badge}`;
  } else {
    a.innerHTML = `${iconHtml}<div class="tx"><span class="tt">${it.label}</span><span class="ds">${it.desc}</span></div><div class="st">${badge}${chevSVG}</div>`;
  }

  a.addEventListener('click', () => mark(it.id));   // navega (abre WhatsApp) y marca

  const undo = document.createElement('button');
  undo.className = 'undo';
  undo.innerHTML = `${undoSVG}Marcar como no enviado`;
  undo.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); unmark(it.id); });

  wrap.appendChild(a);
  wrap.appendChild(undo);
  return wrap;
}

function mark(id){
  const r = getReports();
  const d = new Date();
  const time = String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');
  r[id] = { date: todayStr(), time, ts: d.getTime() };
  saveReports(r);
  setTimeout(refreshStates, 60);           // tras abrir WhatsApp
  showToast('Reporte registrado · ' + time);
}
function unmark(id){
  const r = getReports();
  delete r[id];
  saveReports(r);
  refreshStates();
}

function refreshStates(){
  const r = getReports();
  document.querySelectorAll('.item').forEach(el => {
    const id = el.dataset.id;
    const rep = r[id];
    if (rep){
      el.classList.add('done');
      const t = el.querySelector('[data-time]');
      if (t) t.textContent = rep.time;
    } else {
      el.classList.remove('done');
    }
  });
}

/* ════════════════ PERFIL / SETUP ════════════════ */
function paintProfile(){
  const p = getProfile();
  if (!p) return;
  document.getElementById('pcName').textContent = p.nombre;
  document.getElementById('pcEmp').textContent  = p.empresa;
  const initials = p.nombre.trim().split(/\s+/).map(w=>w[0]).slice(0,2).join('').toUpperCase();
  document.getElementById('pcAvatar').textContent = initials || '–';
}

let editing = false;
function openSetup(isEdit){
  editing = !!isEdit;
  const p = getProfile() || {nombre:'',empresa:''};
  document.getElementById('inName').value = p.nombre;
  document.getElementById('inEmp').value  = p.empresa;
  document.getElementById('setupTitle').textContent = isEdit ? 'Editar mis datos' : 'Bienvenido 👋';
  document.getElementById('setupLead').textContent = isEdit
    ? 'Actualizá tu nombre o empresa. Se aplicará a tus próximos reportes.'
    : 'Antes de empezar, completá tus datos. Quedan guardados en este dispositivo y se usan para identificarte ante EVA en cada reporte.';
  document.getElementById('cancelBtn').style.display = isEdit ? 'block' : 'none';
  document.getElementById('fName').classList.remove('invalid');
  document.getElementById('fEmp').classList.remove('invalid');
  document.getElementById('setup').classList.add('show');
}
function closeSetup(){ document.getElementById('setup').classList.remove('show'); }

function saveProfile(){
  const nombre = document.getElementById('inName').value.trim().replace(/\s+/g,' ');
  const empresa = document.getElementById('inEmp').value.trim().replace(/\s+/g,' ');
  let ok = true;
  document.getElementById('fName').classList.toggle('invalid', !nombre); if(!nombre) ok=false;
  document.getElementById('fEmp').classList.toggle('invalid', !empresa); if(!empresa) ok=false;
  if (!ok) return;
  setProfile({ nombre, empresa });
  paintProfile();
  renderSections();           // re-genera hrefs con datos nuevos
  closeSetup();
  showToast(editing ? 'Datos actualizados' : '¡Listo! Ya podés reportar');
}

/* ════════════════ TOAST ════════════════ */
let toastT;
function showToast(msg){
  const t = document.getElementById('toast');
  document.getElementById('toastMsg').textContent = msg;
  t.classList.add('show');
  clearTimeout(toastT);
  toastT = setTimeout(()=>t.classList.remove('show'), 2600);
}
function hide(id){ document.getElementById(id).classList.remove('show'); }

/* ════════════════ INSTALL (PWA) ════════════════ */
let deferredPrompt;
const installBtn = document.getElementById('installBtn');
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
const isStandalone = window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches;
const isMobile = window.innerWidth <= 820;

if (isIOS && !isStandalone && isMobile) installBtn.style.display = 'flex';
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault(); deferredPrompt = e;
  if (!isStandalone) installBtn.style.display = 'flex';
});
installBtn.addEventListener('click', async () => {
  if (isIOS) { document.getElementById('iosModal').classList.add('show'); return; }
  if (deferredPrompt){
    deferredPrompt.prompt();
    const res = await deferredPrompt.userChoice;
    if (res.outcome === 'accepted') installBtn.style.display = 'none';
    deferredPrompt = null;
  }
});
window.addEventListener('appinstalled', () => { installBtn.style.display = 'none'; deferredPrompt = null; });
document.getElementById('iosModal').addEventListener('click', (e)=>{ if(e.target.id==='iosModal') hide('iosModal'); });

/* ════════════════ INIT ════════════════ */
document.getElementById('verTag').textContent = 'Versión ' + APP_VERSION;
document.getElementById('app').style.display = 'block';

if (getProfile()){
  paintProfile();
  renderSections();
} else {
  renderSections();
  openSetup(false);
}

// Si la app estuvo abierta y cambió el día, resetea al volver al foco
document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshStates(); });

/* ════════════════ SERVICE WORKER (auto-update sin cache vieja) ════════════════ */
if ('serviceWorker' in navigator){
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').then(reg => {
      reg.update();
      setInterval(() => reg.update(), 60 * 60 * 1000);  // chequea cada hora
    }).catch(()=>{});
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return; refreshing = true; window.location.reload();
    });
  });
}
