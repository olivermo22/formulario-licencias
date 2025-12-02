/* ============================================================
   VARIABLES GLOBALES
============================================================ */
let stream;
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
   RESET DE LA UI DE LA CÁMARA
============================================================ */
function resetCameraUI() {
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
   ABRIR CÁMARA PARA ROSTRO
============================================================ */
function openCamera() {
    captureMode = "rostro";
    capturedBlob = null;
    resetCameraUI();

    document.getElementById("camera-modal").style.display = "block";

    navigator.mediaDevices.getUserMedia({
        video: {
            facingMode: "user",
            width: { ideal: 1920 },
            height: { ideal: 1080 }
        }
    })
    .then(s => {
        stream = s;
        document.getElementById("camera").srcObject = s;
    })
    .catch(err => {
        console.error(err);
        alert("No se pudo acceder a la cámara.");
    });
}

/* ============================================================
   ABRIR CÁMARA PARA DOCUMENTO
============================================================ */
 async function openCameraDoc() {
    captureMode = "documento";
    capturedBlob = null;
    resetCameraUI();
    document.getElementById("overlay").style.display = "none";
    document.getElementById("camera-modal").style.display = "block";

    try {
        const bestCameraId = await getBestBackCamera();

        const streamResult = await navigator.mediaDevices.getUserMedia({
            video: {
                deviceId: { exact: bestCameraId },
                width: { ideal: 1920 },
                height: { ideal: 1080 }
            }
        });

        stream = streamResult;
        document.getElementById("camera").srcObject = streamResult;

    } catch (err) {
        console.error(err);
        alert("No se pudo usar la cámara trasera correcta. Se usará la frontal.");
        openCamera();
    }
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

        document.getElementById("camera").style.display = "none";
        document.getElementById("overlay").style.display = "none";
        document.getElementById("btn-capture").style.display = "none";
        document.getElementById("btn-close").style.display = "none";

        document.getElementById("preview-area").style.display = "flex";

    }, "image/jpeg", 0.92);
}

/* ============================================================
   ACEPTAR FOTO → SUBIR AL SERVIDOR
============================================================ */
async function acceptPhoto() {

    if (!capturedBlob) {
        alert("No hay foto capturada.");
        return;
    }

    showLoader();

    try {
        const formData = new FormData();
        const fileName = captureMode === "rostro" ? "rostro.jpg" : "documento.jpg";
        formData.append("foto", capturedBlob, fileName);

        const response = await fetch("/upload", {
            method: "POST",
            body: formData
        });

        const data = await response.json();

        if (!data.success) {
            alert("Error al subir la foto.");
            return;
        }

        if (captureMode === "rostro") {
            document.getElementById("foto_url").value = data.url;
            document.getElementById("photo-preview").style.display = "block";
            document.getElementById("final-photo").src = data.url;
        }

        if (captureMode === "documento") {
            document.getElementById("foto_documento_url").value = data.url;
            document.getElementById("photo-preview-doc").style.display = "block";
            document.getElementById("final-photo-doc").src = data.url;
        }

        closeCamera();

    } catch (err) {
        console.error("Error subiendo imagen:", err);
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
   CANCELAR FOTO
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
    document.getElementById("signature-instruction").style.display = "block";

    sigCanvas = document.getElementById("signature-canvas");
    sigCtx = sigCanvas.getContext("2d");

    sigCanvas.width = sigCanvas.offsetWidth;
    sigCanvas.height = sigCanvas.offsetHeight;

    sigCtx.fillStyle = "#ffffff";
    sigCtx.fillRect(0, 0, sigCanvas.width, sigCanvas.height);

    sigCanvas.addEventListener("touchstart", startDraw, false);
    sigCanvas.addEventListener("touchmove", drawTouch, false);
    sigCanvas.addEventListener("touchend", stopDraw, false);
    
    sigCanvas.addEventListener("mousedown", startDraw, false);
    sigCanvas.addEventListener("mousemove", drawMouse, false);
    sigCanvas.addEventListener("mouseup", stopDraw, false);
    sigCanvas.addEventListener("mouseout", stopDraw, false);
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
    sigCtx.strokeStyle = "#000000";
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
    let rect = sigCanvas.getBoundingClientRect();
    if (e.touches) {
        return {
            x: e.touches[0].clientX - rect.left,
            y: e.touches[0].clientY - rect.top
        };
    }
    return { x: e.offsetX, y: e.offsetY };
}

function clearSignature() {
    sigCtx.fillStyle = "#ffffff";
    sigCtx.fillRect(0, 0, sigCanvas.width, sigCanvas.height);
}

function closeSignature() {
    document.getElementById("signature-modal").style.display = "none";
    document.getElementById("signature-instruction").style.display = "none";
}

async function saveSignature() {

    showLoader();

    try {
        const dataURL = sigCanvas.toDataURL("image/png");
        const blob = await (await fetch(dataURL)).blob();

        const formData = new FormData();
        formData.append("foto", blob, "firma.png");

        const response = await fetch("/upload", {
            method: "POST",
            body: formData
        });

        const data = await response.json();

        if (!data.success) {
            alert("Error al subir la firma.");
            return;
        }

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

async function getBestBackCamera() {
    const devices = await navigator.mediaDevices.enumerateDevices();

    const videoDevices = devices.filter(d => d.kind === "videoinput");

    // Intentamos encontrar la cámara trasera por nombre
    let backCameras = videoDevices.filter(d =>
        d.label.toLowerCase().includes("back") ||
        d.label.toLowerCase().includes("rear") ||
        d.label.toLowerCase().includes("environment")
    );

    // Si encontramos varias, elegir la más probable de alta calidad
    if (backCameras.length > 0) {
        return backCameras[backCameras.length - 1].deviceId;
    }

    // Si no detecta, usar la última (suele ser la trasera)
    return videoDevices[videoDevices.length - 1].deviceId;
}
