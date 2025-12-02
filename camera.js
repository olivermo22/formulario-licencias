// =======================================================
// VARIABLES GLOBALES
// =======================================================
let stream;
let capturedBlob = null;
let captureMode = "rostro"; // "rostro" o "documento"
// =======================================================
// OBTENER LA MEJOR CÁMARA DISPONIBLE (MAYOR RESOLUCIÓN)
// =======================================================
async function getBestCamera() {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter(d => d.kind === "videoinput");

        if (videoInputs.length === 0) return null;

        // Ordenar cámaras por la resolución indicada en label (si está disponible)
        let best = videoInputs[0];

        videoInputs.forEach(cam => {
            const label = cam.label.toLowerCase();

            // Prioridad:
            // 1. cámaras "back", "rear", "environment"
            // 2. cámaras con "4k", "1080", "12mp", etc
            if (label.includes("back") || label.includes("rear") || label.includes("environment")) {
                best = cam;
            }

            if (label.includes("4k") || label.includes("2160")) {
                best = cam;
            }

            if (label.includes("1080") || label.includes("12mp") || label.includes("12 mp")) {
                best = cam;
            }
        });

        return best.deviceId;

    } catch (err) {
        console.log("Error buscando mejor cámara:", err);
        return null;
    }
}

// =======================================================
// LOADER
// =======================================================
function showLoader() {
    document.getElementById("loader").style.display = "flex";
}

function hideLoader() {
    document.getElementById("loader").style.display = "none";
}

// =======================================================
// RESET DE UI DE CÁMARA
// =======================================================
function resetCameraUI() {
    document.getElementById("preview-area").style.display = "none";
    document.getElementById("camera").style.display = "block";
    document.getElementById("btn-capture").style.display = "block";
    document.getElementById("btn-close").style.display = "block";

    // Mostrar silueta solo en modo rostro
    if (captureMode === "rostro") {
        document.getElementById("overlay").src = "silhouette.png";
        document.getElementById("overlay").style.display = "block";
    }

    // Ocultar silueta en modo documento
    if (captureMode === "documento") {
        document.getElementById("overlay").style.display = "none";
    }
}

// =======================================================
// ABRIR CÁMARA - FOTO DEL TITULAR
// =======================================================
function openCamera() {
    captureMode = "rostro";
    capturedBlob = null;
    resetCameraUI();

    document.getElementById("camera-modal").style.display = "block";

    navigator.mediaDevices.getUserMedia({ video: true })
        .then(s => {
            stream = s;
            document.getElementById("camera").srcObject = s;
        })
        .catch(() => alert("No se pudo acceder a la cámara."));
}

// =======================================================
// ABRIR CÁMARA DOCUMENTO CON LA MEJOR RESOLUCIÓN
// =======================================================
async function openCameraDoc() {
    captureMode = "documento";
    capturedBlob = null;
    resetCameraUI();

    document.getElementById("overlay").style.display = "none";
    document.getElementById("camera-modal").style.display = "block";

    try {
        // PRIMERA LLAMADA: pedir permiso mínimo
        await navigator.mediaDevices.getUserMedia({ video: true });

        // AHORA SÍ podemos leer las cámaras reales
        const bestCamId = await getBestCamera();

        const constraints = bestCamId
            ? {
                video: {
                    deviceId: { exact: bestCamId },
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                }
            }
            : {
                video: {
                    facingMode: { ideal: "environment" },
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                }
            };

        const s = await navigator.mediaDevices.getUserMedia(constraints);

        stream = s;
        document.getElementById("camera").srcObject = s;

        setTimeout(adjustOverlayPosition, 400);

    } catch (err) {
        console.log("Error usando cámara trasera:", err);

        alert("No se pudo acceder a la cámara trasera, usando la frontal.");

        openCamera(); // fallback frontal
    }
}


// =======================================================
// CAPTURAR FOTO
// =======================================================
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

        // Ocultar UI de cámara
        document.getElementById("camera").style.display = "none";
        document.getElementById("overlay").style.display = "none";
        document.getElementById("btn-capture").style.display = "none";
        document.getElementById("btn-close").style.display = "none";

        // Mostrar preview
        document.getElementById("preview-area").style.display = "flex";

    }, "image/png");
}

// =======================================================
// ACEPTAR FOTO → SUBIR + ASIGNAR
// =======================================================
async function acceptPhoto() {

    if (!capturedBlob) {
        alert("No hay foto capturada.");
        return;
    }

    showLoader();

    try {
        const formData = new FormData();
        const fileName = captureMode === "rostro"
            ? "rostro.png"
            : "documento.png";

        formData.append("foto", capturedBlob, fileName);

        const response = await fetch("/upload", {
            method: "POST",
            body: formData
        });

        const data = await response.json();

        if (!data.success) {
            alert("Error al subir la imagen.");
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

    } catch (error) {
        console.error("Error al aceptar la foto:", error);
        alert("Ocurrió un problema subiendo la imagen.");

    } finally {
        hideLoader();
    }
}

// =======================================================
// REHACER FOTO
// =======================================================
function retakePhoto() {
    capturedBlob = null;
    resetCameraUI();
}

// =======================================================
// CANCELAR FOTO
// =======================================================
function cancelPhoto() {
    capturedBlob = null;
    closeCamera();
}

// =======================================================
// CERRAR CÁMARA COMPLETAMENTE
// =======================================================
function closeCamera() {
    if (stream) {
        stream.getTracks().forEach(t => t.stop());
        stream = null;
    }

    resetCameraUI();
    document.getElementById("camera-modal").style.display = "none";
}

// =======================================================
// FIRMA DIGITAL
// =======================================================
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

// =======================================================
// GUARDAR FIRMA
// =======================================================
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

    } catch (error) {
        console.error("Error al guardar firma:", error);
        alert("Hubo un problema al guardar la firma.");

    } finally {
        hideLoader();
    }
}
