const rateLimit = require("express-rate-limit");

function authRateLimiter(message) {
  return rateLimit({
    windowMs: 60 * 1000,
    limit: 5,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    message: { error: message },
  });
}

const adminLoginLimiter = authRateLimiter("Too many failed login attempts. Please try again later.");
const shareVerifyLimiter = authRateLimiter("Too many failed password attempts. Please try again later.");

module.exports = {
  adminLoginLimiter,
  shareVerifyLimiter,
};
