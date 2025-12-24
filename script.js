/* -------- Sidebar -------- */
const sidebar = document.getElementById("sidebar");
document.getElementById("sidebarToggle").onclick = () => {
  sidebar.classList.toggle("open");
};

/* -------- Panel Navigation -------- */
const panels = document.querySelectorAll(".panel");
let mapInitialized = false;
let map;

document.querySelectorAll(".sidebar a").forEach(link => {
  link.addEventListener("click", e => {
    e.preventDefault();
    sidebar.classList.remove("open");

    panels.forEach(p => p.classList.remove("active"));
    const target = document.getElementById(link.dataset.panel);
    target.classList.add("active");

    // Initialize or resize map
    if (link.dataset.panel === "mapPanel") {
      if (!mapInitialized) {
        initMap();
        mapInitialized = true;
      } else {
        google.maps.event.trigger(map, "resize");
        map.setCenter(map.getCenter());
      }
    }
  });
});

/* -------- Slope Calculator -------- */
const he = document.getElementById("he");
const le = document.getElementById("le");
const distance = document.getElementById("distance");
const slope = document.getElementById("slope");
const result = document.getElementById("result");

document.getElementById("calculateBtn").onclick = () => {
  const HE = parseFloat(he.value);
  const LE = parseFloat(le.value);
  const D = parseFloat(distance.value);
  const S = parseFloat(slope.value);

  if ([HE, LE, D, S].filter(v => !isNaN(v)).length < 3) {
    result.textContent = "⚠️ Enter any 3 values.";
    return;
  }

  if (isNaN(S)) {
    slope.value = (((HE - LE) / D) * 100).toFixed(3);
    result.textContent = "Slope calculated.";
  } else if (isNaN(D)) {
    distance.value = ((HE - LE) / (S / 100)).toFixed(3);
    result.textContent = "Distance calculated.";
  } else if (isNaN(HE)) {
    he.value = (LE + D * (S / 100)).toFixed(3);
    result.textContent = "Higher elevation calculated.";
  } else if (isNaN(LE)) {
    le.value = (HE - D * (S / 100)).toFixed(3);
    result.textContent = "Lower elevation calculated.";
  }
};

document.getElementById("resetBtn").onclick = () => {
  he.value = le.value = distance.value = slope.value = "";
  result.textContent = "";
};

/* -------- Conversion -------- */
document.getElementById("convertBtn").onclick = () => {
  const p = parseFloat(convPercent.value);
  const r = parseFloat(ratioRise.value);
  const run = parseFloat(ratioRun.value);
  const a = parseFloat(convAngle.value);
  const out = document.getElementById("convResult");

  if (!isNaN(p)) {
    const angle = Math.atan(p / 100) * 180 / Math.PI;
    out.innerHTML = `${p}%<br>Ratio: 1:${(100 / p).toFixed(3)}<br>Angle: ${angle.toFixed(3)}°`;
    return;
  }

  if (!isNaN(r) && !isNaN(run)) {
    const percent = (r / run) * 100;
    const angle = Math.atan(r / run) * 180 / Math.PI;
    out.innerHTML = `${r}:${run}<br>Percent: ${percent.toFixed(3)}%<br>Angle: ${angle.toFixed(3)}°`;
    return;
  }

  if (!isNaN(a)) {
    const percent = Math.tan(a * Math.PI / 180) * 100;
    out.innerHTML = `${a}°<br>Percent: ${percent.toFixed(3)}%<br>Ratio: 1:${(100 / percent).toFixed(3)}`;
    return;
  }

  out.textContent = "⚠️ Enter a value to convert.";
};

/* -------- Google Map -------- */
function initMap() {
  map = new google.maps.Map(document.getElementById("map"), {
    center: { lat: 20.5937, lng: 78.9629 },
    zoom: 5,
    mapTypeId: "satellite",
    gestureHandling: "greedy"
  });
}
