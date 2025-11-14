
export function interpretEnsemble(distsArray, rounds=3){
  if(!Array.isArray(distsArray) || distsArray.length === 0) return {error:'no data'};
  const horizon = Math.min(rounds, distsArray.length);
  const forecast = [];
  for(let r=0;r<horizon;r++){
    const dist = distsArray[r] || {};
    const labels = ['1','2','3'];
    const probs = labels.map(l=> Number(dist[l] || 0));
    const s = probs.reduce((a,b)=>a+b,0) || 1;
    const norm = probs.map(p=>p/s);
    const entries = labels.map((l,i)=> ({label:l,prob:norm[i]}));
    entries.sort((a,b)=>b.prob-a.prob);
    const top = entries[0], runner = entries[1];
    const gap = top.prob - runner.prob;
    const entropy = -norm.reduce((acc,p)=> p>0 ? acc + p * Math.log2(p) : acc, 0);
    const maxEntropy = Math.log2(labels.length);
    const stability = 1 - (entropy / (maxEntropy || 1));
    const confidence = Math.min(0.999, Math.max(0, gap * 1.4 + stability * 0.4));
    forecast.push({
      round: r+1,
      winner: top.label,
      probability: Math.round(top.prob * 10000)/100,
      confidence: Math.round(confidence * 10000)/100,
      stability: Math.round(stability * 10000)/100,
      gap: Math.round(gap * 10000)/100
    });
  }
  const first = forecast[0];
  let signal='Weak';
  if(first.confidence >= 85 && first.stability >= 0.7) signal='ULTRA STABLE';
  else if(first.confidence >= 70 && first.stability >= 0.5) signal='Stable';
  else if(first.confidence >= 50) signal='Uncertain';
  else signal='Weak / Skip';
  return {overall:{ winner: first.winner, probability: first.probability, confidence: first.confidence, stability: first.stability, signal }, forecast };
}
