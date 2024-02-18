import mongoose, { Schema } from "mongoose";

const subscription = new Schema({
    userId: {
        type: mongoose.Types.ObjectId,
        ref: "User",
        required: true,
    },
    startDate: Date,
    endDate: Date,
    isActive: {
        type: Boolean,
        required: true,
    },
    product: {
        type: String,
        required: true,
    },
    productId: {
        type: String,
        required: true,
    },
    amount: {
        type: Number,
        required: true,
    },
    paymentMethod: {
        type: String,
        required: true,
    },
    invoiceUrl: {
        type: String,
    },
    subscriptionId: {
        type: String,
        required: true,
    },
});

export const Subscription = mongoose.model("Subscriptions", subscription);
