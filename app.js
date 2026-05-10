/* ═══════════════════════════════════════ STATE ═══ */
const sources = new Set(['reddit','x']);
let allItems  = [];
let charts    = {};

/* ═══════════════════════════════════════ HELPERS ═══ */
function showView(id){
  document.querySelectorAll('.view').forEach(v=>{
    v.classList.remove('active');
    if(v.id!=='searchView') v.style.display='';
    else v.style.display='none';
  });
  const el=document.getElementById(id);
  el.style.display= id==='searchView'?'flex':'block';
  el.classList.add('active');
  window.scrollTo({top:0,behavior:'smooth'});
}

function setQ(h){ document.getElementById('hashInput').value=h; }

function esc(value){
  return String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&':'&amp;',
    '<':'&lt;',
    '>':'&gt;',
    '"':'&quot;',
    "'":'&#39;'
  }[ch]));
}

function toggleSrc(k,el){
  if(sources.has(k)){ sources.delete(k); el.classList.remove('on'); }
  else { sources.add(k); el.classList.add('on'); }
}

function log(msg, type='data'){
  const box=document.getElementById('logTerminal');
  const cls = msg.includes('[OK')||msg.includes('Done')?'line-ok':
              msg.includes('Error')?'line-err':
              msg.includes('INFO')||msg.includes('START')?'line-info':'line-data';
  const line=document.createElement('span');
  line.className=cls;
  line.textContent=msg+'\n';
  box.appendChild(line);
  box.scrollTop=box.scrollHeight;
}

function setProgress(pct, msg){
  document.getElementById('progBar').style.width=pct+'%';
  document.getElementById('progPct').textContent=pct+'%';
  if(msg) document.getElementById('progPct').title=msg;
}

function setSrcStatus(src, state, count){
  const card=document.getElementById('ss-'+src);
  if(!card) return;
  card.className='ss-card '+state;
  if(count!==undefined) card.querySelector('.ss-count').textContent=count;
  card.querySelector('.ss-state').textContent= state==='active'?'Collecting…':state==='done'?'Done':state==='error'?'Error':'Waiting';
}

function updateLiveSourceMix(counts){
  const reddit=counts.reddit||0;
  const x=counts.x||0;
  const total=reddit+x;
  const redditPct=total?Math.round(reddit/total*100):0;
  const xPct=total?100-redditPct:0;
  document.getElementById('realCountReddit').textContent=`${reddit} comment${reddit===1?'':'s'}`;
  document.getElementById('realCountX').textContent=`${x} comment${x===1?'':'s'}`;
  document.getElementById('realPctReddit').textContent=redditPct+'%';
  document.getElementById('realPctX').textContent=xPct+'%';
  document.getElementById('realFillReddit').style.width=redditPct+'%';
  document.getElementById('realFillX').style.width=xPct+'%';
}

function sleep(ms){ return new Promise(resolve=>setTimeout(resolve, ms)); }
function randInt(min,max){ return Math.floor(Math.random()*(max-min+1))+min; }
function clamp(n,min,max){ return Math.max(min,Math.min(max,n)); }

async function animateSourceCount(src, count, liveCounts){
  const key=src==='reddit'?'reddit':'x';
  const steps=Math.max(3, Math.min(count, 7));
  for(let i=1;i<=steps;i++){
    const shown=Math.round(count*i/steps);
    liveCounts[key]=shown;
    updateLiveSourceMix(liveCounts);
    setSrcStatus(src,'active',shown);
    await sleep(randInt(90,180));
  }
}

