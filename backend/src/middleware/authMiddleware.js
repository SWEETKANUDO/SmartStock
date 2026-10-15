
const jwt = require("jsonwebtoken");

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      message: "Access denied. Please login first.",
    });
  }

  const token = authHeader.slice(7);

  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET, {
      algorithms: ["HS256"],
    });

    const isValidObjectId = (value) =>
      typeof value === "string" && /^[a-f\d]{24}$/i.test(value);

    if (
      !decoded ||
      typeof decoded !== "object" ||
      !isValidObjectId(decoded.sub) ||
      !isValidObjectId(decoded.businessId)
    ) {
      return res.status(401).json({
        message: "Invalid authentication token",
      });
    }

    req.userId = decoded.sub;
    req.businessId = decoded.businessId;

    return next();
  } catch (error) {
    return res.status(401).json({
      message: "Invalid or expired token",
    });
  }
}

module.exports = authMiddleware;
