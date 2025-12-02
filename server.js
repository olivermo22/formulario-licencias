import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Asegurar carpeta
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

app.use(express.static(__dirname));
app.use("/uploads", express.static(uploadDir));

const storage = multer.diskStorage({
    destination: (_, __, cb) => cb(null, uploadDir),
    filename: (_, file, cb) => {
        const name = Date.now() + "_" + file.originalname.replace(/\s+/g, "_");
        cb(null, name);
    }
});

const upload = multer({ storage });

// Subida
app.post("/upload", upload.single("foto"), (req, res) => {
    if (!req.file) return res.json({ success: false });

    const url = `/uploads/${req.file.filename}`;
    const full = process.env.RAILWAY_PUBLIC_DOMAIN
        ? process.env.RAILWAY_PUBLIC_DOMAIN + url
        : url;

    res.json({ success: true, url: full });
});

app.listen(process.env.PORT || 3000, () =>
    console.log("Servidor corriendo")
);
