// Sidebar
const sidebar = document.getElementById("sidebar");
const toggle = document.getElementById("sidebarToggle");
toggle.onclick = () => sidebar.classList.toggle("open");

// Panels
const panels = document.querySelectorAll(".panel");
document.querySelectorAll(".sidebar a").forEach(link => {
  link.addEventListener("click", e => {
    e.preventDefault();

    // CLOSE SIDEBAR (FIXES YOUR BUG)
    sidebar.classList.remove("open");

    const target = link.dataset.panel;
    panels.forEach(p => p.classList.remove("active"));
    document.getElementById(target).classList.add("active");
  });
});

// Default panel
document.getElementById("slopePanel").classList.add("active");

/* -------- Slope Calculator -------- */
document.getElementById("calculateBtn").onclick = () => {
  const he = parseFloat(he.value);
  const le = parseFloat(le.value);
  const d = parseFloat(distance.value);
  const s = parseFloat(slope.value);

  if ([he,le,d,s].filter(v => !isNaN(v)).length < 3) {
    result.textContent = "Fill any 3 values";
    return;
  }

  if (isNaN(s)) slope.value = (((he-le)/d)*100).toFixed(2);
  else if (isNaN(d)) distance.value = ((he-le)/(s/100)).toFixed(2);
  else if (isNaN(he)) he.value = (le + d*(s/100)).toFixed(2);
  else if (isNaN(le)) le.value = (he - d*(s/100)).toFixed(2);

  result.textContent = "Calculated ✔";
};

/* -------- GOOGLE MAP (FAST) -------- */
let map, drawingManager, shapes = [];

function initMap() {
  map = new google.maps.Map(document.getElementById("map"), {
    center: { lat: 20.5937, lng: 78.9629 },
    zoom: 5,
    mapTypeId: "satellite", // FAST + native
    gestureHandling: "greedy"
  });

  drawingManager = new google.maps.drawing.DrawingManager({
    drawingControl: true,
    drawingControlOptions: {
      drawingModes: ["polygon", "rectangle", "polyline"]
    }
  });
  drawingManager.setMap(map);

  google.maps.event.addListener(drawingManager, "overlaycomplete", e => {
    shapes.push(e.overlay);
  });
}

document.getElementById("clearShapes").onclick = () => {
  shapes.forEach(s => s.setMap(null));
  shapes = [];
};

window.onload = initMap;