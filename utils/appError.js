class AppError extends Error {
  constructor(message, statusCode, additionalData = null) {
    super(message);

    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";
    this.isOperational = true;
    this.additionalData = additionalData;

    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
