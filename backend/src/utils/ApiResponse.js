// Every API response from our server will look the same shape.
// Frontend will always know: { success, message, data }

class ApiResponse {
  constructor(statusCode, message, data = null) {
    this.statusCode = statusCode;
    this.success = statusCode < 400; // 200-399 = success, 400+ = error
    this.message = message;
    this.data = data;
  }
}

export default ApiResponse;