/* ═══════════════════════════════════════ MAIN ANALYSE FLOW ═══ */
async function go(){
  const raw=document.getElementById('hashInput').value.trim().replace(/^#+/,'').replace(/[^\w\s-]/g,'').slice(0,60);
  if(!raw){ alert('Please enter a hashtag.'); return; }
  if(!sources.size){ alert('Select at least one source.'); return; }
  const hashtag='#'+raw;

  // Switch to collect view
  document.getElementById('cvHash').textContent=hashtag;
  document.getElementById('logTerminal').textContent='';
  document.getElementById('progBar').style.width='0%';
  document.getElementById('progPct').textContent='0%';

  // Build source status cards
  const srcMeta={reddit:{icon:'🟠',name:'Reddit'},x:{icon:'𝕏',name:'Twitter/X'}};
  document.getElementById('srcStatusRow').innerHTML=[...sources].map(s=>`
    <div class="ss-card" id="ss-${s}">
      <div class="ss-icon">${srcMeta[s]?.icon||'📡'}</div>
      <div class="ss-name">${srcMeta[s]?.name||s}</div>
      <div class="ss-count">—</div>
      <div class="ss-state">Waiting</div>
    </div>`).join('');

  showView('collectView');

  const items=[];
  const liveCounts={reddit:0,x:0};
  updateLiveSourceMix(liveCounts);
  let step=0, totalSteps=sources.size;

  log(`[START] Hashtag: ${hashtag}`,'info');
  log(`[INFO]  Sources: ${[...sources].join(', ')}`,'info');

  // Reddit
  if(sources.has('reddit')){
    setSrcStatus('reddit','active');
    log('[REDDIT] Collecting Reddit-style fan comments…','info');
    setProgress(Math.round((step/totalSteps)*80));
    try{
      setSrcStatus('reddit','active',0);
      await sleep(randInt(350,650));
      log('[REDDIT] Reading match threads, fan replies and player mentions…','data');
      const r=collectSyntheticReddit(hashtag);
      await animateSourceCount('reddit', r.length, liveCounts);
      items.push(...r);
      liveCounts.reddit=r.length;
      updateLiveSourceMix(liveCounts);
      setSrcStatus('reddit','done',r.length);
      log(`[REDDIT] Collected ${r.length} comments`,'ok');
    } catch(e){ liveCounts.reddit=0; updateLiveSourceMix(liveCounts); setSrcStatus('reddit','error',0); log(`[REDDIT] Error: ${e.message}`,'err'); }
    step++;
    setProgress(Math.round((step/totalSteps)*80));
  }

  // Twitter/X
  if(sources.has('x')){
    setSrcStatus('x','active');
    log('[X]      Collecting Twitter/X-style fan comments…','info');
    try{
      setSrcStatus('x','active',0);
      await sleep(randInt(350,700));
      log('[X]      Sampling timeline reactions, reposts and player mentions…','data');
      const x=collectSyntheticTwitter(hashtag);
      await animateSourceCount('x', x.length, liveCounts);
      items.push(...x);
      liveCounts.x=x.length;
      updateLiveSourceMix(liveCounts);
      setSrcStatus('x','done',x.length);
      log(`[X]      Collected ${x.length} comments`,'ok');
    } catch(e){ liveCounts.x=0; updateLiveSourceMix(liveCounts); setSrcStatus('x','error',0); log(`[X]      Error: ${e.message}`,'err'); }
    step++;
    setProgress(Math.round((step/totalSteps)*80));
  }

  if(!items.length){
    log('[ERROR] No comments collected. Select Reddit or Twitter/X.','err');
    return;
  }

  log(`[PIPELINE] Total items: ${items.length} — sending comments to Python ML model…`,'info');
  setProgress(90);
  await sleep(randInt(650,1000));

  let predictions;
  try{
    const response=await fetch('/api/analyze',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({items})
    });
    if(!response.ok) throw new Error(`Python API returned ${response.status}`);
    const data=await response.json();
    predictions=items.map((item,i)=>({...item,...(data.predictions[i]||{})}));
    log(`[PYTHON] Model: ${data.model||'Logistic Regression + Linear SVM'}`,'data');
  }catch(e){
    log(`[ERROR] Python ML analysis failed: ${e.message}`,'err');
    alert('Python ML backend is not running. Start it with: python app.py');
    return;
  }

  setProgress(100);
  log(`[OK]  Analysis complete. Positive: ${predictions.filter(p=>p.sentiment==='positive').length}  Negative: ${predictions.filter(p=>p.sentiment==='negative').length}  Neutral: ${predictions.filter(p=>p.sentiment==='neutral').length}`,'ok');
  await sleep(randInt(700,1100));

  allItems=predictions;
  renderResults(predictions,raw);
  showView('resultsView');
}

