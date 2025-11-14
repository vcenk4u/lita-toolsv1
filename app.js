
import { interpretEnsemble } from './arp.js';

const el = id => document.getElementById(id);
const btnLoad = el('btnLoad'), btnStart = el('btnStart'), btnStop = el('btnStop');
const historyEl = el('history'), summaryEl = el('summary'), detailsEl = el('details');
const ensemblesEl = el('ensembles'), simCountEl = el('simCount') || null, horizonEl = el('horizon');

let worker;
let lastDists;

function initUI(){
  // create charts (charts.js attaches to window)
  try{ if(window.createCharts) window.createCharts(); }catch(e){ console.warn('createCharts failed', e); }
}

function parseHistory(txt){
  return txt.split(/[,
]+/).map(s=>s.trim()).filter(Boolean);
}

btnLoad.addEventListener('click', ()=>{
  const hist = parseHistory(historyEl.value);
  if(!hist.length) return alert('Paste history first');
  localStorage.setItem('vcenk_history_full', JSON.stringify(hist));
  detailsEl.textContent = 'History loaded (' + hist.length + ' entries)';
});

btnStart.addEventListener('click', ()=>{
  const hist = JSON.parse(localStorage.getItem('vcenk_history_full')||'[]');
  const fromInput = parseHistory(historyEl.value);
  const history = fromInput.length ? fromInput : hist;
  if(!history.length) return alert('Load history (>=20) first');
  const ensembles = parseInt(document.getElementById('ensembles').value) || 8;
  const simCount = parseInt(document.getElementById('simCount')?.value || 1200) || 1200;
  const horizon = parseInt(document.getElementById('horizon').value) || 6;
  startWorker(history, {ensembles, simCount, horizon});
});

btnStop.addEventListener('click', ()=>{
  if(worker){ worker.postMessage({type:'stop'}); worker.terminate(); worker = null; detailsEl.textContent = 'Stopped'; }
});

function startWorker(history, opts){
  if(worker) worker.terminate();
  try{
    worker = new Worker('worker_meta.js', { type: 'module' });
  }catch(e){
    detailsEl.textContent = 'Worker not supported in this environment.';
    return;
  }
  worker.onmessage = ev => {
    const d = ev.data;
    if(d.type === 'update'){
      lastDists = d.dists;
      renderResult(d.dists, d.runsDone);
    } else if(d.type === 'finished'){
      detailsEl.textContent = 'Finished — runs ' + d.runsDone;
    } else if(d.type === 'status'){
      detailsEl.textContent = d.msg;
    }
  };
  detailsEl.textContent = 'Starting...';
  worker.postMessage({ type:'start', history, opts });
}

function renderResult(dists, runs){
  // update global
  window.lastDists = dists;
  // update charts if functions present
  try{
    if(window.updateProbChart && dists[0]) window.updateProbChart(dists[0]);
    if(window.updateForecastCharts) window.updateForecastCharts(dists);
    if(window.updateTrendChart) window.updateTrendChart(JSON.parse(localStorage.getItem('vcenk_history_full')||'[]'));
    if(window.updateGauge) window.updateGauge((dists[0] && (Object.values(dists[0]).reduce((a,b)=>Math.max(a,b),0)||0))*100);
  }catch(e){ console.warn('chart update error', e); }
  // ARP interpretation
  const arp = interpretEnsemble(dists, dists.length);
  const o = arp.overall;
  summaryEl.innerHTML = `<div>Winner: <strong style="color:#7a5cff">Kelinci ${o.winner}</strong> — Prob: ${o.probability}%</div><div>Confidence: ${o.confidence}% • Stability: ${o.stability}% • Signal: ${o.signal}</div>`;
  detailsEl.textContent = 'Runs: ' + (runs || 'n/a');
}

// init ui & charts after load
initUI();
