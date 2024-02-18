import Router from "express";
import appController from "../Controllers/app.controller.js";
import { isAuth } from "../middlewares/auth.js";
import { upload } from "../config/multer.js";
import {
    createBoardSchema,
    createPageSchema,
    customerSchema,
} from "../utils/validationSchema.js";
import { validateSchema } from "../middlewares/validation.js";

const router = Router();

router.post(
    "/create-board",
    isAuth,
    upload.single("image"),
    validateSchema(createBoardSchema),
    appController.createBoard
);

router.get("/boards", isAuth, appController.getBoards);
router.post("/delete-board", isAuth, appController.deleteBoard);

router.post(
    "/create-page",
    isAuth,
    validateSchema(createPageSchema),
    appController.createPage
);
router.post("/delete-page", isAuth, appController.deletePage);
router.get("/:boardId/pages", isAuth, appController.getPages);
router.post("/messages", isAuth, appController.getMessages);
router.post("/profile", isAuth, appController.profile);
router.post("/post-message", isAuth, appController.postMessage);
router.post("/page", isAuth, appController.getPage);
router.post("/page/update-content", isAuth, appController.updatePageContent);
router.post("/page/update-title", isAuth, appController.updatePageTitle);
router.post(
    "/page/update-cover",
    isAuth,
    upload.single("image"),
    appController.updatePageCoverImage
);
router.post("/page/delete-cover", isAuth, appController.deletePageCover);

// Payment Routes
router.get("/check-customer", isAuth, appController.checkCustomer);
router.post(
    "/checkout/customer-form",
    isAuth,
    validateSchema(customerSchema),
    appController.createPaymentIntent
);
router.post(
    "/update-form",
    isAuth,
    validateSchema(customerSchema),
    appController.updateProfile
);
// router.post("/stripe-webhook", appController.stripeWebhook);

export default router;
