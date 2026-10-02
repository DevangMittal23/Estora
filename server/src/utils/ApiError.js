export class ApiError extends Error {
  constructor(statusCode, code, message = code.replaceAll('_', ' '), details = []) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}
export function ensure(condition, status, code, message) {
  if (!condition) throw new ApiError(status, code, message);
}
