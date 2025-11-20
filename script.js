/* -------------- Utility: Toast & Loading -------------- */
function showToast(msg, time=3500){
  const t = document.getElementById('toast');
  t.textContent = msg; t.style.display = 'block';
  clearTimeout(t._to); t._to = setTimeout(()=> t.style.display='none', time);
}
function showLoading(text="Working...", showProgress=false){
  const ov = document.getElementById('loadingOverlay');
  document.getElementById('loadingText').textContent = text;
  document.getElementById('progressBar').style.display = showProgress ? 'block' : 'none';
  document.getElementById('progressFill').style.width = '0%';
  ov.style.display='flex';
}
function setProgress(p){ document.getElementById('progressFill').style.width = Math.max(0,Math.min(100,p)) + '%'; }
function hideLoading(){ document.getElementById('loadingOverlay').style.display='none'; }

/* -------------- Basic UI & Sidebar toggle -------------- */
const sidebar = document.getElementById('sidebar');
const sidebarToggle = document.getElementById('sidebarToggle');
const mainContent = document.getElementById('mainContent');
sidebarToggle.addEventListener('click', ()=>{
  sidebar.classList.toggle('open'); mainContent.classList.toggle('shifted');
});
// auto collapse on link
sidebar.querySelectorAll('a').forEach(a=>{
  a.addEventListener('click', ()=> {
    sidebar.classList.remove('open'); mainContent.classList.remove('shifted');
  });
});

/* -------------- Slope Calculator Enhancements -------------- */
const heEl = document.getElementById('he'), leEl = document.getElementById('le'), distEl = document.getElementById('distance');
const slopeEl = document.getElementById('slope'), precisionEl = document.getElementById('decimalSelect');
const unitSel = document.getElementById('distanceUnit');
const calcBtn = document.getElementById('calculateBtn'), resetBtn = document.getElementById('resetBtn');
const resultDiv = document.getElementById('result'), historyUl = document.getElementById('calcHistory');
const saveCalcBtn = document.getElementById('saveCalcBtn'), exportPdfBtn = document.getElementById('exportPdfBtn');

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
  const p = parseInt(precisionEl.value);
  const s = (1 / Math.pow(10,p)).toFixed(p);
  [heEl,leEl,distEl,slopeEl].forEach(i=> i.step = s);
}
precisionEl.addEventListener('change', updateStep);
updateStep();

function calculateSlope(){
  const precision = parseInt(precisionEl.value);
  const he = parseFloat(heEl.value);
  const le = parseFloat(leEl.value);
  const dist = parseFloat(distEl.value);
  const slope = parseFloat(slopeEl.value);
  const unit = unitSel.value;

  const provided = [!isNaN(he),!isNaN(le),!isNaN(dist),!isNaN(slope)].filter(Boolean).length;
  if (provided < 3){ resultDiv.textContent = '⚠️ Please fill at least 3 fields.'; resultDiv.style.color='crimson'; return; }

  try{
    let outText = '';
    if (isNaN(slope)){
      // slope = (he - le)/distance * 100
      const dMeters = toMeters(dist, unit);
      const calcSlope = ((he - le) / dMeters) * 100;
      slopeEl.value = calcSlope.toFixed(precision);
      outText = `Slope = ${calcSlope.toFixed(precision)}%`;
    } else if (isNaN(dist)){
      const calcDistanceM = (he - le) / (slope/100);
      const calcDistance = fromMeters(calcDistanceM, unit);
      distEl.value = calcDistance.toFixed(precision);
      outText = `Distance = ${calcDistance.toFixed(precision)} ${unit}`;
    } else if (isNaN(he)){
      const calcHE = le + (toMeters(dist, unit) * slope / 100);
      heEl.value = calcHE.toFixed(precision);
      outText = `HE = ${calcHE.toFixed(precision)}`;
    } else if (isNaN(le)){
      const calcLE = he - (toMeters(dist, unit) * slope / 100);
      leEl.value = calcLE.toFixed(precision);
      outText = `LE = ${calcLE.toFixed(precision)}`;
    } else {
      outText = 'All fields filled. Adjust one to recalc.';
    }
    resultDiv.style.color='green'; resultDiv.textContent = outText;
    addToTempHistory({ he:heEl.value, le:leEl.value, dist:distEl.value, unit:unit, slope:slopeEl.value });
    renderHistory();
    drawSlopeChart();
  }catch(e){
    resultDiv.textContent = '⚠️ Error during calculation'; resultDiv.style.color='crimson';
  }
}
calcBtn.addEventListener('click', calculateSlope);
resetBtn.addEventListener('click', ()=>{
  [heEl,leEl,distEl,slopeEl].forEach(i=> i.value=''); resultDiv.textContent=''; document.getElementById('slopeChart') && clearChart();
});

