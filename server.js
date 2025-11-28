import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Asegura que la carpeta uploads exista
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

app.use(express.static(__dirname));
app.use("/uploads", express.static(uploadDir));

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, uploadDir),
  filename: (_, file, cb) => {
    const name = Date.now() + "_" + file.originalname;
    cb(null, name);
  }
});

const upload = multer({ storage });

app.post("/upload", upload.single("foto"), (req, res) => {
  const fileUrl = `/uploads/${req.file.filename}`;

  const absoluteUrl = `${process.env.RAILWAY_PUBLIC_DOMAIN || ""}${fileUrl}`;

  res.json({
    success: true,
    url: absoluteUrl
  });
});

// ===============================
// NUEVO: LISTAR ARCHIVOS SUBIDOS
// ===============================
app.get("/list-uploads", (req, res) => {
    fs.readdir(uploadDir, (err, files) => {
        if (err) return res.json({ files: [] });

        const details = files.map(name => {
            const stats = fs.statSync(path.join(uploadDir, name));
            return { name, size: stats.size };
        });

        res.json({ files: details });
    });
});

// ===============================
// NUEVO: ELIMINAR ARCHIVO
// ===============================
app.post("/delete-upload", express.json(), (req, res) => {
    const { name } = req.body;

    if (!name) return res.json({ success: false });

    const filePath = path.join(uploadDir, name);

    fs.unlink(filePath, err => {
        if (err) return res.json({ success: false });
        res.json({ success: true });
    });
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log("Servidor funcionando en puerto " + port));
