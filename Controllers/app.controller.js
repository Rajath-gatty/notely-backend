import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.js";
import { Board } from "../models/board.js";
import mongoose from "mongoose";
import { deleteFromS3, uploadToS3 } from "../utils/uploadToS3.js";
import { Page } from "../models/page.js";
import { toBlob } from "html-to-image";
import { Message } from "../models/message.js";

const appController = {};

appController.createBoard = asyncHandler(async (req, res) => {
    const { plan, id } = req;
    let { name, image, imageType, boardType } = req.body;

    const [{ totalBoards }] = await User.aggregate()
        .match({ _id: new mongoose.Types.ObjectId(id) })
        .project({
            totalBoards: {
                $size: "$boards",
            },
            _id: 0,
        });

    if (plan === "personal") {
        if (totalBoards == 3) {
            throw new ApiError(
                400,
                "Free tier exhausted please upgrade your plan"
            );
        }
    }
    if (imageType !== "url") {
        if (!req.file) {
            throw new ApiError(400, "No files uploaded", [
                { fieldName: "image", msg: "Please upload a image" },
            ]);
        }
        // Uploading to S3
        const file = {
            fileName: req.file.filename,
            mimeType: req.file.mimetype,
            uploadFolder: "images",
        };
        image = await uploadToS3(file);
    }
    const board = new Board({
        name,
        coverImage: image,
        userId: req.id,
        boardType,
    });
    board.save();
    await User.findOneAndUpdate(
        { _id: req.id },
        { $push: { boards: board._id } }
    );
    res.status(200).send(new ApiResponse(200, board));
});

appController.getBoards = asyncHandler(async (req, res) => {
    const id = req.id;
    const boards = await Board.find({ userId: id }).select(
        "-userId -updatedAt"
    );
    res.status(200).send(new ApiResponse(200, boards));
});

appController.createPage = asyncHandler(async (req, res) => {
    const { title, parentId, boardId } = req.body;
    const page = new Page({ title, parentId, boardId });
    page.save();
    if (parentId) {
        await Page.findByIdAndUpdate(
            { _id: parentId },
            {
                $push: { childIds: page._id },
            }
        );
    }
    const emitter = req.app.get("eventEmitter");
    emitter.emit("new-page", page);
    res.status(201).send(new ApiResponse(201, page));
});

appController.getPages = asyncHandler(async (req, res) => {
    const { boardId } = req.params;
    const pages = await Page.find({ boardId }).select(
        "-content -coverImage -boardId"
    );
    res.status(200).send(new ApiResponse(200, pages));
});

appController.deletePage = asyncHandler(async (req, res) => {
    const { pageId, childIds = [], boardId } = req.body;
    if (!pageId) throw new ApiError(400, "No page ID found");

    const deleteChildPages = async (childIds = []) => {
        if (!childIds.length > 0) return;
        const promise = childIds.map(async (childId) => {
            const childPages = await Page.findById(childId);
            deleteChildPages(childPages.childIds);
            let deleteFilePromise;
            if (childPages.coverImage) {
                deleteFilePromise = deleteFromS3(
                    childPages.coverImage,
                    "images"
                );
            } else {
                deleteFilePromise = Promise.resolve();
            }
            const deletePagePromise = Page.findByIdAndDelete(childId);
            console.log(deleteFilePromise, deletePagePromise);
            return await Promise.all([deleteFilePromise, deletePagePromise]);
        });
        return Promise.all(promise);
    };

    await deleteChildPages(childIds);
    const { coverImage } = await Page.findById(pageId);
    let pageCoverPromise;
    if (!coverImage) pageCoverPromise = Promise.resolve();
    pageCoverPromise = deleteFromS3(coverImage, "images");
    await Promise.all([Page.findByIdAndDelete(pageId), pageCoverPromise]);

    const emitter = req.app.get("eventEmitter");
    emitter.emit("delete-page", { pageId, boardId });

    res.status(200).send(new ApiResponse(200, "Page deleted"));
});

appController.getPage = asyncHandler(async (req, res) => {
    const { pageId } = req.body;
    if (!pageId) throw new ApiError(400, "No pageId found");
    const page = await Page.findById(pageId);
    res.status(200).send(new ApiResponse(200, page));
});

appController.updatePageContent = asyncHandler(async (req, res) => {
    const { content, pageId } = req.body;
    const { content: contents, boardId } = await Page.findByIdAndUpdate(
        { _id: pageId },
        { $set: { content } },
        { new: true }
    );
    const emitter = req.app.get("eventEmitter");
    emitter.emit("content-update", {
        content: contents,
        boardId,
        pageId,
        changedUserId: req.id,
    });
    res.status(200).send(new ApiResponse(201, "Content updated!"));
});

appController.updatePageTitle = asyncHandler(async (req, res) => {
    let { title, pageId } = req.body;
    if (!pageId) throw new ApiError(400, "No pageId found");
    if (title === "") title = "Untitled";
    const { boardId, title: newTitle } = await Page.findByIdAndUpdate(
        { _id: pageId },
        { $set: { title } },
        { new: true }
    );
    const emitter = req.app.get("eventEmitter");
    emitter.emit("title-update", {
        pageId,
        boardId,
        title: newTitle,
    });
    res.status(200).send(new ApiResponse(201, "Title updated!"));
});

appController.updatePageCoverImage = asyncHandler(async (req, res) => {
    const { pageId } = req.body;
    if (!req.file) throw new ApiError(400, "No files uploaded");

    const file = {
        fileName: req.file.filename,
        mimeType: req.file.mimetype,
        uploadFolder: "images",
    };
    const imageUrl = await uploadToS3(file);
    const page = await Page.findById(pageId);
    if (page.coverImage) {
        await deleteFromS3(page.coverImage, "images");
    }

    page.coverImage = imageUrl;
    page.save();

    const emitter = req.app.get("eventEmitter");
    emitter.emit("cover-update", {
        coverImage: imageUrl,
        boardId: page.boardId,
        pageId,
    });

    res.status(200).send(
        new ApiResponse(200, "File uploaded!", { coverImage: imageUrl })
    );
});

appController.getMessages = asyncHandler(async (req, res) => {
    const { boardId } = req.body;
    if (!boardId) throw new ApiError(400, "Board Id not found");

    const messages = await Message.find({ boardId });
    res.status(200).send(new ApiResponse(200, messages));
});

appController.postMessage = asyncHandler(async (req, res) => {
    const { boardId, message, senderName } = req.body;
    const senderId = req.id;

    if (!boardId) throw new ApiError(400, "Board Id not found");

    const messages = new Message({ boardId, message, senderId, senderName });
    await messages.save();
    const emitter = req.app.get("eventEmitter");
    emitter.emit("message", messages);

    res.status(201).send(new ApiResponse(201, "message created"));
});

appController.test = asyncHandler(async (req, res) => {
    res.status(200).send("Server is working");
});

export default appController;
