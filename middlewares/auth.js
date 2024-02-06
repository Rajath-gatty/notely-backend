import jwt from "jsonwebtoken";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const isAuth = asyncHandler(async (req, res, next) => {
    const accessToken = req.cookies.accessToken;
    const refreshToken = req.cookies.refreshToken;

    if (!accessToken && !refreshToken) {
        throw new ApiError(401, "Not Authorized");
    }

    const decodedVal = jwt.verify(
        accessToken,
        process.env.ACCESS_TOKEN_SECRET,
        (err, val) => {
            if (err) {
                throw new ApiError(401, "Not Authorized");
            }
            return val;
        }
    );

    req.id = decodedVal._id;
    req.plan = decodedVal.plan;
    next();
});
