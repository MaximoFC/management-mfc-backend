import multer from "multer";

const storage = multer.memoryStorage();

// Solo planillas de Excel y de tamaño acotado (el archivo se procesa en memoria)
const upload = multer({
    storage,
    limits: {
        fileSize: 2 * 1024 * 1024,
        files: 1
    },
    fileFilter: (req, file, cb) => {
        const ok = /\.(xlsx|xls)$/i.test(file.originalname);
        cb(ok ? null : Object.assign(new Error("Solo se aceptan archivos Excel (.xlsx o .xls)"), { status: 400 }), ok);
    }
});

export default upload;
