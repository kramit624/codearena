import ApiResponse from "../utils/ApiResponse.js";

// Use this AFTER verifyJWT — req.user is already attached
const isAdmin = (req, res, next) => {
  if (req.user?.role !== "admin") {
    return res
      .status(403)
      .json(new ApiResponse(403, "Forbidden — admins only"));
  }
  next();
};

export default isAdmin;
