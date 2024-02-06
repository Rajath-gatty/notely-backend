import {
    S3Client,
    PutObjectCommand,
    DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import fs from "node:fs";
import path from "node:path";
import { ApiError } from "./ApiError.js";
import { deleteFile } from "./RemoveFile.js";

const client = new S3Client({ region: "ap-south-1" });

export const uploadToS3 = async ({
    fileName,
    mimeType,
    uploadFolder,
    file = null,
}) => {
    try {
        let fileBody;
        if (!file) {
            fileBody = fs.createReadStream(
                path.join(process.cwd(), "public", "temp", fileName)
            );
        } else {
            fileBody = file;
        }
        const params = {
            Body: fileBody,
            Bucket: "notely",
            Key: `${uploadFolder}/${fileName}`,
            ContentType: mimeType,
        };
        const command = new PutObjectCommand(params);
        await client.send(command);
        if (!file) deleteFile(fileName);
        const url = `https://notely.s3.ap-south-1.amazonaws.com/${uploadFolder}/${fileName}`;
        return url;
    } catch (error) {
        console.log(error);
        throw new ApiError(500, "S3 upload failed");
    }
};

export const deleteFromS3 = async (imageUrl, folderName) => {
    const fileName = imageUrl.split(`${folderName}/`)[1];
    try {
        const params = {
            Bucket: "notely",
            Key: `${folderName}/${fileName}`,
        };

        const command = new DeleteObjectCommand(params);
        return client.send(command);
    } catch (error) {
        console.log(error);
        throw new ApiError(500, "S3 File deletion failed");
    }
};