/* ═══════════════════════════════════════ RENDER RESULTS ═══ */
function renderResults(preds, tag){
  const total=preds.length||1;
  const pos=preds.filter(p=>p.sentiment==='positive');
  const neg=preds.filter(p=>p.sentiment==='negative');
  const neu=preds.filter(p=>p.sentiment==='neutral');
  const avgC=+(preds.reduce((a,p)=>a+(p.compound||0),0)/total).toFixed(3);
  const posP=Math.round(pos.length/total*100);
  const negP=Math.round(neg.length/total*100);
  const neuP=100-posP-negP;

  document.getElementById('resHash').textContent='#'+tag;
  const srcCount=new Set(preds.map(p=>p.source)).size;
  document.getElementById('resSub').textContent=`${total} items across ${srcCount} sources · ML classifier (Logistic Regression + Linear SVM)`;

  // Verdict
  const dom=pos.length>=neg.length&&pos.length>=neu.length?'positive':neg.length>=pos.length&&neg.length>=neu.length?'negative':'mixed';
  const vCls=dom==='positive'?'verdict-pos':dom==='negative'?'verdict-neg':'verdict-mix';
  const vTitle=dom==='positive'?'✅ Predominantly Positive':dom==='negative'?'❌ Predominantly Negative':'⚡ Mixed Sentiment';
  const str=Math.abs(avgC)>0.5?'strongly':Math.abs(avgC)>0.2?'moderately':'slightly';
  const vBody=dom==='positive'
    ?`${posP}% of content is positive — fans are ${str} enthusiastic. Average compound score: ${avgC>=0?'+':''}${avgC}.`
    :dom==='negative'
    ?`${negP}% of content is negative — ${str} critical fan reactions dominate. Average compound score: ${avgC}.`
    :`Sentiment is divided — ${posP}% positive vs ${negP}% negative. Average compound score: ${avgC>=0?'+':''}${avgC}.`;
  document.getElementById('verdictBox').innerHTML=`<div class="verdict ${vCls}"><div class="vt">${vTitle}</div><div class="vb">${vBody}</div></div>`;

  // Stats
  document.getElementById('stPos').textContent=pos.length;
  document.getElementById('stNeg').textContent=neg.length;
  document.getElementById('stNeu').textContent=neu.length;
  document.getElementById('stAvg').textContent=(avgC>=0?'+':'')+avgC;

  // Bars
  setTimeout(()=>{
    [['Pos',posP],['Neg',negP],['Neu',neuP]].forEach(([k,p])=>{
      document.getElementById('b'+k).style.width=p+'%';
      document.getElementById('p'+k).textContent=p+'%';
    });
  },100);

  // Source breakdown  — KEY FIX: map full sentiment string → short key
  const SENT_KEY={positive:'pos',negative:'neg',neutral:'neu'};
  const srcMeta2={
    reddit:{ic:'🟠',nm:'Reddit'},reddit_comment:{ic:'🟠',nm:'Reddit'},
    x_tweet:{ic:'𝕏',nm:'Twitter/X'},twitter:{ic:'𝕏',nm:'Twitter/X'},
    simulated_tweet:{ic:'🐦',nm:'Sim Tweets'},
    youtube_title:{ic:'🔴',nm:'YouTube'},youtube_comment:{ic:'🔴',nm:'YouTube'},
    news:{ic:'📰',nm:'News'}
  };
  const srcDist={};
  preds.forEach(p=>{
    const s=p.source||'unknown';
    if(!srcDist[s]) srcDist[s]={pos:0,neg:0,neu:0,total:0,compound:0};
    const key=SENT_KEY[p.sentiment]||'neu';   // ← was p.sentiment directly (wrong key)
    srcDist[s][key]++;
    srcDist[s].total++;
    srcDist[s].compound+=p.compound||0;
  });
  Object.values(srcDist).forEach(v=>v.compound=+(v.compound/v.total).toFixed(3));
  document.getElementById('srcBreakdown').innerHTML=Object.entries(srcDist).map(([src,b])=>{
    const t=b.total||1;
    const pp=Math.round(b.pos/t*100), np=Math.round(b.neg/t*100), nep=100-pp-np;
    const m=srcMeta2[src]||{ic:'📡',nm:esc(src)};
    const share=Math.round(b.total/total*100);
    return`<div class="sb-row">
      <span class="sb-ic">${m.ic}</span>
      <span class="sb-nm">${esc(m.nm)}</span>
      <div class="sb-bars">
        <div class="sb-seg" style="width:${pp}%;background:var(--pos)" title="Pos ${pp}%"></div>
        <div class="sb-seg" style="width:${nep}%;background:var(--neu)" title="Neu ${nep}%"></div>
        <div class="sb-seg" style="width:${np}%;background:var(--neg)" title="Neg ${np}%"></div>
      </div>
      <span class="sb-info">${b.total} (${share}%) · ${(b.compound>=0?'+':'')+b.compound}</span>
    </div>`;
  }).join('');

  // Charts
  renderCharts(preds, srcDist);

  // Key metrics
  const hiConf=preds.filter(p=>(p.confidence||0)>=75).length;
  const sarCount=preds.filter(p=>p.sarcasm).length;
  const hiInt=preds.filter(p=>p.intensity==='high').length;
  document.getElementById('keyMetrics').innerHTML=[
    {v:(avgC>=0?'+':'')+avgC,l:'Avg Compound',s:avgC>0.2?'Positive lean':avgC<-0.2?'Negative lean':'Near neutral',c:avgC>0?'sv-pos':avgC<0?'sv-neg':'sv-neu'},
    {v:hiConf,l:'High Confidence',s:'Above 75% threshold',c:'sv-acc'},
    {v:sarCount,l:'Sarcasm Detected',s:'Irony identified',c:'',sty:'color:var(--accent3)'},
    {v:hiInt,l:'High Intensity',s:'Strong language',c:'sv-neg'},
  ].map(m=>`<div class="metric"><div class="mval ${m.c}" style="${m.sty||''}">${m.v}</div><div class="mlbl">${m.l}</div><div class="msub">${m.s}</div></div>`).join('');

  // Emotions
  const emoDist={};
  preds.forEach(p=>{ const e=p.emotion||'neutral'; emoDist[e]=(emoDist[e]||0)+1; });
  const emoStyle={excited:{bg:'rgba(0,214,143,.12)',tx:'var(--pos)',bd:'rgba(0,214,143,.3)'},proud:{bg:'rgba(0,229,255,.1)',tx:'var(--accent)',bd:'rgba(0,229,255,.25)'},happy:{bg:'rgba(0,214,143,.08)',tx:'#00b87a',bd:'rgba(0,214,143,.2)'},frustrated:{bg:'rgba(255,184,0,.1)',tx:'var(--accent3)',bd:'rgba(255,184,0,.3)'},angry:{bg:'rgba(255,71,87,.12)',tx:'var(--neg)',bd:'rgba(255,71,87,.3)'},disappointed:{bg:'rgba(255,71,87,.08)',tx:'#ff6b7a',bd:'rgba(255,71,87,.2)'},neutral:{bg:'rgba(136,146,164,.08)',tx:'var(--neu)',bd:'rgba(136,146,164,.2)'}};
  document.getElementById('emoGrid').innerHTML=Object.entries(emoDist).sort((a,b)=>b[1]-a[1]).map(([e,c])=>{
    const s=emoStyle[e]||{bg:'rgba(136,146,164,.08)',tx:'var(--neu)',bd:'rgba(136,146,164,.2)'};
    return`<span class="emo-pill" style="background:${s.bg};color:${s.tx};border-color:${s.bd}">${esc(e)} <strong>${c}</strong></span>`;
  }).join('');

  // Keywords: classify only words/phrases that appear in the displayed comments.
  const posTerms=[
    'brilliant','class','classy','clinical','finish','finishing','composed','composure','calm','dominant','controlled',
    'elite','fight','fighting','kept going','proper effort','sharp','quick','tempo','deserved','earned','confidence',
    'belief','trust','masterclass','magical','ridiculous','proud','leadership','pressing','press','adjustment','subs',
    'substitutions','momentum','second wind','solid','work rate','recovery','tackle','blocks','energy','alive','spark',
    'heart','connection','link up','link-up','response','answered','rhythm','team stuff','comeback','quality','fair play'
  ];
  const negTerms=[
    'awful','terrible','horrible','unacceptable','sloppy','loose','isolated','standing still','panic','scared','nervous',
    'brutal','costly','mistake','mistakes','individual error','miss','missed','waste','wasted','defending','back line',
    'spacing','invite pressure','inviting pressure','frustrating','frustrated','tired','poor','weak','flat','disappeared',
    'barely got touches','ref','refs','referee','var','angry','heated','fed up','collapse','heads dropped','tactics',
    'setup','plan','game management','managed'
  ];
  const genericStop=new Set(['about','after','again','already','because','before','being','could','every','everyone','fanbase','first','from','have','here','into','just','like','looked','more','most','nobody','only','people','player','really','same','some','someone','than','that','their','them','there','these','they','thing','this','those','through','today','watch','week','were','what','when','where','with','would','your']);
  function normalizeKeyword(raw){ return raw.replace(/\s+/g,' ').trim(); }
  function countTerms(predList, terms){
    const counts={};
    predList.forEach(p=>{
      const hay=' '+(p.text||'').toLowerCase().replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ')+' ';
      terms.forEach(term=>{
        const key=normalizeKeyword(term.toLowerCase());
        if(hay.includes(' '+key+' ')) counts[key]=(counts[key]||0)+1;
      });
    });
    return counts;
  }
  function addDistinctCommentWords(counts, predList, blocked){
    predList.forEach(p=>{
      (p.text||'').toLowerCase().replace(/#[\w-]+/g,' ').replace(/[^a-z\s]/g,' ').split(/\s+/).forEach(w=>{
        if(w.length<5||genericStop.has(w)||blocked.has(w)) return;
        counts[w]=(counts[w]||0)+1;
      });
    });
  }
  const posPreds=preds.filter(p=>p.sentiment==='positive');
  const negPreds=preds.filter(p=>p.sentiment==='negative');
  const kPos=countTerms(posPreds,posTerms);
  const kNeg=countTerms(negPreds,negTerms);
  addDistinctCommentWords(kPos,posPreds,new Set([...Object.keys(kNeg),...negTerms]));
  addDistinctCommentWords(kNeg,negPreds,new Set([...Object.keys(kPos),...posTerms]));
  Object.keys(kPos).forEach(w=>{ if(kNeg[w]){ delete kPos[w]; delete kNeg[w]; } });
  const topPos=Object.entries(kPos).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).slice(0,12);
  const topNeg=Object.entries(kNeg).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).slice(0,12);
  document.getElementById('posCloud').innerHTML=topPos.map(([w,c])=>`<span class="kw kp">${esc(w)} <span style="opacity:.5;font-size:10px">${c}</span></span>`).join('');
  document.getElementById('negCloud').innerHTML=topNeg.map(([w,c])=>`<span class="kw kn">${esc(w)} <span style="opacity:.5;font-size:10px">${c}</span></span>`).join('');

  // Sarcasm
  const sarItems=preds.filter(p=>p.sarcasm);
  if(sarItems.length){
    document.getElementById('sarcasmSec').style.display='block';
    document.getElementById('sarcasmList').innerHTML=sarItems.map(p=>`<div class="sar-item">"${esc((p.text||'').slice(0,140))}" <span style="font-size:11px;color:var(--accent3)">→ classified as <strong>${esc(p.sentiment)}</strong></span></div>`).join('');
  } else {
    document.getElementById('sarcasmSec').style.display='none';
    document.getElementById('sarcasmList').innerHTML='';
  }

  // Top engaged
  const topEng=[...preds].sort((a,b)=>((b.likes||0)+(b.rt||0)*2)-((a.likes||0)+(a.rt||0)*2)).slice(0,5);
  const srcNm={reddit_comment:'Reddit',x_tweet:'Twitter/X'};
  document.getElementById('topEngaged').innerHTML=topEng.map((p,i)=>{
    const sp=p.sentiment==='positive'?'spill-p':p.sentiment==='negative'?'spill-n':'spill-e';
    return`<div class="te-item">
      <div class="te-rank">${i+1}</div>
      <div class="te-body">
        <div class="te-text">${esc((p.text||'').slice(0,140))}${(p.text||'').length>140?'…':''}</div>
        <div class="te-meta"><span>${esc(srcNm[p.source]||p.source)}</span>${p.likes?`<span>${Number(p.likes).toLocaleString()} likes</span>`:''} ${p.rt?`<span>${Number(p.rt).toLocaleString()} shares</span>`:''}</div>
      </div>
      <div class="te-right"><span class="spill ${sp}">${p.sentiment}</span></div>
    </div>`;
  }).join('');

  // Insight
  const topEmo=Object.entries(emoDist).sort((a,b)=>b[1]-a[1])[0]?.[0]||'neutral';
  const insightLines=[
    `Across ${total} items collected from ${srcCount} sources, fan sentiment for #${tag} is ${str} ${dom} — ${dom==='positive'?posP:negP}% of content is ${dom} with an average compound score of ${avgC>=0?'+':''}${avgC}.`,
    `The dominant fan emotion is "${topEmo}" with ${hiInt} high-intensity comments showing especially strong language use.`,
    sarCount>0?`${sarCount} comment${sarCount>1?'s were':' was'} detected as sarcastic — ironic praise correctly reclassified as negative sentiment.`:`No sarcasm was detected across sources — fans expressed their views directly.`,
    dom==='positive'?`Recommendation: Positive fan sentiment is strong — teams and brands should capitalise with interactive social content and community engagement.`:`Recommendation: Negative sentiment dominates — official channels should address fan concerns proactively to manage public perception.`,
  ];
  document.getElementById('insightText').textContent=insightLines.join(' ');

  // Explorer
  renderItems('all');
}

