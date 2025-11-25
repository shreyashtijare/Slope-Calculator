/* ----------------- Basic UI & Sidebar ----------------- */
const sidebar = document.getElementById('sidebar');
const sidebarToggle = document.getElementById('sidebarToggle');
const mainContent = document.getElementById('mainContent');
const slopeTool = document.getElementById('slopeTool');
const mapsTool = document.getElementById('mapsTool');
const slopeContainer = document.getElementById('slopeContainer');
const mapContainer = document.getElementById('mapContainer');
const backToCalc = document.getElementById('backToCalc');

sidebarToggle.addEventListener('click', () => {
  sidebar.classList.toggle('open');
  mainContent.classList.toggle('shifted');
});
slopeTool.addEventListener('click', () => {
  slopeContainer.style.display = 'block';
  mapContainer.style.display = 'none';
});
mapsTool.addEventListener('click', () => {
  slopeContainer.style.display = 'none';
  mapContainer.style.display = 'block';
});
backToCalc.addEventListener('click', () => {
  slopeContainer.style.display = 'block';
  mapContainer.style.display = 'none';
});

/* ----------------- Slope Calculator (existing) ----------------- */
const heInput = document.getElementById('he');
const leInput = document.getElementById('le');
const distanceInput = document.getElementById('distance');
const slopeInput = document.getElementById('slope');
const decimalSelect = document.getElementById('decimalSelect');
const distanceUnit = document.getElementById('distanceUnit');
const calculateBtn = document.getElementById('calculateBtn');
const resetBtn = document.getElementById('resetBtn');
const resultDiv = document.getElementById('result');

function toMeters(val, unit){
  if (unit==='m') return val;
  if (unit==='ft') return val * 0.3048;
  if (unit==='km') return val * 1000;
  if (unit==='mi') return val * 1609.344;
  return val;
}
function fromMeters(m, unit){
  if (unit==='m') return m;
  if (unit==='ft') return m / 0.3048;
  if (unit==='km') return m / 1000;
  if (unit==='mi') return m / 1609.344;
  return m;
}

function updateStep(){
  const p = parseInt(decimalSelect.value);
  const s = (1 / Math.pow(10,p)).toFixed(p);
  [heInput, leInput, distanceInput, slopeInput].forEach(i=> i.step = s);
}
decimalSelect.addEventListener('change', updateStep);
updateStep();

function calculateSlope(){
  const precision = parseInt(decimalSelect.value);
  const he = parseFloat(heInput.value);
  const le = parseFloat(leInput.value);
  const distance = parseFloat(distanceInput.value);
  const slope = parseFloat(slopeInput.value);
  const unit = distanceUnit.value;

  const filled = [!isNaN(he), !isNaN(le), !isNaN(distance), !isNaN(slope)].filter(Boolean).length;
  if (filled < 3){
    resultDiv.textContent = "⚠️ Please fill at least 3 of the 4 fields.";
    resultDiv.style.color = "red"; return;
  }

  try {
    let out = "";
    if (isNaN(slope)){
      const calcSlope = ((he - le) / toMeters(distance, unit)) * 100;
      slopeInput.value = calcSlope.toFixed(precision);
      out = `Calculated slope: ${calcSlope.toFixed(precision)}%`;
    } else if (isNaN(distance)){
      const calcDistance = (he - le) / (slope / 100);
      distanceInput.value = fromMeters(calcDistance, unit).toFixed(precision);
      out = `Calculated distance: ${distanceInput.value} ${unit}`;
    } else if (isNaN(he)){
      const calcHE = le + (toMeters(distance, unit) * slope / 100);
      heInput.value = calcHE.toFixed(precision);
      out = `Calculated HE: ${calcHE.toFixed(precision)}`;
    } else if (isNaN(le)){
      const calcLE = he - (toMeters(distance, unit) * slope / 100);
      leInput.value = calcLE.toFixed(precision);
      out = `Calculated LE: ${calcLE.toFixed(precision)}`;
    } else {
      out = "All fields filled. Adjust one to recalculate.";
    }
    resultDiv.style.color = "green"; resultDiv.textContent = out;
  } catch (e) {
    resultDiv.textContent = "⚠️ Calculation error. Check inputs.";
    resultDiv.style.color = "red";
  }
}
calculateBtn.addEventListener('click', calculateSlope);
resetBtn.addEventListener('click', () => {
  [heInput, leInput, distanceInput, slopeInput].forEach(i=> i.value='');
  resultDiv.textContent = '';
});

/* ----------------- Conversion Feature ----------------- */
/*
 Supports:
  - Percent -> ratio & angle
  - Ratio (rise:run) -> percent & angle
  - Angle (deg) -> percent & ratio
*/
const convPercent = document.getElementById('convPercent');
const convRatioRise = document.getElementById('convRatioRise');
const convRatioRun = document.getElementById('convRatioRun');
const convAngle = document.getElementById('convAngle');
const convertBtn = document.getElementById('convertBtn');
const applyBtn = document.getElementById('applyBtn');
const clearConvBtn = document.getElementById('clearConvBtn');
const convResults = document.getElementById('convResults');

