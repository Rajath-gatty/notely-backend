import mongoose, { Schema } from "mongoose";

const messageModel = new Schema(
    {
        boardId: {
            type: mongoose.Types.ObjectId,
            ref: "board",
        },
        senderId: {
            type: mongoose.Types.ObjectId,
            required: true,
        },
        senderName: {
            type: String,
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
