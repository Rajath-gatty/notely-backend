import { z } from "zod";

export const signUpSchema = z.object({
    name: z
        .string({
            required_error: "Name is required",
        })
        .min(3, "Name shoud be at least 3 characters"),
    email: z.string().email("Enter valid Email"),
    password: z.string().min(6, "Password must be atleast 6 characters"),
});

export const loginSchema = z.object({
    email: z
        .string({ required_error: "Email is required" })
        .email("Enter valid Email"),
    password: z.string().min(6, "Password must be atleast 6 characters"),
});

export const googleLoginSchema = z.object({
    email: z
        .string({ required_error: "Email is required" })
        .email("Enter valid Email"),
    name: z
        .string({
            required_error: "Name is required",
        })
        .min(3, "Name must be atleast 3 characters"),
});

export const createBoardSchema = z.object({
    title: z
        .string({ required_error: "title is required" })
        .min(3, "title must be atleast 3 characters"),
    boardType: z.enum(["personal", "collaborative"]),
    imageType: z.enum(["file", "url"]),
    image: z.any(),
});

export const createPageSchema = z.object({
    title: z.string(),
    parentId: z.string().nullable(),
    boardId: z.string(),
});

export const customerSchema = z.object({
    address: z.string().trim().min(1, "address is required").optional(),
    city: z.string().trim().min(1, "city is required").optional(),
    state: z.string().trim().min(1, "state is required").optional(),
    name: z.string().trim().min(1, "name is required").optional(),
    email: z.string().email("Enter valid Email").optional(),
    pincode: z
        .string()
        .min(5, "Pincode must be 6 characters")
        .max(8, "Pincode must be 8 characters")
        .optional(),
    newCustomer: z.boolean().optional(),
    customerId: z.string().optional(),
});
