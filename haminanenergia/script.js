// Backend (only when demo mode is off)
const BASE_URL = "https://api.pauhu.ai/haminanenergia/pauhu/v1";

function demo(){ const el=document.getElementById("demoMode"); return el && el.checked; }

function setBadge(ok, label){
  const b=document.getElementById("healthBadge");
  b.innerHTML = ok ? `Status: <span class="dot dot-ok"></span> ${label||'OK'}`
                   : `Status: <span class="dot dot-bad"></span> Error`;
}

/*** ROI ***/
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
  document.getElementById('previewSavings').textContent = `Saved €${Math.round(delta)}`;
}

/*** Optimizer ***/
async function getOptimization(){
  const wid = encodeURIComponent(document.getElementById("windowId").value || "pilot-window-1");
  if (demo()){
    const t = new Date().toISOString();
    const data = {
      demo:true, window_id:wid,
      recommendations:[
        { time:t, setpoint_kw: 9500, note:"Shift 02:00–04:00 to off-peak" },
        { time:t, setpoint_kw: 6000, note:"Prefer battery discharge at 18:00" }
      ]
    };
    document.getElementById("outputOpt").textContent = JSON.stringify(data, null, 2);
    document.getElementById("previewOpt").textContent = data.recommendations[0].note;
    return;
  }
  try{
    const r = await fetch(`${BASE_URL}/optimizer/recommendation?window_id=${wid}`);
    const j = await r.json();
    document.getElementById("outputOpt").textContent = JSON.stringify(j, null, 2);
    const n = (j.recommendations && j.recommendations[0] && j.recommendations[0].note) || "";
    document.getElementById("previewOpt").textContent = n;
  }catch(e){
    document.getElementById("outputOpt").textContent = JSON.stringify({ error:String(e) }, null, 2);
    document.getElementById("previewOpt").textContent = "Error";
  }
}

function showOptimizerRequest(){
  const wid = document.getElementById("windowId").value || "pilot-window-1";
  const req = {
    endpoint: "https://api.openai.com/v1/chat/completions",
    model: "gpt-4o-mini",
    messages: [
      { role:"system", content:"Optimize load shift given tariff, demand, and storage constraints." },
      { role:"user", content: `window_id=${wid}; tariffs=[45,95] EUR/MWh; demand_forecast=[...]; battery_capacity=6 MWh; constraints=[reserve margin, feeder limits]` }
    ]
  };
  document.getElementById("outputOpt").textContent = JSON.stringify(req, null, 2);
  document.getElementById("previewOpt").textContent = "AI request → OpenAI";
}

/*** Compliance ***/
async function getCompliance(){
  const scope = encodeURIComponent(document.getElementById("compScope").value || "ai");
  if (demo()){
    const data = { demo:true, scope, ai_act:{ disclosures:true, logs:true, hilt:true }, status:"pass" };
    document.getElementById("compOut").textContent = JSON.stringify(data, null, 2);
    document.getElementById("previewComp").textContent = "EU AI Act: PASS";
    setBadge(true, "Demo");
    return;
  }
  try{
    const r = await fetch(`${BASE_URL.replace('/pauhu/v1','')}/compliance/report?scope=${scope}`);
    const j = await r.json();
    document.getElementById("compOut").textContent = JSON.stringify(j, null, 2);
    document.getElementById("previewComp").textContent = j.status ? `EU AI Act: ${j.status.toUpperCase()}` : "Compliance report";
  }catch(e){
    document.getElementById("compOut").textContent = JSON.stringify({ error:String(e) }, null, 2);
    document.getElementById("previewComp").textContent = "Error";
  }
}

function showComplianceRequest(){
  const scope = document.getElementById("compScope").value || "ai";
  const req = {
    endpoint: "https://api.pauhu.ai/classify/compliance",
    model: "phi-4-compliance",
    input: {
      scope,
      event: { id:"evt-123", type:"usage", kwh:12.5, ts:new Date().toISOString() }
    }
  };
  document.getElementById("compOut").textContent = JSON.stringify(req, null, 2);
  document.getElementById("previewComp").textContent = "AI request → compliance classifier";
}

/*** Outage Drill ***/
async function triggerOutage(){
  const feeder = document.getElementById('feederId').value || 'FEEDER-X';
  if (demo()){
    const res = {
      drill: true, feeder_id: feeder, event_logged: true,
      reliability: 'green', note: 'Outage isolated; compliance log written.'
    };
    document.getElementById('outageOut').textContent = JSON.stringify(res, null, 2);
    document.getElementById('previewOutage').textContent = "Reliability: GREEN (drill)";
    setBadge(true, "OK (drill)");
    return;
  }
  try{
    const r = await fetch(`${BASE_URL.replace('/pauhu/v1','')}/reliability/outage-drill`, {
      method: 'POST', headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({ feeder_id: feeder })
    });
    const j = await r.json();
    document.getElementById('outageOut').textContent = JSON.stringify(j, null, 2);
    document.getElementById('previewOutage').textContent = j.reliability ? `Reliability: ${j.reliability.toUpperCase()}` : "Drill done";
    setBadge(true, "OK (drill)");
  }catch(e){
    document.getElementById('outageOut').textContent = JSON.stringify({ error:String(e) }, null, 2);
    document.getElementById('previewOutage').textContent = "Error";
    setBadge(false);
  }
}

/*** Initial ***/
window.addEventListener("load", () => {
  // Demo badge and immediate ROI
  if (demo()) setBadge(true, "Demo");
  calcSavings();
});
