// Backend (used only when demo mode is off)
const BASE_URL = "https://api.pauhu.ai/haminanenergia/pauhu/v1";

function show(o){
  document.getElementById("output").textContent = JSON.stringify(o, null, 2);
  document.getElementById("ts").textContent = new Date().toLocaleString();
}
function demo(){
  const el = document.getElementById("demoMode");
  return el && el.checked;
}

// ---- Core demo ----
async function sendUsage(){
  const payload = {
    t: new Date().toISOString(),
    meter_id: document.getElementById("meterId").value,
    kwh: parseFloat(document.getElementById("kwh").value || "0")
  };
  if (demo()){ show({ demo:true, stored:1, ...payload }); return; }
  try{
    const r = await fetch(`${BASE_URL}/usage/ingest`, {
      method:"POST", headers:{ "Content-Type":"application/json" },
      body: JSON.stringify(payload)
    });
    show(await r.json());
  }catch(e){ show({ error:String(e) }); }
}

async function getOptimization(){
  const wid = encodeURIComponent(document.getElementById("windowId").value || "pilot-window-1");
  if (demo()){
    const t = new Date().toISOString();
    show({
      demo:true, window_id:wid,
      recommendations:[
        { time:t, setpoint_kw: 9500, note:"Shift 02:00–04:00 to off-peak" },
        { time:t, setpoint_kw: 6000, note:"Prefer battery discharge at 18:00" }
      ]
    });
    return;
  }
  try{
    const r = await fetch(`${BASE_URL}/optimizer/recommendation?window_id=${wid}`);
    show(await r.json());
  }catch(e){ show({ error:String(e) }); }
}

async function checkHealth(){
  const badg = document.getElementById("healthBadge");
  if (demo()){ badg.innerHTML='Status: <span class="dot dot-ok"></span> Demo'; show({ demo:true, status:"green" }); return; }
  try{
    const r = await fetch(`${BASE_URL}/reliability/health`, { cache:"no-store" });
    const ok = r.ok; const data = await r.json();
    badg.innerHTML = 'Status: <span class="dot '+(ok?'dot-ok':'dot-bad')+'"></span> '+(ok?'OK':'Down');
    show(data);
  }catch(e){
    badg.innerHTML = 'Status: <span class="dot dot-bad"></span> Error';
    show({ error:String(e) });
  }
}

// ---- Advanced (may 404 if not implemented server-side) ----
async function runSecurityScan(){
  const target = encodeURIComponent(document.getElementById("secTarget").value || "public");
  if (demo()){ show({ demo:true, target, findings:[ {id:"CORS-001",severity:"low"}, {id:"TLS-VER",severity:"info"} ]}); return; }
  try{
    const r = await fetch(`${BASE_URL.replace('/pauhu/v1','')}/security/scan?target=${target}`);
    show(r.ok ? await r.json() : { error:`Security scan HTTP ${r.status}` });
  }catch(e){ show({ error:String(e) }); }
}

async function getCompliance(){
  const scope = encodeURIComponent(document.getElementById("compScope").value || "ai");
  if (demo()){ show({ demo:true, scope, ai_act:{ disclosures:true, logs:true, hilt:true } }); return; }
  try{
    const r = await fetch(`${BASE_URL.replace('/pauhu/v1','')}/compliance/report?scope=${scope}`);
    show(r.ok ? await r.json() : { error:`Compliance HTTP ${r.status}` });
  }catch(e){ show({ error:String(e) }); }
}

async function runBackupDrill(){
  if (demo()){ show({ demo:true, started:true, note:"DR drill simulated" }); return; }
  try{
    const r = await fetch(`${BASE_URL.replace('/pauhu/v1','')}/backup/drill`, { method:"POST" });
    show(r.ok ? await r.json() : { error:`Backup HTTP ${r.status}` });
  }catch(e){ show({ error:String(e) }); }
}

async function getExplanation(){
  const q = document.getElementById("explainQ").value || "Explain the optimization decision.";
  if (demo()){ show({ demo:true, explanation:"Load was shifted to off-peak to reduce €/MWh while keeping reserve margins."}); return; }
  const body = {
    model:"gpt-4o-mini",
    messages:[
      { role:"system", content:"Explain energy cost optimization decisions clearly and concisely." },
      { role:"user", content:q }
    ]
  };
  try{
    const r = await fetch(`${BASE_URL}/chat/completions`, {
      method:"POST", headers:{ "Content-Type":"application/json" },
      body: JSON.stringify(body)
    });
    if(!r.ok){ show({ error:`Explainer HTTP ${r.status}` }); return; }
    const j = await r.json(); const text = j?.choices?.[0]?.message?.content ?? j;
    show({ explanation:text });
  }catch(e){ show({ error:String(e) }); }
}

// ---- ROI: € Savings Today ----
function calcSavings(){
  const off = parseFloat(document.getElementById('priceOff').value || '0');   // €/MWh
  const peak= parseFloat(document.getElementById('pricePeak').value || '0'); // €/MWh
  const kwh = parseFloat(document.getElementById('shiftKwh').value || '0');  // kWh
  const mwh = kwh / 1000.0;
  const delta = (peak - off) * mwh; // € saved by shifting from peak to off-peak
  const out = {
    inputs: { off_peak_eur_mwh: off, peak_eur_mwh: peak, shifted_kwh: kwh },
    result: { saved_eur_today: Math.round(delta) }
  };
  document.getElementById('savingsOut').textContent = JSON.stringify(out, null, 2);
}

// ---- Outage Drill (works in Demo Mode too) ----
async function triggerOutage(){
  const feeder = document.getElementById('feederId').value || 'FEEDER-X';
  if (demo()){
    const res = {
      drill: true,
      feeder_id: feeder,
      event_logged: true,
      reliability: 'green',
      note: 'Outage isolated; response path healthy; compliance log written.'
    };
    document.getElementById('outageOut').textContent = JSON.stringify(res, null, 2);
    const badg = document.getElementById('healthBadge');
    badg.innerHTML = 'Status: <span class="dot dot-ok"></span> OK (drill)';
    return;
  }
  try{
    const r = await fetch(`${BASE_URL.replace('/pauhu/v1','')}/reliability/outage-drill`, {
      method: 'POST', headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({ feeder_id: feeder })
    });
    const j = r.ok ? await r.json() : { error: `HTTP ${r.status}` };
    document.getElementById('outageOut').textContent = JSON.stringify(j, null, 2);
    const badg = document.getElementById('healthBadge');
    badg.innerHTML = r.ok ? 'Status: <span class="dot dot-ok"></span> OK (drill)'
                          : 'Status: <span class="dot dot-bad"></span> Error';
  }catch(e){
    document.getElementById('outageOut').textContent = JSON.stringify({ error: String(e) }, null, 2);
    const badg = document.getElementById('healthBadge');
    badg.innerHTML = 'Status: <span class="dot dot-bad"></span> Error';
  }
}

// Initial health ping
setTimeout(checkHealth, 300);
