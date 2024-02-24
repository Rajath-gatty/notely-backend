import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.js";
import { Board } from "../models/board.js";
import mongoose from "mongoose";
import { deleteFromS3, uploadToS3 } from "../utils/uploadToS3.js";
import { Page } from "../models/page.js";
import { Message } from "../models/message.js";
import Stripe from "stripe";
import { Subscription } from "../models/subscription.js";
import { z } from "zod";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const appController = {};

appController.createBoard = asyncHandler(async (req, res) => {
    const { id } = req;
    let { title, image, imageType, boardType } = req.body;

    const { plan } = await User.findById(id);
    const [{ totalBoards }] = await User.aggregate()
        .match({ _id: new mongoose.Types.ObjectId(id) })
        .project({
            totalBoards: {
                $size: "$boards",
            },
            _id: 0,
        });

    if (plan === "free") {
        if (totalBoards >= 3) {
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
        name: title,
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
    const boards = await Board.find({ userId: id })
        .select("-userId -updatedAt")
        .sort({ lastViewed: "desc" });
    res.status(200).send(new ApiResponse(200, boards));
});

appController.deleteBoard = asyncHandler(async (req, res) => {
    const { boardId, imageUrl } = req.body;
    if (!boardId || !imageUrl) throw new ApiError(400, "No boardId found!");

    const deleteBoard = Board.findByIdAndDelete(boardId);
    if (imageUrl.includes("amazonaws")) {
        const deleteImage = deleteFromS3(imageUrl, "images");
        await Promise.all([deleteBoard, deleteImage]);
    } else {
        await deleteBoard;
    }
    await User.findByIdAndUpdate(req.id, {
        $pull: {
            boards: boardId,
        },
    });
    await Page.deleteMany({ boardId });
    await Message.deleteMany({ boardId });

    res.status(200).send(new ApiResponse(200, "Board deleted"));
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
    if (!boardId) throw new ApiError("Board Id is required");

    const pages = await Page.find({ boardId }).select(
        "-content -coverImage -boardId"
    );
    const { name: boardName } = await Board.findById(boardId);

    await Board.findByIdAndUpdate(boardId, {
        $set: {
            lastViewed: new Date().toISOString(),
        },
    });
    res.status(200).send(new ApiResponse(200, { boardName, pages }));
});

appController.deletePage = asyncHandler(async (req, res) => {
    const { pageId, parentId, childIds = [], boardId } = req.body;
    if (!pageId) throw new ApiError(400, "No page ID found");

    const deleteChildPages = async (childIds = []) => {
        if (!childIds?.length > 0) return;
        const promise = childIds.map(async (childId) => {
            const childPages = await Page.findById(childId);
            if (!childPages) return;
            deleteChildPages(childPages.childIds);
            let deleteImagePromise;
            if (childPages.coverImage) {
                deleteImagePromise = deleteFromS3(
                    childPages.coverImage,
                    "images"
                );
            } else {
                deleteImagePromise = Promise.resolve();
            }
            if (parentId) {
                await Page.findByIdAndUpdate(parentId, {
                    $pull: { childIds: pageId },
                });
            }
            const deletePagePromise = Page.findByIdAndDelete(childId);
            return await Promise.all([deleteImagePromise, deletePagePromise]);
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
    const isValidId = mongoose.isValidObjectId(pageId);
    if (!isValidId) throw new ApiError(400, "Enter valid page Id");
    const page = await Page.findById(pageId);
    res.status(200).send(new ApiResponse(200, page));
});

appController.updatePageContent = asyncHandler(async (req, res) => {
    const { content, pageId } = req.body;
    if (!pageId) throw new ApiError("pageId is required");

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
    const isValidId = mongoose.isValidObjectId(pageId);
    if (!isValidId) throw new ApiError(400, "Enter valid page Id");
    if (title === "") title = "Untitled";
    const result = await Page.findByIdAndUpdate(
        { _id: pageId },
        { $set: { title } },
        { new: true }
    );
    if (!result) throw new ApiError(400, "No page found");
    const { boardId, title: newTitle } = result;
    const emitter = req.app.get("eventEmitter");
    emitter.emit("title-update", {
        userId: req.id,
        pageId,
        boardId,
        title: newTitle,
    });
    res.status(200).send(new ApiResponse(201, "Title updated!"));
});

appController.updatePageCoverImage = asyncHandler(async (req, res) => {
    const { pageId } = req.body;
    if (!pageId) throw new ApiError(400, "No pageId or boardId found");
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

appController.deletePageCover = asyncHandler(async (req, res) => {
    const { boardId, pageId, imageUrl } = req.body;
    if (!boardId || !pageId || !imageUrl)
        throw new ApiError(400, "boardId or pageId is required");

    const s3Delete = deleteFromS3(imageUrl, "images");
    const deleteCover = Page.findByIdAndUpdate(
        pageId,
        {
            $set: {
                coverImage: "",
            },
        },
        { new: true }
    );
    const [_, result] = await Promise.all([s3Delete, deleteCover]);

    const emitter = req.app.get("eventEmitter");
    emitter.emit("cover-update", {
        coverImage: result.coverImage,
        boardId,
        pageId,
    });

    res.status(200).send(new ApiResponse(200, "Cover image removed"));
});

appController.getMessages = asyncHandler(async (req, res) => {
    const { boardId } = req.body;
    if (!boardId) throw new ApiError(400, "Board Id not found");

    const messages = await Message.find({ boardId }).populate(
        "sender",
        "_id avatar name"
    );
    res.status(200).send(new ApiResponse(200, messages));
});

appController.postMessage = asyncHandler(async (req, res) => {
    const msgSchema = z.object({
        message: z.string(),
        boardId: z.string(),
    });
    const result = msgSchema.safeParse(req.body);
    if (!result.success) throw new ApiError("Message must be a string");
    const { boardId, message } = result.data;
    const sender = req.id;

    if (!boardId) throw new ApiError(400, "Board Id not found");

    const messages = new Message({ boardId, message, sender });
    await messages
        .save()
        .then((msg) => msg.populate("sender", "_id avatar name"));
    const emitter = req.app.get("eventEmitter");
    emitter.emit("message", messages);

    res.status(201).send(new ApiResponse(201, "message created"));
});

appController.profile = asyncHandler(async (req, res) => {
    const userId = req.id;
    const user = await User.findById(userId);

    if (!user?.stripeCustomerId) {
        return res.status(200).send(new ApiResponse(200, { plan: user.plan }));
    }
    const customer = await stripe.customers.retrieve(user.stripeCustomerId);

    const subscriptions = await Subscription.find({ userId })
        .limit(10)
        .sort({ startDate: "desc" });
    const promises = subscriptions.map(async (sub) => {
        return {
            ...sub._doc,
            paymentMethod: (
                await stripe.paymentMethods.retrieve(sub.paymentMethod)
            )?.card,
        };
    });
    const finalRes = await Promise.all(promises);
    const obj = {
        profile: {
            email: customer.email,
            address: customer.address,
        },
        subscriptions: finalRes,
        plan: user.plan,
        customerId: customer.id || null,
    };
    res.status(200).send(new ApiResponse(200, obj));
});

appController.updateProfile = asyncHandler(async (req, res) => {
    const { name, email, address, city, state, pincode, customerId } = req.body;
    const result = await stripe.customers.update(customerId, {
        name,
        email,
        address: {
            line1: address,
            city,
            state,
            postal_code: pincode,
        },
    });
    res.status(200).send(new ApiResponse(200, "customer updated!"));
});

// handling payments here
appController.checkCustomer = asyncHandler(async (req, res) => {
    const user = await User.findById(req.id).select(
        "-password -refreshToken -boards -avatar"
    );
    if (user.plan !== "free")
        throw new ApiError(400, "You are already subscribed!");
    let obj = {
        priceId: process.env.SUBSCRIPTION_PRICE_ID,
    };
    if (user?.stripeCustomerId) {
        obj = {
            ...obj,
            customerId: user.stripeCustomerId,
            customerExists: true,
        };
    } else {
        obj = {
            ...obj,
            customerId: null,
            customerExists: false,
        };
    }
    res.status(200).send(new ApiResponse(200, obj));
});

appController.createPaymentIntent = asyncHandler(async (req, res) => {
    const {
        name,
        email,
        address,
        city,
        pincode,
        state,
        customerId: custId,
    } = req.body;
    const newCustomer = req.body.newCustomer;
    let customerId = custId;
    let customer;
    if (newCustomer) {
        customer = await stripe.customers.create({
            name,
            email,
            address: {
                line1: address,
                postal_code: pincode,
                city,
                state,
            },
            metadata: {
                userId: req.id,
            },
        });
        customerId = customer.id;
        await User.findByIdAndUpdate(req.id, {
            $set: {
                stripeCustomerId: customer.id,
            },
        });
    } else {
        customer = await stripe.customers.retrieve(customerId);
    }

    const price = await stripe.prices.retrieve(
        process.env.SUBSCRIPTION_PRICE_ID,
        {
            expand: ["product"],
        }
    );

    const subscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [
            {
                price: process.env.SUBSCRIPTION_PRICE_ID,
            },
        ],
        payment_behavior: "default_incomplete",
        cancel_at_period_end: true,
        payment_settings: { save_default_payment_method: "on_subscription" },
        expand: ["latest_invoice.payment_intent"],
        metadata: {
            userId: req.id,
            product: price.product.description,
            productId: price.product.id,
        },
    });

    res.status(200).send(
        new ApiResponse(200, {
            subsctiptionId: subscription.id,
            clientSecret:
                subscription.latest_invoice.payment_intent.client_secret,
            customerDetails: {
                name: customer.name,
                email: customer.email,
                address: {
                    line1: customer.address.line1,
                    postal_code: customer.address.postal_code,
                    city: customer.address.city,
                    state: customer.address.state,
                    country: "IN",
                },
            },
        })
    );
});

appController.handleStripeWebhooks = asyncHandler(async (req, res) => {
    let event;
    try {
        event = stripe.webhooks.constructEvent(
            req.body,
            req.headers["stripe-signature"],
            process.env.STRIPE_WEBHOOK_SECRET
        );
    } catch (err) {
        console.log(err);
        return res.sendStatus(400);
    }
    switch (event.type) {
        case "invoice.paid":
            const { userId, product, productId } =
                event.data.object.subscription_details.metadata;

            const { current_period_start, current_period_end } =
                await stripe.subscriptions.retrieve(
                    event.data.object.subscription
                );

            const { payment_method } = await stripe.charges.retrieve(
                event.data.object.charge
            );

            const subscription = new Subscription({
                userId,
                isActive: true,
                startDate: current_period_start * 1000,
                endDate: current_period_end * 1000,
                subscriptionId: event.data.object.subscription,
                amount: event.data.object.total / 100,
                product,
                productId,
                paymentMethod: payment_method,
                invoiceUrl: event.data.object.hosted_invoice_url,
            });
            subscription.save();

            await User.findByIdAndUpdate(userId, {
                $set: {
                    plan: "pro",
                },
            });
            break;

        case "customer.subscription.deleted":
            await User.findByIdAndUpdate(event.data.object.metadata.userId, {
                $set: {
                    plan: "free",
                },
            });
            await Subscription.updateOne(
                {
                    subscriptionId: event.data.object.id,
                },
                {
                    isActive: false,
                }
            );
            break;
        case "customer.deleted":
            await User.findByIdAndUpdate(event.data.object.metadata.userId, {
                $unset: {
                    stripeCustomerId: "",
                },
            });
            break;
        default:
            console.log("No events matched");
    }
    res.status(200).send({ success: true });
});

export default appController;
