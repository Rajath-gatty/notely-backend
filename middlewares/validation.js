import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const validateSchema = (schema) =>
    asyncHandler((req, res, next) => {
        const result = schema.safeParse(req.body);

        if (!result.success)
            throw new ApiError(400, "Validation failed", result.error.issues);

        next();
    });
