// Detect device type
function detectDevice() {
    const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
    document.body.classList.add(isMobile ? "mobile" : "desktop");
}

// Smart slope calculator
function calculateSlope() {
    const heInput = document.getElementById("he");
    const leInput = document.getElementById("le");
    const distanceInput = document.getElementById("distance");
    const slopeInput = document.getElementById("slope");
    const resultDiv = document.getElementById("result");
    const precision = parseInt(document.getElementById("decimalSelect").value);

    const he = parseFloat(heInput.value);
    const le = parseFloat(leInput.value);
    const distance = parseFloat(distanceInput.value);
    const slope = parseFloat(slopeInput.value);

    const filled = [!isNaN(he), !isNaN(le), !isNaN(distance), !isNaN(slope)].filter(Boolean).length;

    // Must have at least 3 values to calculate the 4th
    if (filled < 3) {
        resultDiv.textContent = "⚠️ Please fill at least 3 of the 4 fields.";
        resultDiv.style.color = "red";
        return;
    }

    let resultText = "";

    try {
        if (isNaN(slope)) {
            const calcSlope = ((he - le) / distance) * 100;
            slopeInput.value = calcSlope.toFixed(precision);
            resultText = `Calculated Slope = ${calcSlope.toFixed(precision)}%`;
        } else if (isNaN(distance)) {
            const calcDistance = (he - le) / (slope / 100);
            distanceInput.value = calcDistance.toFixed(precision);
            resultText = `Calculated Distance = ${calcDistance.toFixed(precision)}`;
        } else if (isNaN(he)) {
            const calcHE = le + (distance * slope / 100);
            heInput.value = calcHE.toFixed(precision);
            resultText = `Calculated Higher Elevation = ${calcHE.toFixed(precision)}`;
        } else if (isNaN(le)) {
            const calcLE = he - (distance * slope / 100);
            leInput.value = calcLE.toFixed(precision);
            resultText = `Calculated Lower Elevation = ${calcLE.toFixed(precision)}`;
        } else {
            resultText = "All fields are filled. Adjust one to recalculate.";
        }

        resultDiv.textContent = resultText;
        resultDiv.style.color = "green";
    } catch (err) {
        resultDiv.textContent = "⚠️ Calculation error. Check your inputs.";
        resultDiv.style.color = "red";
    }
}

// Reset all fields
function resetCalculator() {
    ["he", "le", "distance", "slope"].forEach(id => document.getElementById(id).value = "");
    const resultDiv = document.getElementById("result");
    resultDiv.textContent = "";
    resultDiv.style.color = "";
}

// Dark mode toggle
function toggleDarkMode() {
    document.body.classList.toggle("dark");
    localStorage.setItem("darkMode", document.body.classList.contains("dark"));
}

// Load dark mode preference
function loadDarkModePreference() {
    const darkMode = localStorage.getItem("darkMode") === "true";
    if (darkMode) document.body.classList.add("dark");
}

// Auto-detect system dark mode
function detectSystemDarkMode() {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.body.classList.add("dark");
    }
}

// Event listeners
document.getElementById("calculateBtn").addEventListener("click", calculateSlope);
document.getElementById("resetBtn").addEventListener("click", resetCalculator);
document.getElementById("toggleDarkMode").addEventListener("click", toggleDarkMode);

// Handle Enter and Escape keys
document.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
        calculateSlope();
    } else if (event.key === "Escape") {
        resetCalculator();
    }
});

// Update input step dynamically when precision changes
document.getElementById("decimalSelect").addEventListener("change", function() {
    const step = (1 / Math.pow(10, this.value)).toFixed(this.value);
    ["he", "le", "distance", "slope"].forEach(id => {
        document.getElementById(id).step = step;
    });
});

// Initialize
window.addEventListener("load", () => {
    detectDevice();
    detectSystemDarkMode();
    loadDarkModePreference();
});
