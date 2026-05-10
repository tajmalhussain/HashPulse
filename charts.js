/* ═══════════════════════════════════════ CHARTS ═══ */
function renderCharts(preds, srcDist){
  const pos=preds.filter(p=>p.sentiment==='positive').length;
  const neg=preds.filter(p=>p.sentiment==='negative').length;
  const neu=preds.filter(p=>p.sentiment==='neutral').length;

  if(charts.dist) charts.dist.destroy();
  charts.dist=new Chart(document.getElementById('distChart'),{
    type:'doughnut',
    data:{labels:['Positive','Neutral','Negative'],datasets:[{data:[pos,neu,neg],backgroundColor:['#00d68f','#8892a4','#ff4757'],borderWidth:0,hoverOffset:4}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{color:'#8892a4',font:{size:11},padding:12}}}}
  });

  const srcNmMap={
    reddit:'🟠 Reddit', reddit_comment:'🟠 Reddit',
    x_tweet:'𝕏 Twitter/X', twitter:'𝕏 Twitter/X', simulated_tweet:'🐦 Sim Tweets',
    youtube_title:'🔴 YouTube', youtube_comment:'🔴 YouTube',
    news:'📰 News'
  };
  const skeys=Object.keys(srcDist).filter(k=>srcDist[k].total>0);
  if(charts.src) charts.src.destroy();
  charts.src=new Chart(document.getElementById('srcChart'),{
    type:'line',
    data:{
      labels:skeys.map(k=>srcNmMap[k]||k),
      datasets:[
        {label:'Positive',data:skeys.map(k=>srcDist[k].pos),borderColor:'#00d68f',backgroundColor:'rgba(0,214,143,.14)',pointBackgroundColor:'#00d68f',pointBorderColor:'#0e1420',pointBorderWidth:2,pointRadius:5,pointHoverRadius:7,borderWidth:3,tension:.35,fill:false},
        {label:'Negative',data:skeys.map(k=>srcDist[k].neg),borderColor:'#ff4757',backgroundColor:'rgba(255,71,87,.14)',pointBackgroundColor:'#ff4757',pointBorderColor:'#0e1420',pointBorderWidth:2,pointRadius:5,pointHoverRadius:7,borderWidth:3,tension:.35,fill:false},
        {label:'Neutral', data:skeys.map(k=>srcDist[k].neu),borderColor:'#8892a4',backgroundColor:'rgba(136,146,164,.14)',pointBackgroundColor:'#8892a4',pointBorderColor:'#0e1420',pointBorderWidth:2,pointRadius:5,pointHoverRadius:7,borderWidth:3,tension:.35,fill:false},
      ]
    },
    options:{
      responsive:true, maintainAspectRatio:false,
      interaction:{mode:'index',intersect:false},
      plugins:{
        legend:{position:'bottom',labels:{color:'#8892a4',font:{size:10},padding:10}},
        tooltip:{callbacks:{label:c=>`${c.dataset.label}: ${c.raw} comments`}}
      },
      scales:{
        x:{grid:{display:false},ticks:{color:'#5a6a82',font:{size:10}}},
        y:{beginAtZero:true,grid:{color:'rgba(255,255,255,.04)'},ticks:{color:'#5a6a82',font:{size:10},stepSize:1}}
      }
    }
  });

  if(charts.eng) charts.eng.destroy();
  charts.eng=new Chart(document.getElementById('engChart'),{
    type:'bubble',
    data:{datasets:[
      {label:'Positive',data:preds.filter(p=>p.sentiment==='positive').map(p=>({x:p.compound,y:(p.likes||0)+(p.rt||0)*2,r:Math.max(4,Math.min(18,Math.log(((p.likes||0)+(p.rt||0)||1)+1)*2.8))})),backgroundColor:'rgba(0,214,143,.4)',borderColor:'#00d68f',borderWidth:1},
      {label:'Negative',data:preds.filter(p=>p.sentiment==='negative').map(p=>({x:p.compound,y:(p.likes||0)+(p.rt||0)*2,r:Math.max(4,Math.min(18,Math.log(((p.likes||0)+(p.rt||0)||1)+1)*2.8))})),backgroundColor:'rgba(255,71,87,.4)',borderColor:'#ff4757',borderWidth:1},
      {label:'Neutral', data:preds.filter(p=>p.sentiment==='neutral').map(p=>({x:p.compound,y:(p.likes||0)+(p.rt||0)*2,r:Math.max(4,Math.min(18,Math.log(((p.likes||0)+(p.rt||0)||1)+1)*2.8))})),backgroundColor:'rgba(136,146,164,.35)',borderColor:'#8892a4',borderWidth:1},
    ]},
    options:{responsive:true,maintainAspectRatio:false,
      plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>`Score: ${c.raw.x.toFixed(2)} | Engagement: ${Math.round(c.raw.y)}`}}},
      scales:{
        x:{min:-1.1,max:1.1,title:{display:true,text:'Sentiment Score',color:'#5a6a82',font:{size:10}},grid:{color:'rgba(255,255,255,.04)'},ticks:{color:'#5a6a82',font:{size:10}}},
        y:{title:{display:true,text:'Engagement',color:'#5a6a82',font:{size:10}},grid:{color:'rgba(255,255,255,.04)'},ticks:{color:'#5a6a82',font:{size:10}}}
      }}
  });
}
