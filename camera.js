let stream;
let capturedBlob = null;
let mode = "persona";

/* ---------------------------
   ABRIR CÁMARA PARA PERSONA
---------------------------- */
function openCameraPersona() {
    mode = "persona";
    openCamera();
}

/* ---------------------------
   ABRIR CÁMARA PARA INE
---------------------------- */
function openCameraID() {
    mode = "identificacion";
    openCamera();
}

/* ---------------------------
   ABRIR CÁMARA
---------------------------- */
function openCamera() {
    document.getElementById("camera-modal").style.display = "block";
    document.getElementById("preview-area").style.display = "none";

    // silueta solo si es persona
    if (mode === "persona") {
        document.getElementById("overlay").style.display = "block";
    } else {
        document.getElementById("overlay").style.display = "none";
    }

    navigator.mediaDevices.getUserMedia({ video: true })
        .then(s => {
            stream = s;
            document.getElementById("camera").srcObject = s;
        })
        .catch(() => alert("No se pudo acceder a la cámara."));
}

/* ---------------------------
   CERRAR SENSOR
---------------------------- */
function closeCamera() {
    document.getElementById("camera-modal").style.display = "none";
    if (stream) {
        stream.getTracks().forEach(t => t.stop());
        stream = null;
    }
}

/* ---------------------------
   CAPTURAR
---------------------------- */
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

        // oculta cámara, muestra preview
        document.getElementById("camera").style.display = "none";
        document.getElementById("overlay").style.display = "none";
        document.getElementById("btn-capture").style.display = "none";
        document.getElementById("btn-close").style.display = "none";

        document.getElementById("preview-area").style.display = "flex";
    }, "image/png");
}

/* ---------------------------
   RETOMAR
---------------------------- */
function retakePhoto() {
    document.getElementById("preview-area").style.display = "none";

    document.getElementById("camera").style.display = "block";
    if (mode === "persona") {
        document.getElementById("overlay").style.display = "block";
    }
    document.getElementById("btn-capture").style.display = "block";
    document.getElementById("btn-close").style.display = "block";
}

/* ---------------------------
   CANCELAR TODO
---------------------------- */
function cancelPhoto() {
    capturedBlob = null;
    closeCamera();
}

/* ---------------------------
   GUARDAR FOTO
---------------------------- */
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

    if (mode === "persona") {
        document.getElementById("foto_url").value = data.url;
        document.getElementById("photo-preview").style.display = "block";
        document.getElementById("photo-check").style.display = "block";

        document.getElementById("final-photo").onerror = () => {
            document.getElementById("final-photo").style.display = "none";
        };

        document.getElementById("final-photo").onload = () => {
            document.getElementById("final-photo").style.display = "block";
        };

        document.getElementById("final-photo").src = data.url;
    }

    if (mode === "identificacion") {
        document.getElementById("foto_url_identificacion").value = data.url;
        document.getElementById("photo-preview-id").style.display = "block";
        document.getElementById("photo-check-id").style.display = "block";

        document.getElementById("final-photo-id").onerror = () => {
            document.getElementById("final-photo-id").style.display = "none";
        };

        document.getElementById("final-photo-id").onload = () => {
            document.getElementById("final-photo-id").style.display = "block";
        };

        document.getElementById("final-photo-id").src = data.url;
    }

    closeCamera();

    // regresar a modo persona por defecto
    mode = "persona";
}
