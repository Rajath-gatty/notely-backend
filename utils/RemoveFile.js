import path from "node:path";
import fs from "node:fs/promises";

export const deleteFile = (fileName) => {
    return fs.unlink(path.join(process.cwd(), "public", "temp", fileName));
};
