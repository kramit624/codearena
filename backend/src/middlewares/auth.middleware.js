import jwt from "jsonwebtoken";
import User from "../models/auth.model.js";
import ApiResponse from "../utils/ApiResponse.js";

const verifyJWT = async (req, res, next) => {
  try {
    // Token can come from cookie OR Authorization header
    // Cookie = browser clients | Header = mobile apps / Postman
    const token =
      req.cookies?.accessToken ||
      req.headers["authorization"]?.replace("Bearer ", "");

    if (!token) {
      return res
        .status(401)
        .json(new ApiResponse(401, "Unauthorized — no token"));
    }

    // Verify the token. If expired or tampered → throws error → goes to catch
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    // Fetch fresh user from DB (catches deactivated accounts)
    const user = await User.findById(decoded._id);
    if (!user) {
      return res
        .status(401)
        .json(new ApiResponse(401, "Unauthorized — user not found"));
    }

    // Attach user to request — available in all next controllers
    req.user = user;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json(new ApiResponse(401, "Access token expired"));
    }
    return res.status(401).json(new ApiResponse(401, "Invalid token"));
  }
};

export default verifyJWT;