/* History in localStorage */
const HIST_KEY = 'slope_calc_history';
function addToTempHistory(entry){
  const arr = JSON.parse(localStorage.getItem(HIST_KEY) || '[]');
  arr.unshift({time:Date.now(), ...entry});
  while(arr.length > 30) arr.pop();
  localStorage.setItem(HIST_KEY, JSON.stringify(arr));
}
function renderHistory(){
  const arr = JSON.parse(localStorage.getItem(HIST_KEY) || '[]');
  historyUl.innerHTML = '';
  arr.forEach((h, idx) => {
    const li = document.createElement('li');
    li.innerHTML = `<span>${new Date(h.time).toLocaleString()} — Slope: ${h.slope || '—'}% — Dist: ${h.dist || '—'}${h.unit||''}</span>
                    <button data-idx="${idx}" class="loadHistoryBtn">Load</button>`;
    historyUl.appendChild(li);
  });
  document.querySelectorAll('.loadHistoryBtn').forEach(b=>{
    b.addEventListener('click', (ev)=>{
      const idx = +ev.target.dataset.idx; const arr = JSON.parse(localStorage.getItem(HIST_KEY) || '[]');
      const h = arr[idx]; if (!h) return;
      heEl.value = h.he; leEl.value = h.le; distEl.value = h.dist; slopeEl.value = h.slope; unitSel.value = h.unit || 'm'; showToast('Loaded from history');
    });
  });
}
renderHistory();

/* Chart (elevation line mock) */
let slopeChart=null;
function drawSlopeChart(){
  const h = parseFloat(heEl.value), l = parseFloat(leEl.value), d = parseFloat(distEl.value);
  if (isNaN(h) || isNaN(l) || isNaN(d)) { document.getElementById('slopeGraphHolder').style.display='none'; return; }
  document.getElementById('slopeGraphHolder').style.display='block';
  const ctx = document.getElementById('slopeChart').getContext('2d');
  if (slopeChart) slopeChart.destroy();
  const labels = [];
  const data = [];
  const steps = 10;
  for (let i=0;i<=steps;i++){ labels.push(((i/steps)*d).toFixed(2)); data.push((l + (i/steps)*(h-l)).toFixed(2)); }
  slopeChart = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets: [{ label:'Elevation', data, fill:true, tension:0.3 }]},
    options: { responsive:true, plugins:{legend:{display:false}}}
  });
}
function clearChart(){ if (slopeChart){ slopeChart.destroy(); slopeChart=null; } }

/* Save calculation as "projected note" */
saveCalcBtn.addEventListener('click', ()=>{
  const entry = { he:heEl.value, le:leEl.value, dist:distEl.value, slope:slopeEl.value, unit:unitSel.value, time:Date.now() };
  addProjectItem({ type:'calc', name:`Calc ${new Date().toLocaleString()}`, data:entry });
  showToast('Calculation saved into project list');
});

/* Export PDF using jsPDF */
exportPdfBtn.addEventListener('click', async ()=>{
  showLoading('Generating PDF...');
  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({unit:'pt', format:'a4'});
    doc.setFontSize(14); doc.text('Slope Calculation', 40, 50);
    doc.setFontSize(11); doc.text(`HE: ${heEl.value}`, 40, 80); doc.text(`LE: ${leEl.value}`, 200, 80);
    doc.text(`Distance: ${distEl.value} ${unitSel.value}`, 40, 100); doc.text(`Slope: ${slopeEl.value}%`, 200, 100);
    // chart: render canvas image if exists
    if (slopeChart){
      const canvas = document.getElementById('slopeChart');
      const img = canvas.toDataURL('image/png');
      doc.addImage(img, 'PNG', 40, 130, 500, 200);
    }
    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'slope_report.pdf'; a.click();
    showToast('PDF ready');
  } catch (e){
    showToast('PDF generation failed');
  } finally { hideLoading(); }
});

/* -------------- Volume & Angle buttons -------------- */
document.getElementById('volCalcBtn').addEventListener('click', ()=>{
  const L = parseFloat(document.getElementById('volLength').value) || 0;
  const W = parseFloat(document.getElementById('volWidth').value) || 0;
  const D = parseFloat(document.getElementById('volDepth').value) || 0;
  const vol = L*W*D;
  document.getElementById('volResult').textContent = `Volume = ${vol.toFixed(3)} cubic units`;
});

