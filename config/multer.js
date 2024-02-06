import multer from "multer";
import { v4 as uuid } from "uuid";
import path from "node:path";

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(process.cwd(), "public", "temp"));
    },
    filename: function (req, file, cb) {
        const mimeType = file.mimetype.split("/")[1];
        const fileName = `${uuid()}.${mimeType}`;
        cb(null, fileName);
    },
});

export const upload = multer({ storage: storage });
