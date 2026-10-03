export class ApiError extends Error {
  constructor(statusCode, code, message = code.replaceAll('_', ' '), details = []) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.expose = true;
  }
}
export function ensure(condition, status, code, message) {
  if (!condition) throw new ApiError(status, code, message);
}