/* Angle tool (works with markers on the map) */
document.getElementById('getAngleBtn') && document.getElementById('getAngleBtn').addEventListener('click', ()=>{
  const res = getAngleFromMarkers();
  document.getElementById('angleResult').textContent = res ? `Angle: ${res.toFixed(3)}°` : 'Need 3 markers on the map';
});
document.getElementById('clearMarkersBtn') && document.getElementById('clearMarkersBtn').addEventListener('click', ()=>{
  clearAllMapMarkers(); showToast('Markers cleared');
});

/* -------------- Projects (localStorage) -------------- */
const PROJECTS_KEY = 'geo_projects';
function listProjects(){ const arr = JSON.parse(localStorage.getItem(PROJECTS_KEY)||'[]'); const ul = document.getElementById('projectsList'); ul.innerHTML=''; arr.forEach((p,idx)=>{ const li=document.createElement('li'); li.innerHTML=`<strong>${p.name}</strong> <button data-i="${idx}" class="loadProj">Load</button> <button data-i="${idx}" class="delProj">Delete</button>`; ul.appendChild(li); }); 
  document.querySelectorAll('.loadProj').forEach(b=> b.addEventListener('click', e=> { const idx=+e.target.dataset.i; loadProject(idx); }));
  document.querySelectorAll('.delProj').forEach(b=> b.addEventListener('click', e=> { const idx=+e.target.dataset.i; deleteProject(idx); }));
}
function addProjectItem(item){
  const arr = JSON.parse(localStorage.getItem(PROJECTS_KEY)||'[]'); arr.unshift({name:item.name || `Project ${new Date().toLocaleString()}`, created:Date.now(), items:[item]}); localStorage.setItem(PROJECTS_KEY, JSON.stringify(arr)); listProjects();
}
function saveProject(name, data){
  const arr = JSON.parse(localStorage.getItem(PROJECTS_KEY)||'[]'); arr.unshift({name, created:Date.now(), items:data}); localStorage.setItem(PROJECTS_KEY, JSON.stringify(arr)); listProjects();
}
function loadProject(idx){
  const arr = JSON.parse(localStorage.getItem(PROJECTS_KEY)||'[]'); const p=arr[idx]; if (!p) return; // if contains shapes, restore
  showToast(`Loaded project: ${p.name}`);
}
function deleteProject(idx){ const arr=JSON.parse(localStorage.getItem(PROJECTS_KEY)||'[]'); arr.splice(idx,1); localStorage.setItem(PROJECTS_KEY, JSON.stringify(arr)); listProjects(); }
document.getElementById('saveProjectBtn') && document.getElementById('saveProjectBtn').addEventListener('click', ()=>{
  const n = document.getElementById('projectName').value || `Project ${new Date().toLocaleString()}`;
  // Save simple: store markers + drawn shapes + recent calculation
  const shapes = drawnItems ? drawnItems.toGeoJSON() : null;
  const markers = mapMarkers.map(m => ({lat:m.getLatLng().lat, lng:m.getLatLng().lng, label:m.options.title || ''}));
  const calc = { he:heEl.value, le:leEl.value, dist:distEl.value, slope:slopeEl.value, unit:unitSel.value };
  saveProject(n, { shapes, markers, calc });
});
document.getElementById('loadProjectBtn') && document.getElementById('loadProjectBtn').addEventListener('click', ()=> listProjects());
listProjects();

/* -------------- Map / Leaflet features -------------- */
let map = null;
let drawnItems = null;
let drawControl = null;
let measuring = null;
let measureLayer = null;
let mapMarkers = [];
let selectedShape = null;

