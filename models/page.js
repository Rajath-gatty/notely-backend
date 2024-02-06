import mongoose, { Schema } from "mongoose";

const page = new Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
        },
        boardId: {
            type: mongoose.Types.ObjectId,
            ref: "board",
            required: true,
        },
        parentId: {
            type: mongoose.Types.ObjectId,
            default: null,
        },
        childIds: [
            {
                type: mongoose.Types.ObjectId,
            },
        ],
        content: {
            type: String,
            default: "",
        },
        coverImage: {
            type: String,
            default: "",
        },
    },
    {
        timestamps: true,
    }
);

export const Page = mongoose.model("Pages", page);
