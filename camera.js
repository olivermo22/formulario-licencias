/* ============================================================
   VARIABLES GLOBALES
============================================================ */
let stream = null;
let capturedBlob = null;
let captureMode = "rostro"; // "rostro" o "documento"

/* ============================================================
   LOADER
============================================================ */
function showLoader() {
    document.getElementById("loader").style.display = "flex";
}
function hideLoader() {
    document.getElementById("loader").style.display = "none";
}

/* ============================================================
   RESET UI
============================================================ */
function resetCameraUI() {
    // Estos elementos SÍ existen en la versión A
    document.getElementById("preview-area").style.display = "none";
    document.getElementById("camera").style.display = "block";
    document.getElementById("btn-capture").style.display = "block";
    document.getElementById("btn-close").style.display = "block";

    if (captureMode === "rostro") {
        document.getElementById("overlay").src = "silhouette.png";
        document.getElementById("overlay").style.display = "block";
    } else {
        document.getElementById("overlay").style.display = "none";
    }
}

/* ============================================================
   ABRIR CÁMARA ROSTRO
============================================================ */
function openCamera() {
    captureMode = "rostro";
    capturedBlob = null;
    resetCameraUI();

    document.getElementById("camera-modal").style.display = "block";

    navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" }
    })
    .then(s => {
        stream = s;
        document.getElementById("camera").srcObject = s;
    })
    .catch(err => {
        console.error(err);
        alert("No se pudo acceder a la cámara frontal.");
    });
}

/* ============================================================
   ABRIR CÁMARA DOCUMENTO
============================================================ */
function openCameraDoc() {
    captureMode = "documento";
    capturedBlob = null;
    resetCameraUI();

    document.getElementById("overlay").style.display = "none";
    document.getElementById("camera-modal").style.display = "block";

    navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } }
    })
    .then(s => {
        stream = s;
        document.getElementById("camera").srcObject = s;
    })
    .catch(err => {
        console.error(err);
        alert("No se pudo usar la cámara trasera. Intentando cámara frontal.");
        openCamera();
    });
}

/* ============================================================
   CAPTURAR FOTO
============================================================ */
function capture() {
    const video = document.getElementById("camera");
    const canvas = document.createElement("canvas");

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0);

    canvas.toBlob(blob => {
        capturedBlob = blob;

        document.getElementById("preview-photo").src = URL.createObjectURL(blob);

        // Ocultar elementos
        document.getElementById("camera").style.display = "none";
        document.getElementById("overlay").style.display = "none";
        document.getElementById("btn-capture").style.display = "none";
        document.getElementById("btn-close").style.display = "none";

        document.getElementById("preview-area").style.display = "flex";
    }, "image/jpeg", 0.92);
}

/* ============================================================
   ACEPTAR FOTO (SUBE AL SERVIDOR)
============================================================ */
async function acceptPhoto() {
    if (!capturedBlob) return alert("No hay foto capturada.");

    showLoader();

    try {
        const fd = new FormData();
        const fileName = captureMode === "rostro" ? "rostro.jpg" : "documento.jpg";
        fd.append("foto", capturedBlob, fileName);

        const res = await fetch("/upload", { method: "POST", body: fd });
        const data = await res.json();

        if (!data.success) return alert("Error subiendo imagen");

        if (captureMode === "rostro") {
            document.getElementById("foto_url").value = data.url;
            document.getElementById("photo-preview").style.display = "block";
            document.getElementById("final-photo").src = data.url;
        } else {
            document.getElementById("foto_documento_url").value = data.url;
            document.getElementById("photo-preview-doc").style.display = "block";
            document.getElementById("final-photo-doc").src = data.url;
        }

        closeCamera();
    } catch (err) {
        console.error(err);
    } finally {
        hideLoader();
    }
}

/* ============================================================
   REHACER FOTO
============================================================ */
function retakePhoto() {
    capturedBlob = null;
    resetCameraUI();
}

/* ============================================================
   CANCELAR
============================================================ */
function cancelPhoto() {
    capturedBlob = null;
    closeCamera();
}

/* ============================================================
   CERRAR CÁMARA
============================================================ */
function closeCamera() {
    if (stream) {
        stream.getTracks().forEach(t => t.stop());
        stream = null;
    }
    resetCameraUI();
    document.getElementById("camera-modal").style.display = "none";
}

/* ============================================================
   FIRMA DIGITAL
============================================================ */
let sigCanvas, sigCtx;
let drawing = false;
let lastX = 0;
let lastY = 0;

function openSignature() {
    document.getElementById("signature-modal").style.display = "block";

    sigCanvas = document.getElementById("signature-canvas");
    sigCtx = sigCanvas.getContext("2d");

    sigCanvas.width = sigCanvas.offsetWidth;
    sigCanvas.height = sigCanvas.offsetHeight;

    sigCtx.fillStyle = "#fff";
    sigCtx.fillRect(0, 0, sigCanvas.width, sigCanvas.height);

    sigCanvas.addEventListener("touchstart", startDraw);
    sigCanvas.addEventListener("touchmove", drawTouch);
    sigCanvas.addEventListener("touchend", stopDraw);

    sigCanvas.addEventListener("mousedown", startDraw);
    sigCanvas.addEventListener("mousemove", drawMouse);
    sigCanvas.addEventListener("mouseup", stopDraw);
}

function startDraw(e) {
    drawing = true;
    const pos = getPos(e);
    lastX = pos.x;
    lastY = pos.y;
}
function drawMouse(e) {
    if (!drawing) return;
    drawLine(e.offsetX, e.offsetY);
}

function drawTouch(e) {
    e.preventDefault();
    if (!drawing) return;
    const pos = getPos(e);
    drawLine(pos.x, pos.y);
}

function drawLine(x, y) {
    sigCtx.strokeStyle = "#000";
    sigCtx.lineWidth = 3;
    sigCtx.lineCap = "round";

    sigCtx.beginPath();
    sigCtx.moveTo(lastX, lastY);
    sigCtx.lineTo(x, y);
    sigCtx.stroke();

    lastX = x;
    lastY = y;
}

function stopDraw() {
    drawing = false;
}

function getPos(e) {
    const rect = sigCanvas.getBoundingClientRect();
    if (e.touches) {
        return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: e.offsetX, y: e.offsetY };
}

function clearSignature() {
    sigCtx.fillStyle = "#fff";
    sigCtx.fillRect(0, 0, sigCanvas.width, sigCanvas.height);
}

function closeSignature() {
    document.getElementById("signature-modal").style.display = "none";
}

/* ============================================================
   GUARDAR FIRMA
============================================================ */
async function saveSignature() {
    showLoader();

    try {
        const dataURL = sigCanvas.toDataURL("image/png");
        const blob = await (await fetch(dataURL)).blob();

        const fd = new FormData();
        fd.append("foto", blob, "firma.png");

        const res = await fetch("/upload", { method: "POST", body: fd });
        const data = await res.json();

        if (!data.success) return alert("Error subiendo firma");

        document.getElementById("firma_url").value = data.url;
        document.getElementById("signature-preview").style.display = "block";
        document.getElementById("final-signature").src = data.url;

        closeSignature();
    } catch (err) {
        console.error(err);
    } finally {
        hideLoader();
    }
}
