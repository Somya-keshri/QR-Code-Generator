let imgBox = document.getElementById("imgBox");
let qrText = document.getElementById("qrText");
let downloadBtn = document.getElementById("downloadBtn");

let qrSize = document.getElementById("qrSize");
let sizeValue = document.getElementById("sizeValue");
let qrColor = document.getElementById("qrColor");
let qrBgColor = document.getElementById("qrBgColor");
let logoUpload = document.getElementById("logoUpload");

let historyList = document.getElementById("historyList");

let canvas = document.getElementById("qrCanvas");
let ctx = canvas.getContext("2d");

/*  ADDED */
let shareBtn = document.getElementById("shareBtn");

let startScanBtn = document.getElementById("startScanBtn");
let stopScanBtn = document.getElementById("stopScanBtn");

let scanner = null; // global scanner instance

// Load QR history
let qrHistory = JSON.parse(localStorage.getItem("qrHistory")) || [];

/* =========================
   THEME SYSTEM
========================= */

// Load saved theme
let currentTheme = localStorage.getItem("theme") || "light";

// Apply theme
function applyTheme(theme) {

  if (theme === "auto") {

    const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

    document.body.setAttribute("data-theme", systemDark ? "dark" : "light");

  } else {

    document.body.setAttribute("data-theme", theme);

  }

}

// Set theme (called from buttons)
function setTheme(theme) {

  currentTheme = theme;

  localStorage.setItem("theme", theme);

  applyTheme(theme);
}

// Initial load
applyTheme(currentTheme);

// Listen for system theme changes (Auto mode)
window.matchMedia("(prefers-color-scheme: dark)")
  .addEventListener("change", () => {
    if (currentTheme === "auto") {
      applyTheme("auto");
    }
  });

const themeLabel = document.getElementById("themeLabel");
const autoToggle = document.getElementById("autoToggle");

// Update label UI
function updateThemeLabel() {

  let appliedTheme;

  if (currentTheme === "auto") {
    const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    appliedTheme = isDark ? "dark" : "light";
    autoToggle.checked = true;
  } else {
    appliedTheme = currentTheme;
    autoToggle.checked = false;
  }

  const icon = document.querySelector("#themeLabel .icon");
  const text = document.querySelector("#themeLabel .text");

  if (appliedTheme === "dark") {
    icon.innerText = "☾";
    text.innerText = "Dark";
  } else {
    icon.innerText = "☀";
    text.innerText = "Light";
  }
}

// Toggle Auto mode
autoToggle.addEventListener("change", () => {

  if (autoToggle.checked) {
    setTheme("auto");
  } else {
    setTheme("light"); // fallback
  }

  updateThemeLabel();
});

// Click label → toggle light/dark manually
themeLabel.addEventListener("click", () => {

  if (currentTheme === "auto") return;

  if (currentTheme === "light") {
    setTheme("dark");
  } else {
    setTheme("light");
  }

  updateThemeLabel();
});

// Initial UI sync
updateThemeLabel();



/* =========================
   QR LOGIC (UNCHANGED)
========================= */

// Show slider value
sizeValue.innerText = qrSize.value;

qrSize.addEventListener("input", () => {
  sizeValue.innerText = qrSize.value;
});


// Save history
function saveHistory(value) {

  if (!value) return;

  qrHistory.unshift(value);

  // Remove duplicates + keep last 10
  qrHistory = [...new Set(qrHistory)].slice(0,10);

  localStorage.setItem("qrHistory", JSON.stringify(qrHistory));

  renderHistory();
}


// Render history UI
function renderHistory(){

  historyList.innerHTML = "";

  qrHistory.forEach(item => {

    const li = document.createElement("li");

    li.textContent = item;

    li.style.cursor = "pointer";

    li.onclick = () => {
      qrText.value = item;
      generateQRCode();
    };

    historyList.appendChild(li);
  });

}


