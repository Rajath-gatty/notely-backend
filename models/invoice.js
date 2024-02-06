import mongoose, { Schema } from "mongoose";

const invoice = new Schema({
    userId: {
        type: mongoose.Types.ObjectId,
        ref: "user",
        required: true,
    },
    amount: {
        type: Number,
        required: true,
    },
    paymentMethod: {
        type: String,
        enum: ["card"],
        default: "card",
        required: true,
    },
    paymentDate: {
        type: Date,
        required: true,
    },
    transactionNo: {
        type: String,
        required: true,
    },
    receiptUrl: {
        type: String,
        required: true,
    },
});

const Invoice = mongoose.model("Invoices", invoice);