function percentToRatioAndAngle(p){
  const frac = p / 100; // rise/run
  // ratio: rise:run = 1 : (1/frac) if frac != 0
  if (frac === 0) return { ratio: '0:∞', angle: 0 };
  const rise = frac;
  const run = 1;
  // normalize to simple integer-ish ratio for display
  // Represent as 1 : (1/frac) or simplified to small integers
  const runVal = 1 / frac;
  // try to find small integer ratio
  // we'll limit denominator to 20 for readability
  let best = null;
  for (let den=1; den<=50; den++){
    const num = Math.round(runVal * den);
    const r = num/den;
    if (Math.abs(r - runVal) / runVal < 0.001){
      best = { rise: 1, run: Math.round(num/den) };
      break;
    }
  }
  const ratioStr = (best) ? `1:${(runVal.toFixed(2))}` : `1:${runVal.toFixed(2)}`;
  const angle = Math.atan(frac) * 180 / Math.PI;
  return { ratio: ratioStr, angle: angle };
}

function ratioToPercentAndAngle(rise, run){
  if (run === 0) return null;
  const p = (rise / run) * 100;
  const angle = Math.atan(rise/run) * 180 / Math.PI;
  return { percent: p, angle };
}

function angleToPercentAndRatio(angleDeg){
  const angle = angleDeg * Math.PI / 180;
  const frac = Math.tan(angle); // rise/run
  const p = frac * 100;
  // show ratio as 1:(1/frac)
  const runVal = 1 / frac;
  return { percent: p, ratio: `1:${runVal.toFixed(3)}`, frac };
}

function showConvResults(text){
  convResults.innerHTML = text;
}

/* Determine selected conversion radio */
function getSelectedConvType(){
  const radios = document.getElementsByName('convType');
  for (const r of radios) if (r.checked) return r.value;
  return 'percent';
}

convertBtn.addEventListener('click', () => {
  const type = getSelectedConvType();
  if (type === 'percent'){
    const p = parseFloat(convPercent.value);
    if (isNaN(p)){ showConvResults('Enter a valid percent value'); return; }
    const out = percentToRatioAndAngle(p);
    showConvResults(`<strong>Percent:</strong> ${p.toFixed(2)}%<br><strong>Ratio (approx):</strong> ${out.ratio}<br><strong>Angle:</strong> ${out.angle.toFixed(3)}°`);
  } else if (type === 'ratio'){
    const r = parseFloat(convRatioRise.value);
    const run = parseFloat(convRatioRun.value);
    if (isNaN(r) || isNaN(run) || run === 0){ showConvResults('Enter valid rise and run (run ≠ 0)'); return; }
    const out = ratioToPercentAndAngle(r, run);
    showConvResults(`<strong>Ratio:</strong> ${r}:${run}<br><strong>Percent:</strong> ${out.percent.toFixed(3)}%<br><strong>Angle:</strong> ${out.angle.toFixed(3)}°`);
  } else if (type === 'angle'){
    const a = parseFloat(convAngle.value);
    if (isNaN(a)){ showConvResults('Enter a valid angle in degrees'); return; }
    const out = angleToPercentAndRatio(a);
    showConvResults(`<strong>Angle:</strong> ${a.toFixed(3)}°<br><strong>Percent:</strong> ${out.percent.toFixed(3)}%<br><strong>Ratio:</strong> ${out.ratio}`);
  }
});

/* Apply converted percent into main slope input */
applyBtn.addEventListener('click', () => {
  const type = getSelectedConvType();
  if (type === 'percent'){
    const p = parseFloat(convPercent.value);
    if (isNaN(p)) { showConvResults('Enter valid percent first'); return; }
    slopeInput.value = p.toFixed(2);
    showConvResults('Applied percent to Slope % field.');
  } else if (type === 'ratio'){
    const r = parseFloat(convRatioRise.value);
    const run = parseFloat(convRatioRun.value);
    if (isNaN(r) || isNaN(run) || run===0){ showConvResults('Enter valid ratio first'); return; }
    const out = ratioToPercentAndAngle(r, run);
    slopeInput.value = out.percent.toFixed(3);
    showConvResults('Converted ratio -> percent and applied to Slope % field.');
  } else if (type === 'angle'){
    const a = parseFloat(convAngle.value);
    if (isNaN(a)) { showConvResults('Enter valid angle first'); return; }
    const out = angleToPercentAndRatio(a);
    slopeInput.value = out.percent.toFixed(3);
    showConvResults('Converted angle -> percent and applied to Slope % field.');
  }
});

/* Clear conversion inputs */
clearConvBtn.addEventListener('click', ()=>{
  convPercent.value = ''; convRatioRise.value = ''; convRatioRun.value = ''; convAngle.value = '';
  convResults.innerHTML = '';
});

/* ----------------- Map (simple preview) ----------------- */
let map = null;
function initMap(){
  map = L.map('map').setView([20.5937,78.9629],5);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
    maxZoom:19, attribution:'© OpenStreetMap contributors'
  }).addTo(map);
}
window.addEventListener('load', ()=> {
  initMap();
});