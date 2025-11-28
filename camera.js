let stream;
let capturedBlob = null;

/* -----------------------------------
   ABRIR CÁMARA
----------------------------------- */
function openCamera() {
    document.getElementById("camera-modal").style.display = "block";
    document.getElementById("preview-area").style.display = "none";

    navigator.mediaDevices.getUserMedia({ video: true })
        .then(s => {
            stream = s;
            document.getElementById("camera").srcObject = s;
        })
        .catch(() => alert("No se pudo acceder a la cámara."));
}

/* -----------------------------------
   CERRAR CÁMARA COMPLETO
----------------------------------- */
function closeCamera() {
    document.getElementById("camera-modal").style.display = "none";

    if (stream) {
        stream.getTracks().forEach(t => t.stop());
        stream = null;
    }
}

/* -----------------------------------
   CAPTURAR FOTO (NO SUBE TODAVÍA)
----------------------------------- */
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

        // Oculta video, muestra preview
        document.getElementById("camera").style.display = "none";
        document.getElementById("overlay").style.display = "none";
        document.getElementById("btn-capture").style.display = "none";
        document.getElementById("btn-close").style.display = "none";

        document.getElementById("preview-area").style.display = "flex";
    }, "image/png");
}

/* -----------------------------------
   VOLVER A TOMAR FOTO (SIN CERRAR MODAL)
----------------------------------- */
function retakePhoto() {
    document.getElementById("preview-area").style.display = "none";

    document.getElementById("camera").style.display = "block";
    document.getElementById("overlay").style.display = "block";
    document.getElementById("btn-capture").style.display = "block";
    document.getElementById("btn-close").style.display = "block";
}

/* -----------------------------------
   CANCELAR
----------------------------------- */
function cancelPhoto() {
    capturedBlob = null;
    closeCamera();
}

/* -----------------------------------
   ACEPTAR Y SUBIR FOTO AL SERVIDOR
----------------------------------- */
async function acceptPhoto() {
    if (!capturedBlob) {
        alert("No hay foto capturada.");
        return;
    }

    const formData = new FormData();
    formData.append("foto", capturedBlob, "foto.png");

    const response = await fetch("/upload", {
        method: "POST",
        body: formData
    });

    const data = await response.json();

    if (!data.success) {
        alert("Error al subir la foto.");
        return;
    }

    // Guardar URL en el formulario
    document.getElementById("foto_url").value = data.url;

    // Mostrar mini preview en formulario
    document.getElementById("photo-preview").style.display = "block";
    document.getElementById("final-photo").src = data.url;

    closeCamera();
}
