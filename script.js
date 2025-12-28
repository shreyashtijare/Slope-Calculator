/* -------- Load Google Maps API Dynamically -------- */
let googleMapsLoaded = false;

async function loadGoogleMaps() {
  if (googleMapsLoaded) return true;
  
  try {
    // Fetch API key from serverless function
    const response = await fetch('/api/maps-config');
    const data = await response.json();
    
    // Create and load the Google Maps script
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${data.apiKey}&libraries=geometry&libraries=drawing&v=weekly`;
    script.async = true;
    script.defer = true;
    
    // Wait for script to load
    await new Promise((resolve, reject) => {
      script.onload = () => {
        googleMapsLoaded = true;
        resolve();
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
    
    console.log('Google Maps loaded successfully');
    return true;
  } catch (error) {
    console.error('Error loading Google Maps:', error);
    return false;
  }
}

/* -------- Sidebar -------- */
const sidebar = document.getElementById("sidebar");
document.getElementById("sidebarToggle").onclick = () => {
  sidebar.classList.toggle("open");
};

/* -------- Panel Navigation -------- */
const panels = document.querySelectorAll(".panel");
let mapInitialized = false;
let map;
let drawingManager;
let activeShape = null;
let contextLatLng = null;
let distancePath = [];
let distanceLine = null;
let measuringDistance = false;

const contextMenu = document.getElementById("contextMenu");
const infoPanel = document.getElementById("infoPanel");

document.querySelectorAll(".sidebar a").forEach(link => {
  link.addEventListener("click", async (e) => {
    e.preventDefault();
    sidebar.classList.remove("open");

    panels.forEach(p => p.classList.remove("active"));
    const target = document.getElementById(link.dataset.panel);
    target.classList.add("active");

    // Initialize or resize map
    if (link.dataset.panel === "mapPanel") {
      if (!mapInitialized) {
        // Load Google Maps API first
        const loaded = await loadGoogleMaps();
        if (loaded) {
          initMap();
          mapInitialized = true;
        } else {
          alert('Failed to load Google Maps. Please check your internet connection.');
        }
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

  drawingManager = new google.maps.drawing.DrawingManager({
    drawingControl: true,
    drawingControlOptions: {
      position: google.maps.ControlPosition.TOP_CENTER,
      drawingModes: ["polygon", "rectangle"]
    },
    polygonOptions: {
      fillColor: "#007bff",
      fillOpacity: 0.25,
      strokeColor: "#007bff",
      strokeWeight: 2,
      editable: true
    },
    rectangleOptions: {
      fillColor: "#007bff",
      fillOpacity: 0.25,
      strokeColor: "#007bff",
      strokeWeight: 2,
      editable: true
    }
  });

  drawingManager.setMap(map);

  // When a shape is completed
  google.maps.event.addListener(drawingManager, "overlaycomplete", e => {
    // Remove previous shape
    if (activeShape) activeShape.setMap(null);

    activeShape = e.overlay;

    // Stop drawing mode after one shape
    drawingManager.setDrawingMode(null);
  });

  // Right-click (context menu)
  map.addListener("rightclick", e => {
    contextLatLng = e.latLng;

    contextMenu.style.left = e.pixel.x + "px";
    contextMenu.style.top = e.pixel.y + "px";
    contextMenu.style.display = "block";
  });

  // Hide menu on click
  map.addListener("click", () => {
    contextMenu.style.display = "none";

    if (measuringDistance) {
      distancePath.push(contextLatLng);
      updateDistanceLine();
    }
  });
}

// Add show/hide helpers for the info panel
function showInfo(html) {
  infoPanel.innerHTML = html;
  infoPanel.style.display = "block";
}

function hideInfo() {
  infoPanel.style.display = "none";
}

// Helper to get bounds for polygon or rectangle
function getShapeBounds(shape) {
  if (shape instanceof google.maps.Polygon) {
    const bounds = new google.maps.LatLngBounds();
    shape.getPath().forEach(latlng => bounds.extend(latlng));
    return bounds;
  } else if (shape instanceof google.maps.Rectangle) {
    return shape.getBounds();
  }
  return null;
}

// Clear drawn shape
document.getElementById("clearShape").onclick = () => {
  if (activeShape) {
    activeShape.setMap(null);
    activeShape = null;
  }
};

// Context menu actions
if (contextMenu) {
contextMenu.addEventListener("click", e => {
  const action = e.target.dataset.action;
  contextMenu.style.display = "none";

  if (!action || !contextLatLng) return;

  const lat = contextLatLng.lat();
  const lng = contextLatLng.lng();

  // 1. Coordinates
  if (action === "coords") {
    showInfo(`
      <b>Coordinates</b><br>
      Northing (Lat): ${lat.toFixed(6)}<br>
      Easting (Lng): ${lng.toFixed(6)}
    `);
  }

  // 2. Calculate Area
  if (action === "area") {
    if (!activeShape) {
      showInfo("⚠️ Draw a polygon or rectangle first.");
      return;
    }

    let area = 0;

    if (activeShape instanceof google.maps.Polygon) {
      area = google.maps.geometry.spherical.computeArea(
        activeShape.getPath()
      );
    } else if (activeShape instanceof google.maps.Rectangle) {
      const b = activeShape.getBounds();
      const sw = b.getSouthWest();
      const ne = b.getNorthEast();
      const nw = new google.maps.LatLng(ne.lat(), sw.lng());
      const se = new google.maps.LatLng(sw.lat(), ne.lng());
      area = google.maps.geometry.spherical.computeArea([sw, nw, ne, se]);
    }

    showInfo(`
      <b>Area</b><br>
      ${area.toFixed(2)} m²<br>
      ${(area / 10000).toFixed(4)} ha<br>
      ${(area * 0.000247105).toFixed(4)} acres
    `);
  }

  // 3. Start distance measure
  if (action === "startDistance") {
    measuringDistance = true;
    distancePath = [];
    if (distanceLine) distanceLine.setMap(null);
    distanceLine = new google.maps.Polyline({
      map,
      path: distancePath,
      strokeColor: "#ff0000",
      strokeWeight: 2
    });
    showInfo("📏 Distance measurement started.<br>Click to add points.");
  }

  // 4. Finish distance measure
  if (action === "finishDistance") {
    measuringDistance = false;
    const length =
      google.maps.geometry.spherical.computeLength(distancePath);
    showInfo(`
      <b>Distance</b><br>
      ${length.toFixed(2)} m<br>
      ${(length * 3.28084).toFixed(2)} ft
    `);
  }

  // 5. Export map image
  if (action === "export") {
    if (!activeShape) {
      showInfo("⚠️ Draw an area first.");
      return;
    }

    const bounds = getShapeBounds(activeShape);
    if (!bounds) {
      showInfo("⚠️ Unsupported shape.");
      return;
    }

    const ne = bounds.getNorthEast();
    const sw = bounds.getSouthWest();

    const center = {
      lat: (ne.lat() + sw.lat()) / 2,
      lng: (ne.lng() + sw.lng()) / 2
    };

    fetch("/api/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        center,
        zoom: map.getZoom(),
        mapType: map.getMapTypeId()
      })
    })
      .then(res => res.blob())
      .then(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "map_export.png";
        a.click();
      })
      .catch(() => {
        showInfo("❌ Export failed.");
      });
  }
});

function updateDistanceLine() {
  if (distanceLine) {
    distanceLine.setPath(distancePath);
  }
}