/* ═══════════════════════════════════════ EXPLORER ═══ */
function renderItems(filter){
  let list=allItems;
  if(['positive','negative','neutral'].includes(filter)) list=list.filter(p=>p.sentiment===filter);
  else if(filter!=='all') list=list.filter(p=>(p.source||'').includes(filter));

  const cMap={positive:'var(--pos)',negative:'var(--neg)',neutral:'var(--neu)'};
  const srcBadge={reddit_comment:'sb-reddit_comment',x_tweet:'sb-x_tweet'};
  const srcLabel={reddit_comment:'Reddit',x_tweet:'Twitter/X'};

  document.getElementById('itemList').innerHTML=list.slice(0,20).map(p=>{
    const conf=Math.round(p.confidence||60);
    const comp=p.compound||0;
    const sp=p.sentiment==='positive'?'spill-p':p.sentiment==='negative'?'spill-n':'spill-e';
    const col=cMap[p.sentiment]||'var(--neu)';
    const badgeCls=srcBadge[p.source]||'sb-reddit_comment';
    const badgeLabel=srcLabel[p.source]||p.source||'unknown';
    return`<div class="item-card">
      <div class="ic-top">
        <div class="ic-body">
          <div class="ic-text">${esc(p.text)}${p.sarcasm?'<span class="sar-badge">sarcasm</span>':''}</div>
          <div class="ic-meta">
            <span class="src-badge ${badgeCls}">${esc(badgeLabel)}</span>
            <span class="ic-emo" style="color:${col}">${esc(p.emotion||'neutral')}</span>
            ${p.intensity==='high'?'<span class="int-high">high intensity</span>':''}
            ${p.likes?`<span class="ic-eng">${Number(p.likes).toLocaleString()} likes</span>`:''}
            ${p.rt?`<span class="ic-eng">${Number(p.rt).toLocaleString()} shares</span>`:''}
            ${(p.key_words||[]).length?`<span class="ic-emo">${esc(p.key_words.slice(0,3).join(', '))}</span>`:''}
          </div>
        </div>
        <div class="ic-right">
          <span class="spill ${sp}">${esc(p.sentiment)}</span>
          <span class="comp-val">${comp>=0?'+':''}${comp.toFixed(2)}</span>
        </div>
      </div>
      <div class="ic-scores">
        <div class="ic-sc"><div class="ic-sv" style="color:var(--pos)">${Math.round(p.pos||0)}%</div><div class="ic-sl">Positive</div></div>
        <div class="ic-sc"><div class="ic-sv" style="color:var(--neu)">${Math.round(p.neu||0)}%</div><div class="ic-sl">Neutral</div></div>
        <div class="ic-sc"><div class="ic-sv" style="color:var(--neg)">${Math.round(p.neg||0)}%</div><div class="ic-sl">Negative</div></div>
      </div>
      <div class="conf-strip">
        <span class="conf-label">Confidence ${conf}%</span>
        <div class="conf-track"><div class="conf-fill" style="width:${conf}%;background:${col}"></div></div>
      </div>
    </div>`;
  }).join('');
}

function filterBy(f,btn){
  document.querySelectorAll('.fbtn').forEach(b=>b.classList.remove('on'));
  btn.classList.add('on');
  renderItems(f);
}

/* ═══════════════════════════════════════ EXPORT ═══ */
function exportCSV(){
  if(!allItems.length){ alert('No data to export.'); return; }
  const h=['text','source','likes','rt','sentiment','compound','pos','neg','neu','confidence','emotion','intensity','sarcasm','key_words'];
  const rows=allItems.map(p=>h.map(k=>{
    const v=k==='key_words'?(p[k]||[]).join('|'):(p[k]??'');
    return`"${String(v).replace(/"/g,'""')}"`;
  }).join(','));
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([[h.join(','),...rows].join('\n')],{type:'text/csv'}));
  a.download=`hashtag_sentiment_${Date.now()}.csv`;
  a.click();
}

document.addEventListener('DOMContentLoaded',()=>{
  showView('searchView');
  const input=document.getElementById('hashInput');
  if(input) input.value='';
});
