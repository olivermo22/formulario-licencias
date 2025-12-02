// =======================================================
// VARIABLES GLOBALES
// =======================================================
let stream;
let capturedBlob = null;
let captureMode = "rostro"; // "rostro" o "documento"
// =======================================================
// OBTENER LA MEJOR CÁMARA DISPONIBLE (MAYOR RESOLUCIÓN)
// =======================================================
async function getRearCamera() {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cams = devices.filter(d => d.kind === "videoinput");

        // Intentar encontrar cámaras que no sean frontales
        let rearCams = cams.filter(c =>
            !c.label.toLowerCase().includes("front") &&
            !c.label.toLowerCase().includes("user")
        );

        // Si no encontramos por label, elegir la cámara #1 (trasera típica)
        if (rearCams.length === 0 && cams.length > 1) {
            return cams[1].deviceId;
        }

        // Si hay múltiples traseras, priorizar la de mejor etiqueta
        if (rearCams.length >= 1) {
            return rearCams[0].deviceId;
        }

        // Fallback
        return cams[0].deviceId;

    } catch (err) {
        console.log("Error buscando cámara trasera:", err);
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
        // PRIMERA LLAMADA: pedir permisos para obtener labels reales
        await navigator.mediaDevices.getUserMedia({ video: true });

        // OBTENER ID DE CÁMARA TRASERA REAL 
        const rearId = await getRearCamera();

        const constraints = rearId
            ? {
                video: {
                    deviceId: { exact: rearId },
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
        openCamera();
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
