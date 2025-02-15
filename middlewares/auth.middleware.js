const jwt = require("jsonwebtoken");

const secretKey = process.env.JWT_SECRET;
if (!secretKey) {
  throw new Error("JWT_SECRET is missing in environment variables.");
}

// Middleware to check if the user is logged in
const isAuthenticated = (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader?.startsWith("Bearer ") 
        ? authHeader.split(" ")[1] 
        : req.cookies?.ams_token; // Changed from token to ams_token
  
      if (!token) {
        return res.status(401).json({ message: "Unauthorized: Token is missing, please log in" });
      }
  
      jwt.verify(token, secretKey, (err, decoded) => {
        if (err) {
          return res.status(401).json({ message: "Unauthorized: Invalid or expired token" });
        }
        req.user = decoded;
        next();
      });
    } catch (error) {
      console.error("Auth Middleware Error:", error);
      res.status(500).json({ message: "Internal Server Error in authentication" });
    }
  };

// Middleware to check if the user is an admin
const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === "ADMIN") {
    next(); // User is an admin, proceed
  } else {
    res.status(403).json({ message: "Forbidden: Admin access required" });
  }
};

// Middleware to check if the user can create events (ADMIN or ALUMNI)
const isEventCreator = (req, res, next) => {
  if (req.user && (req.user.role === "ADMIN" || req.user.role === "ALUMNI")) {
    next(); // User is an admin or alumni, proceed
  } else {
    res.status(403).json({ message: "Forbidden: You don't have permission to create an event" });
  }
};

module.exports = { isAuthenticated, isAdmin, isEventCreator };
