import { Router } from "express";
import authController from "../Controllers/auth.controller.js";
import { validateSchema } from "../middlewares/validation.js";
import {
    googleLoginSchema,
    loginSchema,
    signUpSchema,
} from "../utils/validationSchema.js";
import { isAuth } from "../middlewares/auth.js";

const router = Router();

router.post("/sign-up", validateSchema(signUpSchema), authController.signUp);
router.post("/login", validateSchema(loginSchema), authController.login);
router.post(
    "/google/login",
    validateSchema(googleLoginSchema),
    authController.googleLogin
);
router.post("/logout", isAuth, authController.logout);
router.get("/refresh-token", authController.generateRefreshToken);

export default router;
