const CONFIGS=[{name:"Sprint",work:15,brk:5},{name:"Classic",work:25,brk:5},{name:"Half hour",work:30,brk:5},{name:"Deep 45",work:45,brk:15},{name:"Deep 50",work:50,brk:10},{name:"52 / 17",work:52,brk:17},{name:"Long haul",work:90,brk:20}];
  const BUFFERS=[0,5,10,15];

  // persistence probe — honest about the environment
  let PERSIST=true;
  try{localStorage.setItem("pf.__t","1");localStorage.removeItem("pf.__t");}catch(e){PERSIST=false;}
  const mem={};
  const store={get(k,d){try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v);}catch(e){return (k in mem)?mem[k]:d;}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch(e){mem[k]=v;}}};

  const state={
    mode:store.get("pf.mode","until"),lenH:store.get("pf.lenH",1),lenM:store.get("pf.lenM",50),
    until:store.get("pf.until",""),buffer:store.get("pf.buffer",10),cfg:store.get("pf.cfg",1),
    restLast:store.get("pf.restLast",false),blocks:store.get("pf.blocks",[]),muted:store.get("pf.muted",false),
    cw:store.get("pf.cw",40),cb:store.get("pf.cb",8),
    running:store.get("pf.running",false),committed:store.get("pf.committed",null),
  };
  let lastActiveIdx=-1, completedFired=false, actx=null;

  const fmt=m=>{m=Math.round(m);const h=Math.floor(m/60),r=m%60;return h&&r?`${h}h ${r}m`:h?`${h}h`:`${r}m`;};
  const addMin=(d,m)=>new Date(d.getTime()+m*60000);
  const clock=d=>d.toLocaleTimeString([],{hour:'numeric',minute:'2-digit'});
  const esc=s=>s.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const mmss=sec=>{sec=Math.max(0,Math.ceil(sec));return `${Math.floor(sec/60)}:${String(sec%60).padStart(2,"0")}`;};

  function windowRaw(){
    if(state.mode==="length")return state.lenH*60+state.lenM;
    if(!state.until)return null;
    const now=new Date();const[H,M]=state.until.split(":").map(Number);const t=new Date(now);t.setHours(H,M,0,0);return (t-now)/60000;
  }
  function usableMinutes(){const raw=windowRaw();if(raw===null)return null;if(state.mode==="until"&&raw<=0)return -1;return Math.max(raw-state.buffer,0);}
  function compute(work,brk,T,restLast){if(work<=0||T<=0)return{n:0,breaks:0,focus:0,used:0,spare:Math.max(T,0)};let n=restLast?Math.floor(T/(work+brk)):Math.floor((T+brk)/(work+brk));if(n<0)n=0;const breaks=restLast?n:Math.max(n-1,0);const focus=n*work,used=focus+breaks*brk;return{n,breaks,focus,used,spare:Math.max(T-used,0)};}

  function buildSegments(work,brk,T,restLast,blocks){
    const {n}=compute(work,brk,T,restLast);let m=0;const segs=[];
    for(let i=0;i<n;i++){segs.push({type:'work',idx:i,label:blocks[i]||null,m0:m,m1:m+work});m+=work;const nb=restLast?true:(i<n-1);if(nb){segs.push({type:'break',m0:m,m1:m+brk});m+=brk;}}
    return {segs,total:m,n};
  }

  function beep(freq,dur){if(state.muted)return;try{actx=actx||new (window.AudioContext||window.webkitAudioContext)();const o=actx.createOscillator(),g=actx.createGain();o.type='sine';o.frequency.value=freq;o.connect(g);g.connect(actx.destination);const t=actx.currentTime;g.gain.setValueAtTime(.0008,t);g.gain.exponentialRampToValueAtTime(.28,t+.02);g.gain.exponentialRampToValueAtTime(.0008,t+dur);o.start(t);o.stop(t+dur+.02);}catch(e){}}
  const handoffChime=()=>{beep(680,.16);setTimeout(()=>beep(1020,.22),190);};
  const doneChime=()=>{beep(560,.3);setTimeout(()=>beep(840,.3),260);setTimeout(()=>beep(1120,.42),540);};

  // effective styles = presets, plus a Custom one when a work length is set
  function configs(){return state.cw>0?CONFIGS.concat([{name:"Custom",work:state.cw,brk:state.cb||0}]):CONFIGS;}
  function cur(){const a=configs();return a[state.cfg]||a[a.length-1]||CONFIGS[1];}

  function render(){const a=configs();if(state.cfg>=a.length)state.cfg=a.length-1;if(state.cfg<0)state.cfg=0;renderWindow();renderCompare();renderBlocks();renderRunCard();}

  function renderWindow(){
    document.querySelectorAll("#modeTog button").forEach(b=>b.classList.toggle("on",b.dataset.mode===state.mode));
    document.getElementById("untilPane").style.display=state.mode==="until"?"flex":"none";
    document.getElementById("lengthPane").style.display=state.mode==="length"?"flex":"none";
    document.getElementById("untilInput").value=state.until;
    const hh=document.getElementById("hh"),mm=document.getElementById("mm");
    if(document.activeElement!==hh)hh.value=state.lenH||"";
    if(document.activeElement!==mm)mm.value=(state.lenM||state.lenM===0)?state.lenM:"";
    document.querySelectorAll("#bufChips .chip").forEach(c=>c.classList.toggle("on",+c.dataset.b===state.buffer));
    document.getElementById("restToggle").classList.toggle("on",state.restLast);
    const cwi=document.getElementById("cwInput"),cbi=document.getElementById("cbInput");
    if(cwi&&document.activeElement!==cwi)cwi.value=state.cw||"";
    if(cbi&&document.activeElement!==cbi)cbi.value=(state.cb||state.cb===0)?state.cb:"";
    const line=document.getElementById("windowLine");const raw=windowRaw();
    if(raw===null){line.className="window-line";line.innerHTML="Set a stop time to size the window.";return;}
    if(state.mode==="until"&&raw<=0){line.className="window-line warn";line.innerHTML="That time's already gone by today — pick a later one, or switch to <b>For a length</b>.";return;}
    const u=Math.max(raw-state.buffer,0);line.className="window-line";
    if(state.mode==="until"){const stop=new Date(Date.now()+raw*60000);line.innerHTML=state.buffer?`Now → stop by <b>${clock(stop)}</b>, minus ${state.buffer}m buffer = <b>${fmt(u)}</b> to work.`:`Now → <b>${clock(stop)}</b> = <b>${fmt(u)}</b> to work.`;}
    else line.innerHTML=`<b>${fmt(u)}</b> to work${state.buffer?` (after a ${state.buffer}m buffer)`:``}.`;
  }

  function renderCompare(){
    document.getElementById("compareLock").style.display=state.running?"block":"none";
    const el=document.getElementById("compare");const T=usableMinutes();
    if(T===null||T===-1){el.innerHTML=`<p class="msg">Set the window above to compare styles.</p>`;return;}
    const rows=configs().map((c,i)=>({c,i,r:compute(c.work,c.brk,T,state.restLast)}));
    const maxFocus=Math.max(...rows.map(x=>x.r.focus));
    el.innerHTML=rows.map(({c,i,r})=>{
      const sel=i===state.cfg,best=r.focus>0&&r.focus===maxFocus;
      if(r.n===0)return `<div class="res dead" data-i="${i}"><div class="res-head"><div class="cfg">${c.name} <small>${c.work}/${c.brk}</small></div></div><p class="none">Won't fit a single ${c.work}-minute session.</p></div>`;
      let tl="";for(let k=0;k<r.n;k++){tl+=`<div class="seg w" style="flex:${c.work}"></div>`;const nb=state.restLast?true:(k<r.n-1);if(nb&&r.breaks>0)tl+=`<div class="seg b" style="flex:${c.brk}"></div>`;}
      if(r.spare>0)tl+=`<div class="seg s" style="flex:${r.spare}"></div>`;
      const badge=sel?`<span class="badge plan">Planning this</span>`:(best?`<span class="badge best">Most focus</span>`:``);
      return `<div class="res${sel?' sel':''}" data-i="${i}" role="button" tabindex="0"><div class="res-head"><div class="cfg">${c.name} <small>${c.work}/${c.brk}</small></div>${badge}</div>
      <div class="stats"><div class="stat"><span class="v">${r.n}</span><span class="k">Sessions</span></div><div class="stat"><span class="v ${r.breaks?'':'zero'}">${r.breaks}</span><span class="k">Breaks</span></div><div class="stat"><span class="v">${fmt(r.focus)}</span><span class="k">Focus</span></div><div class="stat"><span class="v spare ${r.spare?'':'zero'}">${r.spare?fmt(r.spare):'0m'}</span><span class="k">Left over</span></div></div>
      <div class="tl">${tl}</div></div>`;
    }).join("");
  }

  function renderBlocks(){
    const ul=document.getElementById("blockList");
    ul.innerHTML=state.blocks.map((b,i)=>`<li><span class="idx">${i+1}</span><span class="txt">${esc(b)}</span><button class="mini" data-up="${i}" ${i===0?'disabled style="opacity:.3"':''} aria-label="move up">▲</button><button class="mini del" data-del="${i}" aria-label="remove">✕</button></li>`).join("");
    document.getElementById("emptyBlocks").style.display=state.blocks.length?"none":"block";
    document.getElementById("clearAll").style.display=state.blocks.length?"inline":"none";
    const hn=document.getElementById("heldNote");
    if(!state.blocks.length){hn.textContent="";hn.className="held";}
    else if(PERSIST){hn.textContent=`${state.blocks.length} held`;hn.className="held";}
    else{hn.textContent=`${state.blocks.length} added · won't persist here`;hn.className="held warn";}
  }

  // THE RUN — planning preview OR live running
  function renderRunCard(){
    const card=document.getElementById("runCard");
    if(state.running&&state.committed){renderRunning(card);document.getElementById("runSub").textContent=`Running ${state.committed.cfgName} — locked to the clock.`;return;}
    const c=cur();
    document.getElementById("runSub").textContent=`Timed, using ${c.name} (${c.work}/${c.brk}).`;
    const T=usableMinutes();
    if(T===null||T===-1){card.innerHTML=`<p class="msg">Set the window and tap a style to build the run.</p>`;return;}
    const {n,breaks}=compute(c.work,c.brk,T,state.restLast);
    if(n===0){card.innerHTML=`<p class="msg">${c.name} won't fit ${fmt(T)}. Tap a shorter style above.</p>`;return;}
    let t=new Date(),out=[];
    for(let i=0;i<n;i++){const wEnd=addMin(t,c.work);const label=state.blocks[i]||null;
      out.push(`<li><div class="time">${clock(t)} <span class="to">– ${clock(wEnd)}</span></div><div class="pbody"><div class="b-work"><span class="dot w"></span><div><div class="b-label ${label?'':'open'}">${label?esc(label):'Open focus'}</div><div class="b-tag">Session ${i+1} · ${c.work}m</div></div></div></div></li>`);
      t=wEnd;const nb=state.restLast?true:(i<n-1);
      if(nb){const bEnd=addMin(t,c.brk);out.push(`<li><div class="time">${clock(t)} <span class="to">– ${clock(bEnd)}</span></div><div class="pbody"><div class="b-break"><span class="dot b"></span>Break · ${c.brk}m</div></div></li>`);t=bEnd;}}
    let over="";const left=state.blocks.length-n;
    if(left>0)over=`<div class="overflow"><b>${left} block${left>1?'s':''} won't fit this window</b> — carry into the next one:<ul>${state.blocks.slice(n).map(b=>`<li>${esc(b)}</li>`).join("")}</ul></div>`;
    else if(state.blocks.length>0&&state.blocks.length<n)over=`<div class="overflow" style="border-color:var(--line);color:var(--sage)">${n-state.blocks.length} open session${n-state.blocks.length>1?'s':''} past your list — spare focus, or add more blocks.</div>`;
    card.innerHTML=`<p class="plan-sum"><b>${n}</b> session${n>1?'s':''} · <b>${breaks}</b> break${breaks!==1?'s':''} · <b>${fmt(n*c.work)}</b> focus · done by <b>${clock(t)}</b></p>
      <ol class="plan">${out.join("")}</ol>${over}
      <div class="run-ctrl"><button class="start-btn" id="startBtn">▶  Start the run</button><button class="icon-btn ${state.muted?'':'on'}" id="muteBtn" aria-label="sound" title="sound">${state.muted?'🔕':'🔔'}</button></div>`;
    document.getElementById("startBtn").onclick=startRun;
    document.getElementById("muteBtn").onclick=toggleMute;
  }

  function renderRunning(card){
    const cm=state.committed;const base=new Date(cm.startedAt);
    const elapsedSec=(Date.now()-cm.startedAt)/1000, elapsedMin=elapsedSec/60;
    // find active
    let activeIdx=-1;
    for(let i=0;i<cm.segs.length;i++){if(elapsedMin>=cm.segs[i].m0&&elapsedMin<cm.segs[i].m1){activeIdx=i;break;}}
    const done=elapsedMin>=cm.total;

    // chimes
    if(done){if(!completedFired){completedFired=true;doneChime();}}
    else{if(activeIdx!==lastActiveIdx){if(lastActiveIdx!==-1)handoffChime();lastActiveIdx=activeIdx;}}

    // now-card
    let nowHtml;
    if(done){
      nowHtml=`<div class="now done"><div class="now-top"><span class="now-kind" style="color:var(--work)">Window complete</span><span class="now-clock">${clock(base)} – ${clock(addMin(base,cm.total))}</span></div>
      <div class="now-label">That's the run.</div><div class="now-next">${fmt(cm.total)} clocked · ${cm.segs.filter(s=>s.type==='work').length} sessions done.</div></div>`;
    }else{
      const s=cm.segs[activeIdx];const remSec=(s.m1-elapsedMin)*60;const segLen=(s.m1-s.m0);const segProg=(elapsedMin-s.m0)/segLen*100;
      const nxt=cm.segs[activeIdx+1];
      const nextTxt=nxt?(nxt.type==='break'?`Break · ${Math.round(nxt.m1-nxt.m0)}m`:(nxt.label?esc(nxt.label):`Session ${nxt.idx+1} · open focus`)):`Nothing — window closes`;
      if(s.type==='work'){
        nowHtml=`<div class="now"><div class="now-top"><span class="now-kind">Focus · Session ${s.idx+1}</span><span class="now-clock">ends ${clock(addMin(base,s.m1))}</span></div>
        <div class="now-label ${s.label?'':'open'}">${s.label?esc(s.label):'Open focus'}</div>
        <div class="count">${mmss(remSec)}<small>left</small></div><div class="prog"><i style="width:${segProg}%"></i></div>
        <div class="now-next">Next — <b>${nextTxt}</b></div></div>`;
      }else{
        nowHtml=`<div class="now break"><div class="now-top"><span class="now-kind">Break</span><span class="now-clock">ends ${clock(addMin(base,s.m1))}</span></div>
        <div class="now-label">Step back.</div>
        <div class="count">${mmss(remSec)}<small>left</small></div><div class="prog"><i style="width:${segProg}%"></i></div>
        <div class="now-next">Next — <b>${nextTxt}</b></div></div>`;
      }
    }

    // schedule list
    const rows=cm.segs.map(s=>{
      const past=elapsedMin>=s.m1, active=elapsedMin>=s.m0&&elapsedMin<s.m1;
      const time=`${clock(addMin(base,s.m0))}`;
      if(s.type==='break'){return `<li class="${past?'past':active?'active':''}"><span class="rl-time">${time}</span><div class="rl-body"><span class="dot b"></span><span class="rl-sub">Break · ${Math.round(s.m1-s.m0)}m</span>${past?'<span class="check">✓</span>':''}</div></li>`;}
      const lbl=s.label?esc(s.label):'Open focus';
      return `<li class="${past?'past':active?'active':''}"><span class="rl-time">${time}</span><div class="rl-body"><span class="dot w"></span><span class="rl-label">${lbl}</span>${past?'<span class="check">✓</span>':''}</div></li>`;
    }).join("");

    card.innerHTML=nowHtml+`<ul class="run-list">${rows}</ul>
      <div class="run-ctrl" style="margin-top:12px"><button class="stop-btn" id="stopBtn">${done?'Done — clear':'Stop the run'}</button><button class="icon-btn ${state.muted?'':'on'}" id="muteBtn" aria-label="sound">${state.muted?'🔕':'🔔'}</button></div>`;
    document.getElementById("stopBtn").onclick=stopRun;
    document.getElementById("muteBtn").onclick=toggleMute;
  }

  function startRun(){
    const c=cur();const T=usableMinutes();
    if(T===null||T===-1)return;
    const {segs,total,n}=buildSegments(c.work,c.brk,T,state.restLast,state.blocks);
    if(n===0)return;
    try{actx=actx||new (window.AudioContext||window.webkitAudioContext)();if(actx.state==='suspended')actx.resume();}catch(e){}
    state.committed={startedAt:Date.now(),cfgName:c.name,work:c.work,brk:c.brk,segs,total,n};
    state.running=true;lastActiveIdx=-1;completedFired=false;
    store.set("pf.committed",state.committed);store.set("pf.running",true);
    render();window.scrollTo({top:document.getElementById("runCard").offsetTop-70,behavior:"smooth"});
  }
  function stopRun(){state.running=false;state.committed=null;lastActiveIdx=-1;completedFired=false;store.set("pf.running",false);store.set("pf.committed",null);render();}
  function toggleMute(){state.muted=!state.muted;store.set("pf.muted",state.muted);renderRunCard();}

  // chips
  document.getElementById("bufChips").innerHTML=BUFFERS.map(b=>`<button class="chip" data-b="${b}">${b?b+'m':'None'}</button>`).join("");
  // events
  document.getElementById("modeTog").addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;state.mode=b.dataset.mode;store.set("pf.mode",state.mode);render();});
  document.getElementById("untilInput").addEventListener("input",e=>{state.until=e.target.value;store.set("pf.until",state.until);render();});
  document.getElementById("hh").addEventListener("input",e=>{state.lenH=Math.max(0,Math.min(24,+e.target.value||0));store.set("pf.lenH",state.lenH);render();});
  document.getElementById("mm").addEventListener("input",e=>{state.lenM=Math.max(0,Math.min(59,+e.target.value||0));store.set("pf.lenM",state.lenM);render();});
  document.getElementById("cwInput").addEventListener("input",e=>{state.cw=Math.max(0,Math.min(240,+e.target.value||0));store.set("pf.cw",state.cw);render();});
  document.getElementById("cbInput").addEventListener("input",e=>{state.cb=Math.max(0,Math.min(120,+e.target.value||0));store.set("pf.cb",state.cb);render();});
  document.getElementById("bufChips").addEventListener("click",e=>{const c=e.target.closest(".chip");if(!c)return;state.buffer=+c.dataset.b;store.set("pf.buffer",state.buffer);render();});
  document.getElementById("compare").addEventListener("click",e=>{if(state.running)return;const r=e.target.closest(".res");if(!r||r.classList.contains("dead"))return;state.cfg=+r.dataset.i;store.set("pf.cfg",state.cfg);render();});
  document.getElementById("compare").addEventListener("keydown",e=>{if(state.running)return;if(e.key!=="Enter"&&e.key!==" ")return;const r=e.target.closest(".res");if(!r||r.classList.contains("dead"))return;e.preventDefault();state.cfg=+r.dataset.i;store.set("pf.cfg",state.cfg);render();});
  const rt=document.getElementById("restToggle");
  function togRest(){state.restLast=!state.restLast;rt.setAttribute("aria-checked",state.restLast);store.set("pf.restLast",state.restLast);render();}
  rt.addEventListener("click",togRest);rt.addEventListener("keydown",e=>{if(e.key===" "||e.key==="Enter"){e.preventDefault();togRest();}});
  const input=document.getElementById("blockInput");
  function addBlock(){const v=input.value.trim();if(!v)return;state.blocks.push(v);store.set("pf.blocks",state.blocks);input.value="";input.focus();render();}
  document.getElementById("addBtn").addEventListener("click",addBlock);
  input.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();addBlock();}});
  document.getElementById("blockList").addEventListener("click",e=>{const del=e.target.closest("[data-del]"),up=e.target.closest("[data-up]");if(del)state.blocks.splice(+del.dataset.del,1);else if(up){const i=+up.dataset.up;if(i>0)[state.blocks[i-1],state.blocks[i]]=[state.blocks[i],state.blocks[i-1]];}else return;store.set("pf.blocks",state.blocks);render();});
  document.getElementById("clearAll").addEventListener("click",()=>{state.blocks=[];store.set("pf.blocks",state.blocks);render();});

  if(state.mode==="until"&&!state.until){const d=addMin(new Date(),110);d.setSeconds(0,0);state.until=`${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;}
  render();
  // one loop: 1s live tick while running; gentle window refresh while planning
  let plink=0;
  setInterval(()=>{
    if(state.running&&state.committed){renderRunCard();}
    else{plink++;if(plink%30===0&&!document.querySelector("input:focus"))renderWindow();}
  },1000);
