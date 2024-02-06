import mongoose, { Schema } from "mongoose";

const subscription = new Schema({
    userId: {
        type: mongoose.Types.ObjectId,
        ref: "user",
        required: true,
    },
    startDate: Date,
    endDate: Date,
    isActive: {
        type: Boolean,
        required: true,
    },
    invoiceIds: [
        {
            type: String,
            ref: "invoice",
        },
    ],
    count: Number,
});

export const Subscription = mongoose.model("Subscriptions", subscription);
