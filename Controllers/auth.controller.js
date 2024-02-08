import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { v4 as uuid } from "uuid";
import { uploadToS3 } from "../utils/uploadToS3.js";
import { generateAvatar } from "../utils/generateAvatar.js";

const authController = {};

authController.signUp = asyncHandler(async (req, res) => {
    const { name, email, password } = req.body;

    const isUserExist = await User.findOne({ email: email });
    if (isUserExist) {
        throw new ApiError(403, "User already registered");
    }
    const [generatedImageFile, color] = generateAvatar(name);

    const file = {
        fileName: `${uuid()}.svg`,
        mimeType: "image/svg+xml",
        uploadFolder: "avatar",
        file: generatedImageFile,
    };
    const [imageUrl, hashedPassword] = await Promise.all([
        uploadToS3(file),
        bcrypt.hash(password, 10),
    ]);

    const user = new User({
        name,
        email,
        password: hashedPassword,
        boards: [],
        assignedColor: color,
        avatar: imageUrl,
    });
    user.save();
    res.send(new ApiResponse(200, "User Signed up successfully!"));
});

authController.login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) throw new ApiError(400, "No user found with this email");

    const isPassCorrect = await bcrypt.compare(password, user.password);
    if (!isPassCorrect) throw new ApiError(400, "Password is Incorrect");

    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    user.refreshToken.push(refreshToken);
    user.save();

    const userRes = {
        _id: user._id,
        name: user.name,
        email: user.email,
        plan: user.plan,
        avatar: user.avatar,
        assignedColor: user.assignedColor,
    };
    const cookieOptions = {
        secure: true,
        httpOnly: true,
        sameSite: "none",
        maxAge: Number(process.env.REFRESH_TOKEN_EXPIRY) * 1000,
    };
    res.cookie("accessToken", accessToken, cookieOptions)
        .cookie("refreshToken", refreshToken, cookieOptions)
        .cookie("isLoggedIn", true, {
            httpOnly: false,
            secure: true,
            sameSite: "none",
            maxAge: Number(process.env.REFRESH_TOKEN_EXPIRY) * 1000,
        })
        .cookie("user", JSON.stringify(userRes), {
            httpOnly: false,
            secure: true,
            sameSite: "none",
            maxAge: Number(process.env.REFRESH_TOKEN_EXPIRY) * 1000,
        })
        .send(new ApiResponse(200, userRes));
});

authController.googleLogin = asyncHandler(async (req, res) => {
    const { name, email } = req.body;

    let user;
    user = await User.findOne({ email });
    if (!user) {
        const [generatedImageFile, color] = generateAvatar(name);

        const file = {
            fileName: `${uuid()}.svg`,
            mimeType: "image/svg+xml",
            uploadFolder: "avatar",
            file: generatedImageFile,
        };
        const imageUrl = await uploadToS3(file);

        user = new User({
            name,
            email,
            boards: [],
            authClient: "google",
            assignedColor: color,
            avatar: imageUrl,
        });
        user.save();
    }

    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    user.refreshToken.push(refreshToken);
    user.save();

    const userRes = {
        _id: user._id,
        name: user.name,
        email: user.email,
        plan: user.plan,
        avatar: user.avatar,
        assignedColor: user.assignedColor,
    };
    const cookieOptions = {
        secure: true,
        httpOnly: true,
        sameSite: "none",
        maxAge: Number(process.env.REFRESH_TOKEN_EXPIRY) * 1000,
    };
    res.cookie("accessToken", accessToken, cookieOptions)
        .cookie("refreshToken", refreshToken, cookieOptions)
        .cookie("isLoggedIn", true, {
            httpOnly: false,
            secure: true,
            sameSite: "none",
            maxAge: Number(process.env.REFRESH_TOKEN_EXPIRY) * 1000,
        })
        .cookie("user", JSON.stringify(userRes), {
            httpOnly: false,
            secure: true,
            sameSite: "none",
            maxAge: Number(process.env.REFRESH_TOKEN_EXPIRY) * 1000,
        })
        .send(new ApiResponse(200, userRes));
});

authController.logout = asyncHandler(async (req, res) => {
    const refreshToken = req.cookies.refreshToken;

    await User.findByIdAndUpdate(req.id, {
        $pull: { refreshToken: refreshToken },
    });
    console.log("User logged out ");
    res.clearCookie("accessToken")
        .clearCookie("refreshToken")
        .clearCookie("isLoggedIn")
        .clearCookie("user")
        .send({ success: true, msg: "User logged out!" });
});

authController.generateRefreshToken = asyncHandler(async (req, res) => {
    const incommingToken = req.cookies?.refreshToken;
    if (!incommingToken)
        throw new ApiError(401, "Not refresh token Found! Not Authorized");

    const refreshTokenVal = jwt.verify(
        incommingToken,
        process.env.REFRESH_TOKEN_SECRET,
        (err, val) => {
            if (err)
                throw new ApiError(401, "Refresh Token is Invalid or Expired");
            return val;
        }
    );

    const user = await User.findById(refreshTokenVal._id).select(
        "-password -boards -createdAt -updatedAt"
    );

    if (!user) throw new ApiError(401, "Not Authorized");

    if (!user.refreshToken.some((token) => token === incommingToken)) {
        throw new ApiError(401, "Refresh token dosen't match");
    }

    const newAccessToken = user.generateAccessToken();
    const newRefreshToken = user.generateRefreshToken();
    const newTokenArr = user.refreshToken.filter(
        (token) => token !== incommingToken
    );
    newTokenArr.push(newRefreshToken);
    await User.findOneAndUpdate(
        { _id: user._id },
        {
            $set: {
                refreshToken: newTokenArr,
            },
        }
    );

    const userRes = {
        _id: user._id,
        name: user.name,
        email: user.email,
        plan: user.plan,
        avatar: user.avatar,
        assignedColor: user.assignedColor,
    };

    const cookieOptions = {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        maxAge: Number(process.env.REFRESH_TOKEN_EXPIRY) * 1000,
    };
    res.cookie("accessToken", newAccessToken, cookieOptions)
        .cookie("refreshToken", newRefreshToken, cookieOptions)
        .cookie("isLoggedIn", true, {
            httpOnly: false,
            secure: true,
            sameSite: "none",
            maxAge: Number(process.env.REFRESH_TOKEN_EXPIRY) * 1000,
        })
        .cookie("user", JSON.stringify(userRes), {
            maxAge: cookieOptions.maxAge,
            httpOnly: false,
            secure: true,
            sameSite: "none",
        })
        .send(new ApiResponse(200, "AccessToken generated!"));
});

export default authController;
