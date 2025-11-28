let stream;

function openCamera() {
    document.getElementById("camera-modal").style.display = "block";

    navigator.mediaDevices.getUserMedia({ video: true })
        .then(s => {
            stream = s;
            document.getElementById("camera").srcObject = s;
        })
        .catch(() => alert("No se pudo acceder a la cámara."));
}

function closeCamera() {
    document.getElementById("camera-modal").style.display = "none";
    if (stream) stream.getTracks().forEach(t => t.stop());
}

async function capture() {
    const video = document.getElementById("camera");
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0);

    canvas.toBlob(async (blob) => {
        const formData = new FormData();
        formData.append("foto", blob, "foto.png");

        const req = await fetch("/upload", {
            method: "POST",
            body: formData
        });

        const data = await req.json();

        if (!data.success) {
            alert("Error al subir la foto");
            return;
        }

        document.getElementById("foto_url").value = data.url;

        document.getElementById("photo-preview").style.display = "block";
        document.getElementById("final-photo").src = data.url;

        closeCamera();
    }, "image/png");
}
