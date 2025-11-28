import express from "express";
import fs from "fs";
import path from "path";

const app = express();
app.use(express.json({limit:"20mb"}));
app.use(express.static("public"));
app.use("/uploads", express.static("uploads"));

const UPLOAD_DIR = "./uploads";
if(!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);

// ⬇️ Guardar imagen base64
app.post("/api/upload", (req,res)=>{
    try {
        const base64 = req.body.imagen.replace(/^data:image\/\w+;base64,/,"");
        const buffer = Buffer.from(base64,"base64");

        const filename = "foto_"+Date.now()+".jpg";
        const filepath = path.join(UPLOAD_DIR, filename);

        fs.writeFileSync(filepath, buffer);

        const fullURL = `${req.protocol}://${req.get("host")}/uploads/${filename}`;
        res.json({url: fullURL});
    } catch(e){
        console.error(e);
        res.status(500).json({error:"error guardando"});
    }
});

// ⬇️ Limpieza automática cada hora
setInterval(()=>{
    const files = fs.readdirSync(UPLOAD_DIR);
    const now = Date.now();

    for(const f of files){
        const fp = path.join(UPLOAD_DIR,f);
        const stats = fs.statSync(fp);
        const age = now - stats.mtimeMs;

        if(age > 15*24*60*60*1000){ // 15 días
            fs.unlinkSync(fp);
        }
    }
}, 3600000);

const PORT = process.env.PORT || 8080;
app.listen(PORT, ()=> console.log("Servidor activo en", PORT));
