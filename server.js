import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";

const app = express();
app.use(cors());
app.use(express.json({ limit: "40mb" }));

const ROOT = process.cwd();
const UPLOADS = path.join(ROOT, "uploads");
const PUBLIC = path.join(ROOT, "public");

if (!fs.existsSync(UPLOADS)) fs.mkdirSync(UPLOADS);

app.use("/uploads", express.static(UPLOADS));
app.use("/", express.static(PUBLIC));

// =====================================
//  ENDPOINT para guardar fotos
// =====================================
app.post("/api/upload", (req, res) => {
    try {
        const { imageBase64 } = req.body;

        if (!imageBase64) return res.status(400).json({ error: "No image received" });

        const data = imageBase64.replace(/^data:image\/png;base64,/, "");
        const buffer = Buffer.from(data, "base64");

        const filename = `foto_${Date.now()}.png`;
        const filepath = path.join(UPLOADS, filename);

        fs.writeFileSync(filepath, buffer);

        const url = `${req.protocol}://${req.get("host")}/uploads/${filename}`;
        res.json({ url });

    } catch (err) {
        console.log(err);
        res.status(500).json({ error: "Server error" });
    }
});

// ================================================
// LIMPIEZA AUTOMÁTICA — BORRAR ARCHIVOS > 15 DÍAS
// ================================================
setInterval(() => {
    const files = fs.readdirSync(UPLOADS);
    const now = Date.now();

    files.forEach(file => {
        const full = path.join(UPLOADS, file);
        const age = (now - fs.statSync(full).mtimeMs) / (1000 * 60 * 60 * 24);

        if (age >= 15) {
            fs.unlinkSync(full);
            console.log("🗑 Eliminado:", file);
        }
    });
}, 1000 * 60 * 60 * 24); // cada 24 h

// INICIAR SERVER
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Servidor activo en", PORT));
