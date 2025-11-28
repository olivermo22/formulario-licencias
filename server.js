import express from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(__dirname));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

const storage = multer.diskStorage({
    destination: (_, __, cb) => cb(null, "uploads/"),
    filename: (_, file, cb) => {
        const unique = Date.now() + "_" + file.originalname;
        cb(null, unique);
    }
});

const upload = multer({ storage });

app.post("/upload", upload.single("foto"), (req, res) => {
    const url = `/uploads/${req.file.filename}`;
    res.json({ url });
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log("Servidor iniciado en puerto " + port));
