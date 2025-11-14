
// worker_meta.js - GOD4 Meta-Chaos core (module worker-like, no imports)
let stopRequested = false;

function buildFirst(history){
  const trans = {};
  for(let i=0;i<history.length-1;i++){
    const a=history[i], b=history[i+1];
    trans[a] = trans[a] || {}; trans[a][b] = (trans[a][b]||0) + 1;
  }
  const out={}; Object.keys(trans).forEach(k=>{ const row=trans[k]; const s=Object.values(row).reduce((a,b)=>a+b,0)||1; out[k]={}; Object.keys(row).forEach(j=> out[k][j]=row[j]/s); });
  return out;
}

function freq(history){ const f={}; history.forEach(h=> f[h] = (f[h]||0)+1); const tot = history.length||1; Object.keys(f).forEach(k=> f[k]=f[k]/tot); return f; }

function sample(dist){
  const keys = Object.keys(dist);
  const s = keys.reduce((a,b)=> a + (dist[b]||0), 0) || 1;
  let r = Math.random() * s;
  for(let i=0;i<keys.length;i++){ const k=keys[i]; r -= (dist[k]||0); if(r<=0) return k; }
  return keys[keys.length-1];
}

function runSimOnce(history, rounds, models){
  const last = history[history.length-1];
  const dists = Array.from({length: rounds}, ()=> ({}));
  for(let r=0;r<200;r++){ // small internal runs to build distribution per sim
    let cur = last;
    for(let i=0;i<rounds;i++){
      const transRow = (models.first && models.first[cur]) ? models.first[cur] : models.freq;
      const pick = sample(transRow);
      dists[i][pick] = (dists[i][pick]||0) + 1;
      cur = pick;
    }
  }
  return dists.map(obj=>{ const s = Object.values(obj).reduce((a,b)=>a+b,0)||1; const out={}; Object.keys(obj).forEach(k=> out[k]= obj[k]/s); return out; });
}

onmessage = function(ev){
  const msg = ev.data;
  if(msg.type === 'stop'){ stopRequested = true; return; }
  if(msg.type === 'start'){
    stopRequested = false;
    const history = msg.history || [];
    const opts = msg.opts || {};
    const ensembles = opts.ensembles || 8;
    const simCount = opts.simCount || 1200;
    const rounds = opts.horizon || 6;

    const models = { first: buildFirst(history), freq: freq(history) };
    const totalCounts = Array.from({length: rounds}, ()=> ({}));
    let runsDone = 0;
    for(let e=0; e<ensembles && !stopRequested; e++){
      // each ensemble: run multiple internal sims (simCount/ensembles approx)
      const per = Math.max(100, Math.floor(simCount / Math.max(1, ensembles)));
      for(let i=0;i<per && !stopRequested;i++){
        const sim = runSimOnce(history, rounds, models);
        // merge
        for(let j=0;j<sim.length;j++){
          const obj = sim[j];
          Object.keys(obj).forEach(k=> totalCounts[j][k] = (totalCounts[j][k]||0) + Math.round(obj[k]*100));
        }
        runsDone++;
        if(runsDone % 50 === 0){
          // send intermediate normalized dists
          const dists = totalCounts.map(obj=>{ const s = Object.values(obj).reduce((a,b)=>a+b,0)||1; const out={}; Object.keys(obj).forEach(k=> out[k]= obj[k]/s); return out; });
          postMessage({ type:'update', dists: dists, runsDone: runsDone });
        }
      }
      // small adaptive step: if one label dominates, slightly perturb freq to avoid overconfidence (chaos dampener)
      const firstDist = totalCounts[0];
      const maxLabel = Object.keys(firstDist).reduce((a,b)=> firstDist[a] > firstDist[b] ? a : b);
      if(firstDist[maxLabel] > (Object.values(firstDist).reduce((a,b)=>a+b,0) * 0.8)){
        // inject small noise
        Object.keys(totalCounts).forEach(idx=>{ Object.keys(totalCounts[idx]).forEach(k=> totalCounts[idx][k] = Math.max(1, totalCounts[idx][k] - Math.round(totalCounts[idx][k]*0.05)); });
      }
    }
    // final normalize and post
    const final = totalCounts.map(obj=>{ const s = Object.values(obj).reduce((a,b)=>a+b,0)||1; const out={}; Object.keys(obj).forEach(k=> out[k]= obj[k]/s); return out; });
    postMessage({ type:'update', dists: final, runsDone: simCount });
    postMessage({ type:'finished', dists: final, runsDone: simCount });
  }
};
