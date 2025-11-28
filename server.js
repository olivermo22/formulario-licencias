import express from "express";
import fs from "fs";
import path from "path";

const app = express();

app.use(express.json({ limit: "25mb" }));
app.use(express.static("public"));
app.use("/uploads", express.static("uploads"));

const UPLOAD_DIR = "./uploads";
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);

// =======================
//     SUBIR IMAGEN
// =======================
app.post("/api/upload", (req, res) => {
    try {
        const base64 = req.body.foto.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64, "base64");

        const filename = `foto_${Date.now()}.jpg`;
        fs.writeFileSync(`${UPLOAD_DIR}/${filename}`, buffer);

        const url = `${req.protocol}://${req.get("host")}/uploads/${filename}`;

        res.json({ url });

    } catch (e) {
        console.error("Error guardando archivo:", e);
        res.status(500).json({ error: "No se pudo guardar imagen" });
    }
});

// =======================
//   LIMPIEZA AUTOMÁTICA
// =======================
setInterval(() => {
    const now = Date.now();
    const limite = 15 * 24 * 60 * 60 * 1000;

    fs.readdirSync(UPLOAD_DIR).forEach(file => {
        const full = `${UPLOAD_DIR}/${file}`;
        const stats = fs.statSync(full);

        if (now - stats.mtimeMs > limite) {
            fs.unlinkSync(full);
            console.log("🗑 Archivo eliminado:", file);
        }
    });
}, 60 * 60 * 1000); // cada hora

// =======================
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log("Servidor en puerto", PORT));
