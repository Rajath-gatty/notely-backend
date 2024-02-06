import mongoose, { Schema } from "mongoose";
import jwt from "jsonwebtoken";

const user = new Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        email: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
            index: true,
            unique: true,
        },
        avatar: {
            type: String,
            required: true,
        },
        password: {
            type: String,
        },
        authClient: {
            type: String,
            enum: ["self", "google"],
            required: true,
            default: "self",
        },
        address: {
            type: String,
        },
        plan: {
            type: String,
            enum: ["personal", "team"],
            required: true,
            default: "personal",
        },
        assignedColor: {
            type: String,
            required: true,
        },
        refreshToken: [
            {
                type: String,
            },
        ],
        boards: [
            {
                type: mongoose.Types.ObjectId,
                ref: "board",
            },
        ],
    },
    {
        timestamps: {
            created_At: "created_at",
        },
    }
);

user.methods.generateAccessToken = function () {
    const token = jwt.sign(
        { plan: this.plan, _id: this._id },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: Number(process.env.ACCESS_TOKEN_EXPIRY),
        }
    );
    return token;
};

user.methods.generateRefreshToken = function () {
    const token = jwt.sign(
        { _id: this._id },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: Number(process.env.REFRESH_TOKEN_EXPIRY),
        }
    );
    return token;
};

export const User = mongoose.model("User", user);
