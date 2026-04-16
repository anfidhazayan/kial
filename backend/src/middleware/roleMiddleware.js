const AppError = require("../utils/AppError");

/**
 * Middleware to check if user has required role(s)
 * Usage: restrictTo('CSO', 'ENTITY_HEAD')
 */
const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError("You are not logged in", 401));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new AppError("You do not have permission to perform this action", 403)
      );
    }

    next();
  };
};

module.exports = { restrictTo };
