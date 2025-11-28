import express from "express";
import fs from "fs";
import path from "path";

const app = express();

// Permitir JSON grande (para base64)
app.use(express.json({ limit: "25mb" }));

// Rutas públicas
app.use(express.static("public"));
app.use("/uploads", express.static("uploads"));

const UPLOAD_DIR = "./uploads";
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR);
}

// ===================================
// 1. ENDPOINT PARA SUBIR IMAGEN
// ===================================
app.post("/api/upload", (req, res) => {
    try {
        const base64 = req.body.foto.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64, "base64");

        const filename = `foto_${Date.now()}.jpg`;
        const filePath = path.join(UPLOAD_DIR, filename);

        fs.writeFileSync(filePath, buffer);

        const publicURL = `${req.protocol}://${req.get("host")}/uploads/${filename}`;

        return res.json({ url: publicURL });

    } catch (err) {
        console.error("Error subiendo archivo:", err);
        return res.status(500).json({ error: "No se pudo guardar la imagen" });
    }
});

// ===================================
// 2. LIMPIEZA AUTOMÁTICA CADA HORA
// ===================================
setInterval(() => {
    const now = Date.now();

    fs.readdirSync(UPLOAD_DIR).forEach(file => {
        const fullPath = path.join(UPLOAD_DIR, file);
        const stats = fs.statSync(fullPath);
        const age = now - stats.mtimeMs;

        // 15 días = 1296000000 ms
        if (age > 1296000000) {
            fs.unlinkSync(fullPath);
            console.log("Archivo eliminado por antigüedad:", file);
        }
    });
}, 60 * 60 * 1000); // cada hora

// ===================================
// 3. LEVANTAR SERVIDOR
// ===================================
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log("Servidor running en puerto", PORT);
});
