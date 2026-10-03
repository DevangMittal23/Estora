import { ZodError } from 'zod';
export function errorHandler(error, _req, res, _next) {
  let status = error.statusCode || 500,
    code = error.code || 'INTERNAL_ERROR',
    message = error.message,
    details = error.details || [];
  if (error instanceof ZodError) {
    status = 400;
    code = 'VALIDATION_ERROR';
    details = error.issues;
    message = 'Check the highlighted fields';
  }
  if (error.name === 'CastError') {
    status = 400;
    code = 'VALIDATION_ERROR';
    message = 'Invalid resource ID';
  }
  if (error.name === 'ValidationError') {
    status = 400;
    code = 'VALIDATION_ERROR';
    message = 'Invalid field values';
  }
  if (error.name === 'MulterError') {
    status = 400;
    code = 'INVALID_FILE';
    message = 'Upload up to the allowed number of files, each no larger than 5 MB';
  }
  if (error.code === 11000) {
    status = 409;
    code = 'DUPLICATE_RESOURCE';
    message = 'This record already exists';
  }
  if (error.type === 'entity.parse.failed') {
    status = 400;
    code = 'INVALID_JSON';
    message = 'Invalid JSON body';
  }
  if (status >= 500) {
    console.error(error);
    if (!error.expose) message = 'Something went wrong. Please try again.';
  }
  res.status(status).json({ success: false, error: { code, message, details } });
}
