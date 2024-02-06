import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const isValidEmail = (email) => {
    const pattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return pattern.test(email);
};

const signUpValidation = asyncHandler((req, res, next) => {
    const body = req.body;
    // Validating req fields
    const fields = ["name", "email", "password"];
    const fieldErr = fields.reduce((acc, field) => {
        if (body[field]?.trim()) {
            if (field === "name") {
                if (body[field].length < 3) {
                    return [
                        ...acc,
                        {
                            fieldName: field,
                            msg: `Name must alteast be 3 characters`,
                        },
                    ];
                }
            }
            if (field === "password") {
                if (body[field].length < 6) {
                    return [
                        ...acc,
                        {
                            fieldName: field,
                            msg: `Password must alteast be 6 characters`,
                        },
                    ];
                }
            }
            if (field === "email") {
                if (!isValidEmail(body[field])) {
                    return [
                        ...acc,
                        {
                            fieldName: field,
                            msg: `Enter Valid Email`,
                        },
                    ];
                }
            }
            return acc;
        } else {
            return [
                ...acc,
                {
                    fieldName: field,
                    msg: `${field} is required`,
                },
            ];
        }
    }, []);

    if (fieldErr.length > 0) {
        throw new ApiError(400, "All Fields are required", fieldErr);
    }
    next();
});

const loginValidation = asyncHandler((req, res, next) => {
    const body = req.body;
    // Validating req fields
    const fields = ["email", "password"];
    const fieldErr = fields.reduce((acc, field) => {
        if (body[field]?.trim()) {
            if (field === "password") {
                if (body[field].length < 6) {
                    return [
                        ...acc,
                        {
                            fieldName: field,
                            msg: `Password must alteast be 6 characters`,
                        },
                    ];
                }
            }
            if (field === "email") {
                if (!isValidEmail(body[field])) {
                    return [
                        ...acc,
                        {
                            fieldName: field,
                            msg: `Enter Valid Email`,
                        },
                    ];
                }
            }
            return acc;
        } else {
            return [
                ...acc,
                {
                    fieldName: field,
                    msg: `${field} is required`,
                },
            ];
        }
    }, []);

    if (fieldErr.length > 0) {
        throw new ApiError(400, "All Fields are required", fieldErr);
    }
    next();
});

const googleLoginValidation = asyncHandler((req, res, next) => {
    const body = req.body;
    // Validating req fields
    const fields = ["email", "name"];
    const fieldErr = fields.reduce((acc, field) => {
        if (body[field]?.trim()) {
            if (field === "email") {
                if (!isValidEmail(body[field])) {
                    return [
                        ...acc,
                        {
                            fieldName: field,
                            msg: `Enter Valid Email`,
                        },
                    ];
                }
            }
            return acc;
        } else {
            return [
                ...acc,
                {
                    fieldName: field,
                    msg: `${field} is required`,
                },
            ];
        }
    }, []);

    if (fieldErr.length > 0) {
        throw new ApiError(400, "All Fields are required", fieldErr);
    }
    next();
});

const createBoardValidation = asyncHandler((req, res, next) => {
    const fields = ["name", "imageType", "boardType"];
    const errors = fields.reduce((acc, field) => {
        if (req.body[field].trim()) {
            if (field === "name") {
                if (req.body[field].length < 3) {
                    return [
                        ...acc,
                        {
                            fieldName: field,
                            msg: `${field} must atleast be 3 characters`,
                        },
                    ];
                }
            }
            if (field === "imageType") {
                if (req.body[field] === "url") {
                    if (!req.body["image"].trim()) {
                        return [
                            ...acc,
                            {
                                fieldName: "image",
                                msg: `image is required`,
                            },
                        ];
                    }
                }
            }
            return acc;
        } else {
            return [
                ...acc,
                {
                    fieldName: field,
                    msg: `${field} is required`,
                },
            ];
        }
    }, []);

    if (errors.length > 0) {
        throw new ApiError(400, "Board validation failed", errors);
    }
    next();
});

export {
    signUpValidation,
    loginValidation,
    createBoardValidation,
    googleLoginValidation,
};
