export class ApiError extends Error {
    constructor(
        statusCode = 500,
        message = "Something went wrong",
        errors = []
    ) {
        super(message);
        this.statusCode = statusCode;
        this.msg = this.message;
        this.success = false;
        this.errors = errors;
    }
}