function generateQRCode() {

  if (qrText.value.length === 0) {

    qrText.classList.add("error");

    setTimeout(() => {
      qrText.classList.remove("error");
    }, 1000);

    return;
  }

  let size = qrSize.value;
  let color = qrColor.value.replace("#", "");
  let bgcolor = qrBgColor.value.replace("#", "");

  const qrURL =
    "https://api.qrserver.com/v1/create-qr-code/?" +
    "size=" + size + "x" + size +
    "&color=" + color +
    "&bgcolor=" + bgcolor +
    "&data=" + encodeURIComponent(qrText.value);

  const qrImage = new Image();
  qrImage.crossOrigin = "anonymous";
  qrImage.src = qrURL;

  qrImage.onload = function () {

    canvas.width = size;
    canvas.height = size;

    ctx.clearRect(0, 0, size, size);
    ctx.drawImage(qrImage, 0, 0, size, size);

    const file = logoUpload.files[0];

    if (file) {

      const logo = new Image();
      logo.src = URL.createObjectURL(file);

      logo.onload = function () {

        const logoSize = size * 0.25;
        const x = (size - logoSize) / 2;
        const y = (size - logoSize) / 2;

        ctx.drawImage(logo, x, y, logoSize, logoSize);

      };

    }

    imgBox.classList.add("show-img");
    downloadBtn.disabled = false;

    /* ✅ ADDED */
    if (shareBtn) shareBtn.disabled = false;

    // Save QR to history
    saveHistory(qrText.value);

  };

}


// Download QR Code
downloadBtn.addEventListener("click", function () {

  const link = document.createElement("a");

  link.download = "qr-code.png";
  link.href = canvas.toDataURL("image/png");

  link.click();

});


/* =========================
   SHARE FEATURE (ADDED ONLY)
========================= */

if (shareBtn) {

  shareBtn.disabled = true;

  shareBtn.addEventListener("click", async function () {

    try {

      const dataUrl = canvas.toDataURL("image/png");

      const res = await fetch(dataUrl);
      const blob = await res.blob();

      const file = new File([blob], "qr-code.png", { type: "image/png" });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {

        await navigator.share({
          title: "QR Code",
          text: "Check out this QR Code",
          files: [file]
        });

      } else {

        alert("Sharing not supported on this device. Please download the QR.");

      }

    } catch (err) {
      console.log("Share failed:", err);
    }

  });

}

/* =========================
   QR SCANNER
========================= */

function startScanner() {

  const scanner = new Html5Qrcode("reader");

  scanner.start(
    { facingMode: "environment" }, // back camera
    {
      fps: 10,
      qrbox: 250
    },
    (decodedText) => {

  const resultBox = document.getElementById("scanResult");

  // Check if it's a URL
  if (decodedText.startsWith("http://") || decodedText.startsWith("https://")) {

    let label = "🔗 Website";

    if (decodedText.includes("docs.google.com/forms")) {
      label = "📄 Google Form";
    }

    resultBox.innerHTML = `
      <div style="
        background: rgba(255,255,255,0.1);
        padding: 12px;
        border-radius: 10px;
        margin-top: 10px;
        text-align: center;
      ">
        <p style="font-weight: 600;">${label}</p>
        <a href="${decodedText}" target="_blank" style="
          color: #6366f1;
          text-decoration: none;
          word-break: break-all;
        ">
          Open Link
        </a>
      </div>
    `;

  } else {

    // Normal text
    resultBox.innerHTML = `
      <div style="
        background: rgba(255,255,255,0.1);
        padding: 12px;
        border-radius: 10px;
        margin-top: 10px;
      ">
        <p>${decodedText}</p>
      </div>
    `;

  }

  scanner.stop();
},
    (errorMessage) => {
      // ignore scan errors
    }
  ).catch(err => {
    console.log("Camera error:", err);
  });
}

// Start scanner (optional)
function startScanner() {

  if (scanner) return; // already running

  scanner = new Html5Qrcode("reader");

  scanner.start(
    { facingMode: "environment" },
    {
      fps: 10,
      qrbox: 250
    },
    (decodedText) => {

      // your existing result logic stays SAME

      const resultBox = document.getElementById("scanResult");

      if (decodedText.startsWith("http://") || decodedText.startsWith("https://")) {

        let label = "🔗 Website";

        if (decodedText.includes("docs.google.com/forms")) {
          label = "📄 Google Form";
        }

        resultBox.innerHTML = `
          <div style="padding:10px;border-radius:10px;">
            <p>${label}</p>
            <a href="${decodedText}" target="_blank">Open Link</a>
          </div>
        `;

      } else {
        resultBox.innerHTML = `<p>${decodedText}</p>`;
      }

    },
    (errorMessage) => {}
  ).then(() => {
    startScanBtn.disabled = true;
    stopScanBtn.disabled = false;
  }).catch(err => {
    console.log(err);
  });

}


// Stop scanner (optional)
function stopScanner() {

  if (scanner) {

    scanner.stop().then(() => {
      scanner.clear();
      scanner = null;

      startScanBtn.disabled = false;
      stopScanBtn.disabled = true;

      document.getElementById("reader").innerHTML = "";

    }).catch(err => {
      console.log(err);
    });

  }

}

startScanBtn.addEventListener("click", startScanner);
stopScanBtn.addEventListener("click", stopScanner);
