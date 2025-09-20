const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error for debugging
  if (process.env.NODE_ENV === 'development') {
    console.error('Error Stack:', err.stack);
    console.error('Error Details:', err);
  } else {
    console.error('Error:', err.message);
  }

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error = {
      message,
      status: 404,
      success: false,
    };
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    let message = 'Duplicate field value entered';
    const field = Object.keys(err.keyValue)[0];
    
    // Customize message based on field
    switch (field) {
      case 'email':
        message = 'Email address is already registered';
        break;
      case 'studentId':
        message = 'Student ID is already taken';
        break;
      case 'name':
        message = 'Name is already taken';
        break;
      case 'slug':
        message = 'URL slug is already taken';
        break;
      default:
        message = `${field} is already taken`;
    }

    error = {
      message,
      status: 400,
      success: false,
      field: field,
    };
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(val => val.message);
    error = {
      message: messages.join('. '),
      status: 400,
      success: false,
      errors: messages,
    };
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error = {
      message: 'Invalid token',
      status: 401,
      success: false,
      code: 'INVALID_TOKEN',
    };
  }

  if (err.name === 'TokenExpiredError') {
    error = {
      message: 'Token expired',
      status: 401,
      success: false,
      code: 'TOKEN_EXPIRED',
    };
  }

  // Multer errors (file upload)
  if (err.code === 'LIMIT_FILE_SIZE') {
    error = {
      message: 'File size too large',
      status: 400,
      success: false,
      maxSize: process.env.MAX_FILE_SIZE || '5MB',
    };
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    error = {
      message: 'Unexpected file field',
      status: 400,
      success: false,
    };
  }

  // MongoDB connection errors
  if (err.name === 'MongoNetworkError' || err.name === 'MongoTimeoutError') {
    error = {
      message: 'Database connection error. Please try again.',
      status: 503,
      success: false,
      code: 'DATABASE_ERROR',
    };
  }

  // Custom application errors
  if (err.isCustomError) {
    error = {
      message: err.message,
      status: err.statusCode || 400,
      success: false,
      code: err.code,
    };
  }

  // Rate limiting errors
  if (err.status === 429) {
    error = {
      message: 'Too many requests. Please try again later.',
      status: 429,
      success: false,
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: err.retryAfter || 900, // 15 minutes default
    };
  }

  // Permission/Authorization errors
  if (err.status === 403) {
    error = {
      message: err.message || 'Access denied',
      status: 403,
      success: false,
      code: 'ACCESS_DENIED',
    };
  }

  // Not found errors
  if (err.status === 404) {
    error = {
      message: err.message || 'Resource not found',
      status: 404,
      success: false,
      code: 'NOT_FOUND',
    };
  }

  // Default server error
  const status = error.status || err.statusCode || 500;
  const message = error.message || 'Internal server error';

  // Prepare error response
  const errorResponse = {
    success: false,
    message,
    ...(error.code && { code: error.code }),
    ...(error.field && { field: error.field }),
    ...(error.errors && { errors: error.errors }),
    ...(error.maxSize && { maxSize: error.maxSize }),
    ...(error.retryAfter && { retryAfter: error.retryAfter }),
  };

  // Add additional debugging info in development
  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = err.stack;
    errorResponse.originalError = err.name;
  }

  // Add request information for server errors
  if (status >= 500) {
    if (process.env.NODE_ENV === 'development') {
      errorResponse.request = {
        method: req.method,
        url: req.originalUrl,
        headers: req.headers,
        body: req.body,
        params: req.params,
        query: req.query,
      };
    }

    // Log server errors
    console.error('Server Error:', {
      error: err.message,
      stack: err.stack,
      method: req.method,
      url: req.originalUrl,
      user: req.user?.email || 'Anonymous',
      timestamp: new Date().toISOString(),
    });
  }

  res.status(status).json(errorResponse);
};

// Custom error class for application-specific errors
class AppError extends Error {
  constructor(message, statusCode, code) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
    this.isCustomError = true;
    this.code = code;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Helper functions to create specific errors
const createValidationError = (message, field) => {
  const error = new AppError(message, 400, 'VALIDATION_ERROR');
  error.field = field;
  return error;
};

const createNotFoundError = (resource = 'Resource') => {
  return new AppError(`${resource} not found`, 404, 'NOT_FOUND');
};

const createUnauthorizedError = (message = 'Authentication required') => {
  return new AppError(message, 401, 'UNAUTHORIZED');
};

const createForbiddenError = (message = 'Access denied') => {
  return new AppError(message, 403, 'FORBIDDEN');
};

const createConflictError = (message = 'Resource conflict') => {
  return new AppError(message, 409, 'CONFLICT');
};

const createTooManyRequestsError = (message = 'Too many requests', retryAfter = 900) => {
  const error = new AppError(message, 429, 'TOO_MANY_REQUESTS');
  error.retryAfter = retryAfter;
  return error;
};

module.exports = {
  errorHandler,
  AppError,
  createValidationError,
  createNotFoundError,
  createUnauthorizedError,
  createForbiddenError,
  createConflictError,
  createTooManyRequestsError,
};