function initMap(){
  map = L.map('map',{minZoom:2}).setView([20.5937,78.9629],5);
  // base layers
  const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{ maxZoom:19, attribution:'© OpenStreetMap' });
  const topo = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',{ maxZoom:17, attribution:'© OpenTopoMap' });
  const carto = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',{ maxZoom:19, attribution:'© Carto' });

  osm.addTo(map);

  // drawing
  drawnItems = new L.FeatureGroup(); map.addLayer(drawnItems);
  drawControl = new L.Control.Draw({
    edit: { featureGroup: drawnItems },
    draw: { polygon:true, rectangle:true, polyline:true, circle:true, marker:true }
  });
  map.addControl(drawControl);

  map.on(L.Draw.Event.CREATED, function (e) {
    const layer = e.layer;
    drawnItems.addLayer(layer);
    selectedShape = layer;
    updateSelectionInfo();
  });
  map.on(L.Draw.Event.EDITED, function(){ updateSelectionInfo(); });
  map.on(L.Draw.Event.DELETED, function(){ selectedShape = null; updateSelectionInfo(); });

  // latlng display
  map.on('mousemove', function(e){ document.getElementById('cursorLatLng').textContent = `Lat: ${e.latlng.lat.toFixed(5)}, Lng: ${e.latlng.lng.toFixed(5)}`; });

  // add click to place markers
  map.on('click', function(e){
    // if ctrl pressed, add marker
    if (window._markerAddMode) {
      const m = L.marker(e.latlng, { draggable:true, title: `M${mapMarkers.length+1}` }).addTo(map);
      m.bindPopup(`<input placeholder="Label" id="label-${Date.now()}" style="width:120px"/> <button class="saveLabel">Save</button>`);
      mapMarkers.push(m);
      m.on('popupopen', ()=> {
        document.querySelectorAll('.saveLabel').forEach(btn=>{
          btn.onclick = function(){ const inp = this.previousElementSibling; m.bindTooltip(inp.value, {permanent:true}).openTooltip(); m.closePopup(); };
        });
      });
    }
  });

  // simple layer switcher via basemapSelect
  const basemapSelect = document.getElementById('basemapSelect');
  basemapSelect.addEventListener('change', function(){
    const val = this.value;
    // remove existing tile layers
    map.eachLayer(l=>{
      if (l instanceof L.TileLayer) map.removeLayer(l);
    });
    if (val==='osm'){ osm.addTo(map); }
    else if (val==='terrain'){ topo.addTo(map); }
    else if (val==='carto'){ carto.addTo(map); }
    else {
      // If user selects satellite: still show OSM as viewer; server export can request satellite imagery when exporting (Google)
      osm.addTo(map);
      showToast('Satellite preview uses server export (Google) for final image.');
    }
  });

  // measure / turf
  measureLayer = new L.LayerGroup().addTo(map);
}
initMap();

/* Toggle measure buttons */
document.getElementById('measureAreaBtn').addEventListener('click', ()=>{
  window._measureMode = window._measureMode === 'area' ? null : 'area'; showToast(window._measureMode ? 'Draw polygon to measure area' : 'Area measure off');
});
document.getElementById('measureDistBtn').addEventListener('click', ()=>{
  window._measureMode = window._measureMode === 'dist' ? null : 'dist'; showToast(window._measureMode ? 'Draw polyline to measure distance' : 'Distance measure off');
});

// After draw event, compute area/distance:
map.on(L.Draw.Event.CREATED, function(e){
  const layer = e.layer;
  if (layer instanceof L.Polygon && window._measureMode === 'area'){
    const geo = layer.toGeoJSON();
    const area = turf.area(geo); // m^2
    const km2 = area / 1e6;
    showToast(`Area: ${area.toFixed(2)} m² (${km2.toFixed(4)} km²)`);
  } else if (layer instanceof L.Polyline && window._measureMode === 'dist'){
    const coords = layer.getLatLngs();
    let d = 0;
    for (let i=1;i<coords.length;i++) d += coords[i].distanceTo(coords[i-1]);
    showToast(`Distance: ${d.toFixed(2)} m (${(d/1000).toFixed(3)} km)`);
  }
});

