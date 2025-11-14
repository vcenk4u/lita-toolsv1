
// charts.js - create charts and update helpers (uses Chart.js)
function createCharts(){
  // Prob bar
  const ctxP = document.getElementById('probChart').getContext('2d');
  window.probChart = new Chart(ctxP, { type:'bar', data:{ labels:['K1','K2','K3'], datasets:[{data:[0,0,0], backgroundColor:['#7a5cff','#00ffc6','#ff66cc']}] }, options:{ animation:false, responsive:true, scales:{ y:{ beginAtZero:true, max:1, ticks:{ callback: v => (v*100).toFixed(0) + '%' } } }, plugins:{ legend:{ display:false } } } });

  // Forecast bar (first round)
  const ctxF = document.getElementById('forecastBar').getContext('2d');
  window.forecastBar = new Chart(ctxF, { type:'bar', data:{ labels:['K1','K2','K3'], datasets:[{data:[0,0,0], backgroundColor:['#7a5cff','#00ffc6','#ff66cc']}] }, options:{ animation:false, responsive:true, scales:{ y:{ beginAtZero:true, max:1, ticks:{ callback: v => (v*100).toFixed(0) + '%' } } }, plugins:{ legend:{ display:false } } } });

  // Trend line (multi-round)
  const ctxT = document.getElementById('trendChart').getContext('2d');
  window.trendChart = new Chart(ctxT, { type:'line', data:{ labels:[], datasets:[ {label:'K1',data:[],borderColor:'#7a5cff',fill:false},{label:'K2',data:[],borderColor:'#00ffc6',fill:false},{label:'K3',data:[],borderColor:'#ff66cc',fill:false} ] }, options:{ animation:false, responsive:true, scales:{ y:{ beginAtZero:true, max:1, ticks:{ callback: v => (v*100).toFixed(0) + '%' } } } } });

  // Confidence gauge (doughnut)
  const ctxG = document.getElementById('confGauge').getContext('2d');
  window.confGauge = new Chart(ctxG, { type:'doughnut', data:{ labels:['conf','rest'], datasets:[{data:[0,100], backgroundColor:['#00ffc6','#11141a']}] }, options:{ cutout:'75%', responsive:true, plugins:{ legend:{ display:false } } } });
}

function updateProbChart(dist){
  if(window.probChart){ window.probChart.data.datasets[0].data = [dist['1']||0, dist['2']||0, dist['3']||0]; window.probChart.update(); }
}

function updateForecastCharts(forecast){
  if(window.forecastBar && window.trendChart){
    const first = forecast[0] || {'1':0,'2':0,'3':0};
    window.forecastBar.data.datasets[0].data = [first['1']||0, first['2']||0, first['3']||0]; window.forecastBar.update();
    const labels = forecast.map((_,i)=> '+' + (i+1));
    window.trendChart.data.labels = labels;
    window.trendChart.data.datasets[0].data = forecast.map(f=> f['1']||0);
    window.trendChart.data.datasets[1].data = forecast.map(f=> f['2']||0);
    window.trendChart.data.datasets[2].data = forecast.map(f=> f['3']||0);
    window.trendChart.update();
  }
}

function updateTrendChart(history){
  if(window.trendChart){
    const N = Math.min(30, history.length);
    const last = history.slice(-N);
    const labels = Array.from({length:N}, (_,i)=> i< N-1 ? '' + (i-N+N) : 'Now');
    const k1 = last.map(v=> v==='1'?1:0);
    const k2 = last.map(v=> v==='2'?1:0);
    const k3 = last.map(v=> v==='3'?1:0);
    function ravg(arr,w){ const out=[]; for(let i=0;i<arr.length;i++){ const s = arr.slice(Math.max(0,i-w+1), i+1); out.push(s.reduce((a,b)=>a+b,0)/s.length); } return out; }
    window.trendChart.data.datasets[0].data = ravg(k1,5);
    window.trendChart.data.datasets[1].data = ravg(k2,5);
    window.trendChart.data.datasets[2].data = ravg(k3,5);
    window.trendChart.update();
  }
}

function updateGauge(valPercent){
  if(window.confGauge){ const v = Math.max(0, Math.min(100, valPercent)); window.confGauge.data.datasets[0].data = [v, 100-v]; window.confGauge.update(); }
}

// expose createCharts globally
window.createCharts = createCharts;
window.updateProbChart = updateProbChart;
window.updateForecastCharts = updateForecastCharts;
window.updateTrendChart = updateTrendChart;
window.updateGauge = updateGauge;
