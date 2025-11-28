let stream;
let capturedBlob = null;
let captureMode = "rostro"; // "rostro" o "documento"

function resetCameraUI() {
    document.getElementById("preview-area").style.display = "none";
    document.getElementById("camera").style.display = "block";
    document.getElementById("overlay").style.display = "block";
    document.getElementById("btn-capture").style.display = "block";
    document.getElementById("btn-close").style.display = "block";
}

function openCamera() {
    captureMode = "rostro";
    resetCameraUI();

    document.getElementById("overlay").src = "silhouette.png";
    document.getElementById("overlay").style.display = "block";

    document.getElementById("camera-modal").style.display = "block";

    navigator.mediaDevices.getUserMedia({ video: true })
        .then(s => {
            stream = s;
            document.getElementById("camera").srcObject = s;
        })
        .catch(() => alert("No se pudo acceder a la cámara."));
}

function openCameraDoc() {
    captureMode = "documento";
    resetCameraUI();

    // Aquí quitamos la silueta
    document.getElementById("overlay").style.display = "none";

    document.getElementById("camera-modal").style.display = "block";

    navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } }
    })
    .then(s => {
        stream = s;
        document.getElementById("camera").srcObject = s;
    })
    .catch(() => {
        alert("No se pudo acceder a la cámara trasera. Se usará la frontal.");
        openCamera();
    });
}

function closeCamera() {
    if (stream) {
        stream.getTracks().forEach(t => t.stop());
        stream = null;
    }

    resetCameraUI();
    document.getElementById("camera-modal").style.display = "none";
}

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

    }, "image/png");
}

function retakePhoto() {
    resetCameraUI();
    document.getElementById("preview-area").style.display = "none";
}


function cancelPhoto() {
    capturedBlob = null;
    closeCamera();
}

async function acceptPhoto() {
    if (!capturedBlob) {
        alert("No hay foto capturada.");
        return;
    }

    const formData = new FormData();
    formData.append("foto", capturedBlob, captureMode + ".png");

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
    } else {
        document.getElementById("foto_documento_url").value = data.url;
        document.getElementById("photo-preview-doc").style.display = "block";
        document.getElementById("final-photo-doc").src = data.url;
    }

    closeCamera();
}

// ===============================
//  FIRMA DIGITAL
// ===============================
let sigCanvas, sigCtx;
let drawing = false;
let lastX = 0;
let lastY = 0;

function openSignature() {
    document.getElementById("signature-modal").style.display = "block";

    sigCanvas = document.getElementById("signature-canvas");
    sigCtx = sigCanvas.getContext("2d");

    // Ajustar canvas a tamaño real
    sigCanvas.width = sigCanvas.offsetWidth;
    sigCanvas.height = sigCanvas.offsetHeight;

    sigCtx.fillStyle = "#ffffff";
    sigCtx.fillRect(0, 0, sigCanvas.width, sigCanvas.height);

    // Eventos táctiles y de mouse
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

// Limpiar firma
function clearSignature() {
    sigCtx.fillStyle = "#ffffff";
    sigCtx.fillRect(0, 0, sigCanvas.width, sigCanvas.height);
}

// Cerrar modal
function closeSignature() {
    document.getElementById("signature-modal").style.display = "none";
}

// Guardar firma
async function saveSignature() {
    const dataURL = sigCanvas.toDataURL("image/png"); // firma en PNG

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

    // Guardar en el formulario
    document.getElementById("firma_url").value = data.url;

    // Mostrar preview
    document.getElementById("signature-preview").style.display = "block";
    document.getElementById("final-signature").src = data.url;

    closeSignature();
}