/* Export functions: PNG via html2canvas / GeoJSON / KML / Geo-referenced ZIP (calls server) */
document.getElementById('exportBtn').addEventListener('click', async ()=>{
  const type = document.getElementById('exportType').value;
  const selected = getSelectedFeatureGeoJSON();
  if (!selected) { showToast('Draw or select a shape first'); return; }

  if (type === 'png'){
    await exportMapPNG(selected);
  } else if (type === 'geojson'){
    const blob = new Blob([JSON.stringify(selected)], { type:'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href=url; a.download='selection.geojson'; a.click();
    showToast('GeoJSON saved');
  } else if (type === 'kml'){
    const kml = geojsonToKML(selected);
    const blob = new Blob([kml], { type:'application/vnd.google-earth.kml+xml' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'selection.kml'; a.click();
    showToast('KML saved');
  } else if (type === 'georef'){
    // call server to stitch Google tiles -> returns zip
    await exportGeoReferencedZip(selected);
  }
});

/* Helper to get selected shape's GeoJSON: if user drew, select first layer in drawnItems */
function getSelectedFeatureGeoJSON(){
  if (!drawnItems) return null;
  const layers = drawnItems.getLayers();
  if (!layers || layers.length === 0) return null;
  // prefer the last added/edited
  const layer = layers[layers.length-1];
  return layer.toGeoJSON();
}

/* Export map viewport or selected area to PNG using html2canvas (client-side) */
async function exportMapPNG(geojson){
  try {
    showLoading('Rendering PNG (client)...');
    // Option: zoom to selection
    // We will capture the map container
    const mapEl = document.getElementById('map');
    // temporarily hide control overlays to get clean image
    const canvas = await html2canvas(mapEl, {useCORS:true, scale:2});
    const blob = await (new Promise(res => canvas.toBlob(res,'image/png')));
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href=url; a.download='map_capture.png'; a.click();
    showToast('PNG ready');
  } catch (e){ showToast('PNG export failed'); }
  finally { hideLoading(); }
}

/* Geo-referenced ZIP: sends bbox + polygon to server endpoint /export for native stitching
   The server should accept POST /export with body { provider:'google', zoom, bbox, polygon, mapType, format:'georef' }
   and return a zip (application/zip). The server bundle we prepared earlier implements /export.
*/
async function exportGeoReferencedZip(geojson){
  const bounds = L.geoJSON(geojson).getBounds();
  const bbox = { north: bounds.getNorth(), south: bounds.getSouth(), east: bounds.getEast(), west: bounds.getWest() };
  const polygon = geojson.geometry.coordinates[0].map(c => [c[1], c[0]]); // convert [lng,lat] -> [lat,lng]
  const zoom = map.getZoom();
  const mapType = document.getElementById('basemapSelect').value || 'roadmap';
  showLoading('Requesting server stitch (this may take a while)...', true);
  try {
    const resp = await fetch('/export', {
      method:'POST',
      headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify({ provider:'google', zoom, bbox, polygon, mapType, format:'geotiff' })
    });
    if (!resp.ok) {
      const j = await resp.json().catch(()=>({error:'Server error'}));
      throw new Error(j.error || 'Export failed on server');
    }
    const blob = await resp.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `map_georef_${Date.now()}.zip`; a.click();
    showToast('Geo-referenced ZIP downloaded');
  } catch (e){ showToast('Server export failed: '+ e.message); }
  finally { hideLoading(); }
}

/* Convert GeoJSON to simple KML (basic polygon/lines) */
function geojsonToKML(geojson){
  const toCoords = (coords) => coords.map(c => `${c[0]},${c[1]},0`).join(' ');
  let kml = `<?xml version="1.0" encoding="UTF-8"?>\n<kml xmlns="http://www.opengis.net/kml/2.2"><Document>\n`;
  geojson.features ? (geojson.features||[]).forEach((f, idx)=>{
    const g = f.geometry; if (g.type === 'Polygon'){
      kml += `<Placemark><name>poly-${idx}</name><Polygon><outerBoundaryIs><LinearRing><coordinates>${g.coordinates[0].map(c=>c.join(',')).join(' ')}</coordinates></LinearRing></outerBoundaryIs></Polygon></Placemark>\n`;
    } else if (g.type === 'LineString'){
      kml += `<Placemark><name>line-${idx}</name><LineString><coordinates>${g.coordinates.map(c=>c.join(',')).join(' ')}</coordinates></LineString></Placemark>\n`;
    }
  }) : (function(){ const g=geojson.geometry; if (g.type==='Polygon'){ kml+=`<Placemark><Polygon><outerBoundaryIs><LinearRing><coordinates>${g.coordinates[0].map(c=>c.join(',')).join(' ')}</coordinates></LinearRing></outerBoundaryIs></Polygon></Placemark>`}})();
  kml += '</Document></kml>'; return kml;
}

/* Convert selected markers into angle measurement */
function getAngleFromMarkers(){
  if (mapMarkers.length < 3) { return null; }
  const a = mapMarkers[mapMarkers.length-3].getLatLng();
  const b = mapMarkers[mapMarkers.length-2].getLatLng();
  const c = mapMarkers[mapMarkers.length-1].getLatLng();
  const bearing = (p1,p2)=> {
    const dLon = (p2.lng-p1.lng) * Math.PI/180;
    const y = Math.sin(dLon)*Math.cos(p2.lat*Math.PI/180);
    const x = Math.cos(p1.lat*Math.PI/180)*Math.sin(p2.lat*Math.PI/180) - Math.sin(p1.lat*Math.PI/180)*Math.cos(p2.lat*Math.PI/180)*Math.cos(dLon);
    return Math.atan2(y,x) * 180/Math.PI;
  };
  const ba = bearing(b,a), bc = bearing(b,c);
  let angle = Math.abs(bc - ba);
  if (angle > 180) angle = 360 - angle;
  return angle;
}
function clearAllMapMarkers(){ mapMarkers.forEach(m=> map.removeLayer(m)); mapMarkers = []; }

/* -------------- Elevation profile (calls Google Elevation API if key provided) -------------- */
document.getElementById('elevProfileBtn').addEventListener('click', async ()=>{
  const key = document.getElementById('elevKey').value.trim();
  const sel = getSelectedFeatureGeoJSON();
  if (!sel) { showToast('Draw a polyline or polygon first'); return; }
  // sample coordinates along the shape
  const coords = sel.geometry.type === 'LineString' ? sel.geometry.coordinates : sel.geometry.coordinates[0];
  // create sample points (up to 100)
  const pts = [];
  const total = coords.length;
  for (let i=0;i<Math.min(total,100);i++){
    const c = coords[Math.floor(i*(total-1)/Math.min(total,100))];
    pts.push({lat: c[1], lng: c[0]});
  }
  if (!key){ showToast('Provide Google Elevation API key to fetch real profile'); return; }
  showLoading('Fetching elevation samples...', true);
  try {
    // Google Elevation accepts locations param (limit ~512), but safe usage: batch
    const locations = pts.map(p=> `${p.lat},${p.lng}`).join('|');
    const url = `https://maps.googleapis.com/maps/api/elevation/json?locations=${encodeURIComponent(locations)}&key=${encodeURIComponent(key)}`;
    const resp = await fetch(url);
    const json = await resp.json();
    if (json.status !== 'OK'){ throw new Error(json.status || 'Elevation API error'); }
    const elevs = json.results.map(r=> r.elevation);
    // draw chart modal (reuse slopeChart)
    showElevationChart(elevs);
    showToast('Elevation profile ready');
  } catch (e){ showToast('Elevation failed: '+ e.message); }
  finally { hideLoading(); }
});
function showElevationChart(values){
  // reuse modal area: draw in slopeChart if present; otherwise create
  document.getElementById('slopeGraphHolder').style.display = 'block';
  const ctx = document.getElementById('slopeChart').getContext('2d');
  if (slopeChart) slopeChart.destroy();
  slopeChart = new Chart(ctx, { type:'line', data:{ labels: values.map((_,i)=>i+1), datasets:[{label:'Elevation (m)', data:values, fill:true}]}, options:{responsive:true}});
}

/* -------------- Helpers & Initialization -------------- */
// update selection info
function updateSelectionInfo(){
  const sel = getSelectedFeatureGeoJSON();
  if (!sel) return document.getElementById('selectionInfo').textContent = 'Select a shape (draw) to measure / export.';
  // compute area or length
  if (sel.geometry.type === 'Polygon'){
    const area = turf.area(sel); document.getElementById('selectionInfo').textContent = `Area: ${area.toFixed(2)} m²`;
  } else if (sel.geometry.type === 'LineString'){
    const l = turf.length(sel, {units:'meters'}); document.getElementById('selectionInfo').textContent = `Length: ${l.toFixed(2)} m`;
  } else {
    document.getElementById('selectionInfo').textContent = `Type: ${sel.geometry.type}`;
  }
}

/* Init tool navigation */
function showPanel(id){
  ['slopePanel','mapsPanel','volumePanel','anglePanel','projectsPanel'].forEach(p=> document.getElementById(p).style.display = 'none');
  document.getElementById(id).style.display = 'block';
}
document.getElementById('slopeTool').addEventListener('click', ()=> showPanel('slopePanel'));
document.getElementById('mapsTool').addEventListener('click', ()=> showPanel('mapsPanel'));
document.getElementById('volumeTool').addEventListener('click', ()=> showPanel('volumePanel'));
document.getElementById('angleTool').addEventListener('click', ()=> showPanel('anglePanel'));
document.getElementById('projectsTool').addEventListener('click', ()=> showPanel('projectsPanel'));

/* startup */
window.addEventListener('load', ()=>{
  renderHistory();
  showPanel('slopePanel');
});