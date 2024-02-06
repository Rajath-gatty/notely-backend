export class ApiResponse {
    constructor(statusCode = 200, data = null) {
        this.statusCode = statusCode;
        this.data = data;
        this.success = statusCode < 400;
    }
}
