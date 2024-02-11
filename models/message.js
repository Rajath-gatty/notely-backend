import mongoose, { Schema } from "mongoose";

const messageModel = new Schema(
    {
        boardId: {
            type: mongoose.Types.ObjectId,
            ref: "Board",
        },
        sender: {
            type: mongoose.Types.ObjectId,
            ref: "User",
            required: true,
        },
        message: {
            type: String,
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

export const Message = mongoose.model("Messages", messageModel);
