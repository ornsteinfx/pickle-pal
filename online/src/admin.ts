export function adminPage(authed: boolean): string {
  if (!authed) {
    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>PICKLE PAL — ADMIN</title>
<style>
  body{margin:0;background:#0b1c34;color:#cfe8ff;font-family:monospace;display:flex;align-items:center;justify-content:center;min-height:100vh}
  #wrap{width:min(420px,92vw);text-align:center}
  h1{font-size:22px;letter-spacing:2px;color:#3fd6a5;text-shadow:0 0 12px #3fd6a5}
  h1 span{color:#ffd23d}
  .card{background:#0d2240;border:3px solid #1d3a5f;box-shadow:3px 3px 0 rgba(0,0,0,.5);padding:24px;margin-top:18px}
  label{display:block;font-size:11px;letter-spacing:2px;color:#8aa6c8;margin-bottom:10px}
  input{width:100%;box-sizing:border-box;font-family:inherit;font-size:16px;letter-spacing:2px;background:#0b1c34;border:3px solid #1d3a5f;color:#3fd6a5;padding:12px;text-align:center;outline:none}
  input:focus{border-color:#3fd6a5}
  button{margin-top:14px;width:100%;font-family:inherit;font-size:14px;letter-spacing:2px;text-transform:uppercase;background:#3fd6a5;border:3px solid #0a1220;color:#062018;padding:12px;cursor:pointer;box-shadow:0 4px 0 #0a1220}
  button:active{transform:translateY(3px);box-shadow:none}
  #err{color:#e84848;font-size:12px;letter-spacing:1px;margin-top:12px;min-height:16px}
</style>
</head>
<body>
<div id="wrap">
  <h1>PICKLE PAL <span>ADMIN</span></h1>
  <div class="card">
    <label>ENTER ADMIN PASSWORD</label>
    <input id="pw" type="password" autocomplete="current-password" onkeydown="if(event.key==='Enter')login()" />
    <button onclick="login()">UNLOCK</button>
    <div id="err"></div>
  </div>
</div>
<script>
async function login(){
  const pw=document.getElementById("pw");
  const err=document.getElementById("err");
  const r=await fetch("/api/login",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({password:pw.value})});
  if(r.ok) location.reload();
  else err.textContent="BAD PASSWORD";
}
</script>
</body>
</html>`
  }

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>PICKLE PAL — ADMIN</title>
<style>
  body{margin:0;background:#0b1c34;color:#cfe8ff;font-family:monospace}
  #wrap{max-width:860px;margin:0 auto;padding:24px 16px}
  h1{font-size:22px;letter-spacing:2px;color:#3fd6a5;text-shadow:0 0 12px #3fd6a5;margin:0 0 4px}
  h1 span{color:#ffd23d}
  .top{display:flex;gap:16px;flex-wrap:wrap;margin:16px 0}
  .big{flex:1;min-width:180px;background:#0d2240;border:3px solid #1d3a5f;box-shadow:3px 3px 0 rgba(0,0,0,.5);padding:20px;text-align:center}
  .big .n{font-size:56px;color:#3fd6a5;text-shadow:0 0 18px #3fd6a5}
  .big label,.side label{display:block;font-size:10px;letter-spacing:2px;color:#8aa6c8;margin-top:6px}
  .side{flex:2;min-width:300px;background:#0d2240;border:3px solid #1d3a5f;box-shadow:3px 3px 0 rgba(0,0,0,.5);padding:14px}
  canvas{display:block;width:100%;height:100px;background:#0b1c34;border:2px solid #1d3a5f}
  .row{display:flex;gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap}
  button{font-family:inherit;font-size:11px;letter-spacing:2px;text-transform:uppercase;background:#e84848;border:3px solid #0a1220;color:#fff;padding:10px 16px;cursor:pointer;box-shadow:0 4px 0 #0a1220}
  button:active{transform:translateY(3px);box-shadow:none}
  .tbl{width:100%;border-collapse:collapse;margin-top:6px;background:#0d2240;border:3px solid #1d3a5f}
  th{font-size:10px;letter-spacing:2px;color:#8aa6c8;text-align:left;padding:10px 12px;border-bottom:2px solid #1d3a5f}
  td{padding:10px 12px;font-size:13px;border-bottom:1px solid #12294d}
  .dot{display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:8px}
  .dot.on{background:#3fd6a5;box-shadow:0 0 8px #3fd6a5}
  .dot.off{background:#4a5a76}
  .now{color:#3fd6a5}
  .dim{color:#8aa6c8}
  .card2{flex:1;min-width:300px;background:#0d2240;border:3px solid #1d3a5f;box-shadow:3px 3px 0 rgba(0,0,0,.5);padding:18px;margin-top:18px}
  .card2 h2{font-size:13px;letter-spacing:2px;color:#ffd23d;margin:0 0 14px}
  .card2 label{display:block;font-size:10px;letter-spacing:2px;color:#8aa6c8;margin:10px 0 6px}
  .card2 input,.card2 textarea{width:100%;box-sizing:border-box;font-family:inherit;font-size:13px;background:#0b1c34;border:3px solid #1d3a5f;color:#3fd6a5;padding:10px;outline:none}
  .card2 textarea{resize:vertical}
  .card2 input:focus,.card2 textarea:focus{border-color:#3fd6a5}
  .card2 button{margin-top:14px;width:100%;background:#ffd23d;color:#062018;border-color:#0a1220}
  #ntmsg{margin-top:10px;font-size:11px;letter-spacing:1px;min-height:14px;color:#3fd6a5}
  .bug{background:#0b1c34;border:2px solid #1d3a5f;padding:12px;margin-bottom:10px;font-size:12px}
  .bug.done{opacity:.4}
  .bug .bhead{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:6px}
  .bug .btitle{color:#e84848;letter-spacing:1px;font-weight:bold}
  .bug .bwho{color:#8aa6c8;font-size:10px;letter-spacing:1px}
  .bug .btext{color:#cfe8ff;line-height:1.5;white-space:pre-wrap;word-break:break-word}
  .bug .bgo{display:inline-block;margin-left:8px;font-size:10px;padding:6px 10px;background:#3fd6a5;color:#062018;border:2px solid #0a1220;cursor:pointer;letter-spacing:1px}
  .bug .bgo:hover{background:#7ae0a8}
  .feed{max-height:340px;overflow-y:auto}
  .fi{display:flex;gap:10px;align-items:flex-start;padding:8px 0;border-bottom:1px solid #12294d;font-size:12px}
  .fi:last-child{border-bottom:none}
  .fb{flex:none;width:66px;text-align:center;padding:4px 0;font-size:9px;letter-spacing:1px;color:#062018;font-weight:bold}
  .fb.join{background:#3fd6a5}
  .fb.challenge{background:#ffd23d}
  .fb.accept{background:#21d07a}
  .fb.decline{background:#e84848}
  .fb.bug{background:#ff9f43}
  .fb.note{background:#7b3fa0;color:#fff}
  .ft{flex:1;color:#cfe8ff;line-height:1.5}
  .ft .wt{color:#8aa6c8;font-size:10px;letter-spacing:1px}
</style>
</head>
<body>
<div id="wrap">
  <div class="row">
    <h1>PICKLE PAL <span>ADMIN</span></h1>
    <button onclick="logout()">LOCK</button>
  </div>
  <div class="top">
    <div class="big"><div class="n" id="live">0</div><label>LIVE PLAYERS</label><div style="margin-top:8px" class="dim" id="reg">0 REGISTERED</div></div>
    <div class="side"><canvas id="spark" width="860" height="200"></canvas><label>ONLINE — LAST 2 HOURS</label></div>
  </div>
  <table class="tbl">
    <thead><tr><th>NAME</th><th>CODE</th><th>UID</th><th>LAST SEEN</th></tr></thead>
    <tbody id="rows"><tr><td colspan="4" class="dim">NOBODY ONLINE</td></tr></tbody>
  </table>
  <div class="row" style="margin-top:22px;align-items:flex-start">
    <div class="card2">
      <h2>BROADCAST PATCH NOTE</h2>
      <label>TITLE</label>
      <input id="nt" maxlength="60" placeholder="e.g. PATCH v1.2" />
      <label>LETTER</label>
      <textarea id="nb" maxlength="1500" rows="5" placeholder="Write the letter players will see in their inbox..."></textarea>
      <button onclick="sendNote()">SEND TO ALL PLAYERS</button>
      <div id="ntmsg"></div>
    </div>
    <div class="card2" style="flex:2">
      <h2>BUG REPORTS <span id="bugcount"></span></h2>
      <div id="bugs" class="dim">LOADING...</div>
    </div>
  </div>
  <div class="card2" style="min-width:100%">
    <h2>ACTIVITY FEED</h2>
    <div id="feed" class="feed dim">LOADING...</div>
  </div>
</div>
<script>
const esc=(s)=>String(s||"").replace(/[&<>"]/g,(c)=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const ago=(ts)=>{const s=Math.floor((Date.now()-ts)/1000);if(s<5)return "NOW";if(s<60)return s+"s AGO";const m=Math.floor(s/60);if(m<60)return m+"m AGO";return Math.floor(m/60)+"h AGO"};
const spark=document.getElementById("spark");
function drawSpark(h){
  const ctx=spark.getContext("2d");
  const W=spark.width,H=spark.height;
  ctx.clearRect(0,0,W,H);
  ctx.strokeStyle="#1d3a5f";
  for(let g=0;g<=3;g++){const y=14+g*((H-28)/3);ctx.beginPath();ctx.moveTo(8,y);ctx.lineTo(W-8,y);ctx.stroke()}
  if(!h.length){ctx.fillStyle="#8aa6c8";ctx.font="12px monospace";ctx.fillText("NO DATA YET",24,H/2);return}
  const max=Math.max(1,...h.map(p=>p.n));
  const pts=h.map((p,i)=>{const x=8+(i/(h.length-1))*(W-16);const y=H-14-((p.n/max)*(H-36));return [x,y]});
  ctx.strokeStyle="#3fd6a5";ctx.lineWidth=2;ctx.beginPath();
  pts.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));
  ctx.stroke();
  ctx.lineTo(pts[pts.length-1][0],H-12);ctx.lineTo(pts[0][0],H-12);ctx.closePath();
  ctx.fillStyle="rgba(63,214,165,0.15)";ctx.fill();
}
async function logout(){await fetch("/api/logout",{method:"POST"});location.reload()}
async function sendNote(){
  const title=document.getElementById("nt").value.trim();
  const body=document.getElementById("nb").value.trim();
  const msg=document.getElementById("ntmsg");
  if(!title||!body){msg.textContent="TITLE AND LETTER REQUIRED";return}
  const r=await fetch("/api/admin/patchnote",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({title,body})});
  if(r.status===401){location.reload();return}
  const d=await r.json();
  if(d.ok){msg.textContent="SENT TO ALL PLAYERS!";document.getElementById("nt").value="";document.getElementById("nb").value=""}
  else msg.textContent="FAILED";
}
async function loadBugs(){
  const r=await fetch("/api/admin/bugs");
  if(r.status===401){location.reload();return}
  const d=await r.json();
  const bugs=d.bugs||[];
  document.getElementById("bugcount").textContent=bugs.filter(b=>!b.resolved).length?"("+bugs.filter(b=>!b.resolved).length+" OPEN)":"";
  const box=document.getElementById("bugs");
  if(!bugs.length){box.innerHTML='<span class="dim">NO BUG REPORTS YET</span>';return}
  box.innerHTML=bugs.map(b=>
    '<div class="bug'+(b.resolved?" done":"")+'">'+
    '<div class="bhead"><span class="btitle">'+esc(b.text.slice(0,60))+'</span>'+
    '<span class="bwho">'+esc(b.name||"?")+' · '+(b.code?"#"+esc(b.code.slice(0,3))+"-Pal "+esc(b.code.slice(3)):"NO CODE")+' · '+ago(b.at)+'</span></div>'+
    '<div class="btext">'+esc(b.text)+'</div>'+
    '<div style="margin-top:8px"><span class="dim">'+esc(b.uid)+'</span>'+
    (b.resolved?'':'<span class="bgo" onclick="resolveBug('+b.id+')">MARK DONE</span>')+
    '</div></div>'
  ).join("");
}
async function resolveBug(id){
  const r=await fetch("/api/admin/bugs/resolve",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({id})});
  if(r.status===401){location.reload();return}
  loadBugs();
}
async function loadFeed(){
  const r=await fetch("/api/admin/feed");
  if(r.status===401){location.reload();return}
  const d=await r.json();
  const f=d.feed||[];
  const box=document.getElementById("feed");
  if(!f.length){box.innerHTML='<span class="dim">NO ACTIVITY YET</span>';return}
  box.innerHTML=f.map(a=>
    '<div class="fi"><span class="fb '+a.type+'">'+a.type.toUpperCase()+'</span><span class="ft">'+esc(a.text)+'<div class="wt">'+ago(a.t)+'</div></span></div>'
  ).join("");
}
async function tick(){
  const r=await fetch("/api/admin/stats");
  if(r.status===401){location.reload();return}
  const d=await r.json();
  document.getElementById("live").textContent=d.count;
  document.getElementById("reg").textContent=d.registered+" REGISTERED";
  const rows=document.getElementById("rows");
  const list=d.players.slice().sort((a,b)=>b.lastSeen-a.lastSeen);
  rows.innerHTML=list.map(p=>
    '<tr><td><span class="dot '+(Date.now()-p.lastSeen<60000?"on":"off")+'"></span>'+esc(p.name)+'</td>'+
    '<td class="dim">#'+esc(p.code.slice(0,3))+'-Pal '+esc(p.code.slice(3))+'</td>'+
    '<td class="dim">'+esc(p.uid)+'</td>'+
    '<td class="'+(Date.now()-p.lastSeen<10000?"now":"dim")+'">'+ago(p.lastSeen)+'</td></tr>'
  ).join("")||'<tr><td colspan="4" class="dim">NOBODY ONLINE</td></tr>';
  drawSpark(d.history||[]);
}
tick();
loadBugs();
loadFeed();
setInterval(tick,5000);
setInterval(loadBugs,15000);
setInterval(loadFeed,5000);
</script>
</body>
</html>`
}

