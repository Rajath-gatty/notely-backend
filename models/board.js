import mongoose, { Schema } from "mongoose";

const board = new Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        coverImage: {
            type: String,
            required: true,
        },
        userId: {
            type: mongoose.Types.ObjectId,
            ref: "User",
        },
        boardType: {
            type: String,
            enum: ["personal", "collaborative"],
            required: true,
        },
        lastViewed: {
            type: Date,
            required: true,
            default: new Date().toISOString(),
        },
    },
    {
        timestamps: {
            createdAt: "created_at",
        },
    }
);

export const Board = mongoose.model("Board", board);
