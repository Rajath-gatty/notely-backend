import { Router } from "express";
import authController from "../Controllers/auth.controller.js";
import {
    googleLoginValidation,
    loginValidation,
    signUpValidation,
} from "../middlewares/validation.js";
import { isAuth } from "../middlewares/auth.js";

const router = Router();

router.post("/sign-up", signUpValidation, authController.signUp);
router.post("/login", loginValidation, authController.login);
router.post("/google/login", googleLoginValidation, authController.googleLogin);
router.post("/logout", isAuth, authController.logout);
router.get("/refresh-token", authController.generateRefreshToken);

export default router;
