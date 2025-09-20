const notFound = (req, res, next) => {
  const error = new Error(`Route not found - ${req.originalUrl}`);
  
  // Log the 404 for monitoring
  console.warn(`404 - Route not found: ${req.method} ${req.originalUrl} from ${req.ip}`);
  
  res.status(404).json({
    success: false,
    message: `Route not found - ${req.originalUrl}`,
    code: 'ROUTE_NOT_FOUND',
    availableRoutes: {
      auth: '/api/auth',
      users: '/api/users',
      clubs: '/api/clubs',
      events: '/api/events',
      attendance: '/api/attendance',
      feedback: '/api/feedback',
    },
    method: req.method,
    requestedRoute: req.originalUrl,
    timestamp: new Date().toISOString(),
  });
};

module.exports = notFound;