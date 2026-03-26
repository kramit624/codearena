import User from "../models/auth.model.js";
import ApiResponse from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

// ---- Cookie options (reused across routes) ----
const cookieOptions = {
  httpOnly: true, // JS can't access via document.cookie → XSS protection
  secure: process.env.NODE_ENV === "production", // HTTPS only in prod
  sameSite: "strict",
};

// -------------------------------------------------------
// HELPER: generate both tokens + save refresh hash to DB
// -------------------------------------------------------
const generateAndSaveTokens = async (user) => {
  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();

  // Hash the refresh token before saving
  user.refreshTokenHash = User.hashToken(refreshToken);
  await user.save({ validateBeforeSave: false }); // skip validation on this save

  return { accessToken, refreshToken };
};

// -------------------------------------------------------
// REGISTER
// POST /api/v1/auth/register
// -------------------------------------------------------
export const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // 1. Basic validation
    if (!username || !email || !password) {
      return res
        .status(400)
        .json(new ApiResponse(400, "All fields are required"));
    }

    // 2. Check duplicate
    const existing = await User.findOne({ $or: [{ email }, { username }] });
    if (existing) {
      return res
        .status(409)
        .json(new ApiResponse(409, "Email or username already taken"));
    }

    // 3. Create user (password hashing happens in pre-save hook)
    const user = await User.create({ username, email, password });

    // 4. Generate tokens
    const { accessToken, refreshToken } = await generateAndSaveTokens(user);

    // 5. Send tokens as cookies + return user data
    return res
      .status(201)
      .cookie("accessToken", accessToken, {
        ...cookieOptions,
        maxAge: 15 * 60 * 1000,
      }) // 15 min
      .cookie("refreshToken", refreshToken, {
        ...cookieOptions,
        maxAge: 7 * 24 * 60 * 60 * 1000,
      }) // 7 days
      .json(
        new ApiResponse(201, "Registered successfully", {
          user: {
            _id: user._id,
            username: user.username,
            email: user.email,
            role: user.role,
          },
          accessToken,
        }),
      );
  } catch (error) {
    console.error("Register error:", error);
    return res.status(500).json(new ApiResponse(500, "Server error"));
  }
};

// -------------------------------------------------------
// LOGIN
// POST /api/v1/auth/login
// -------------------------------------------------------
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json(new ApiResponse(400, "Email and password required"));
    }

    // .select("+password") overrides the select:false we set on schema
    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res.status(401).json(new ApiResponse(401, "Invalid credentials"));
    }

    const isMatch = await user.isPasswordCorrect(password);
    if (!isMatch) {
      return res.status(401).json(new ApiResponse(401, "Invalid credentials"));
    }

    const { accessToken, refreshToken } = await generateAndSaveTokens(user);

    return res
      .status(200)
      .cookie("accessToken", accessToken, {
        ...cookieOptions,
        maxAge: 15 * 60 * 1000,
      })
      .cookie("refreshToken", refreshToken, {
        ...cookieOptions,
        maxAge: 7 * 24 * 60 * 60 * 1000,
      })
      .json(
        new ApiResponse(200, "Login successful", {
          user: {
            _id: user._id,
            username: user.username,
            email: user.email,
            role: user.role,
          },
          accessToken,
        }),
      );
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json(new ApiResponse(500, "Server error"));
  }
};

// -------------------------------------------------------
// LOGOUT
// POST /api/v1/auth/logout  (protected)
// -------------------------------------------------------
export const logout = async (req, res) => {
  try {
    // Clear refresh token hash from DB so old token is invalid forever
    await User.findByIdAndUpdate(req.user._id, { refreshTokenHash: null });

    return res
      .status(200)
      .clearCookie("accessToken", cookieOptions)
      .clearCookie("refreshToken", cookieOptions)
      .json(new ApiResponse(200, "Logged out successfully"));
  } catch (error) {
    return res.status(500).json(new ApiResponse(500, "Server error"));
  }
};

// -------------------------------------------------------
// REFRESH ACCESS TOKEN
// POST /api/v1/auth/refresh
// -------------------------------------------------------
export const refreshAccessToken = async (req, res) => {
  try {
    const incomingToken = req.cookies?.refreshToken;
    if (!incomingToken) {
      return res.status(401).json(new ApiResponse(401, "No refresh token"));
    }

    // 1. Verify the token signature + expiry
    const decoded = jwt.verify(incomingToken, process.env.REFRESH_TOKEN_SECRET);

    // 2. Fetch user with their stored hash
    const user = await User.findById(decoded._id).select("+refreshTokenHash");
    if (!user) {
      return res.status(401).json(new ApiResponse(401, "User not found"));
    }

    // 3. Compare hash of incoming token vs stored hash
    const incomingHash = User.hashToken(incomingToken);
    if (incomingHash !== user.refreshTokenHash) {
      // Token reuse detected! Someone is using an old token.
      // Invalidate everything for safety.
      user.refreshTokenHash = null;
      await user.save({ validateBeforeSave: false });
      return res
        .status(401)
        .json(
          new ApiResponse(401, "Token reuse detected. Please login again."),
        );
    }

    // 4. Issue fresh tokens (token rotation — every refresh gives a new refresh token)
    const { accessToken, refreshToken } = await generateAndSaveTokens(user);

    return res
      .status(200)
      .cookie("accessToken", accessToken, {
        ...cookieOptions,
        maxAge: 15 * 60 * 1000,
      })
      .cookie("refreshToken", refreshToken, {
        ...cookieOptions,
        maxAge: 7 * 24 * 60 * 60 * 1000,
      })
      .json(new ApiResponse(200, "Token refreshed", { accessToken }));
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res
        .status(401)
        .json(
          new ApiResponse(401, "Refresh token expired. Please login again."),
        );
    }
    return res.status(401).json(new ApiResponse(401, "Invalid refresh token"));
  }
};

// -------------------------------------------------------
// GET ME (who am I?)
// GET /api/v1/auth/me  (protected)
// -------------------------------------------------------
export const getMe = async (req, res) => {
  // req.user is already attached by verifyJWT middleware
  return res.status(200).json(
    new ApiResponse(200, "User fetched", {
      user: {
        _id: req.user._id,
        username: req.user.username,
        email: req.user.email,
        role: req.user.role,
      },
    }),
  );
};
