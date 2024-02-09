import Router from "express";
import appController from "../Controllers/app.controller.js";
import { isAuth } from "../middlewares/auth.js";
import { createBoardValidation } from "../middlewares/validation.js";
import { upload } from "../config/multer.js";

const router = Router();

router.post(
    "/create-board",
    isAuth,
    upload.single("image"),
    createBoardValidation,
    appController.createBoard
);

router.get("/boards", isAuth, appController.getBoards);

router.post("/create-page", isAuth, appController.createPage);
router.post("/delete-page", isAuth, appController.deletePage);
router.get("/:boardId/pages", isAuth, appController.getPages);
router.post("/messages", isAuth, appController.getMessages);
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

router.get("/test", appController.test);

export default router;
