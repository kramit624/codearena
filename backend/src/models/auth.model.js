import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto"; // built-in Node module, no install needed

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, "Username is required"],
      unique: true,
      trim: true,
      lowercase: true,
      minlength: [3, "Username must be at least 3 characters"],
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      trim: true,
      lowercase: true,
    },

    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
      select: false, // NEVER return password field in any query by default
    },

    // We store a HASH of the refresh token, not the raw token.
    // If our DB leaks, attacker can't use a hashed token.
    refreshTokenHash: {
      type: String,
      select: false, // never expose this either
    },

    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
  },
  { timestamps: true },
); // auto adds createdAt, updatedAt

// -------------------------------------------------------
// HOOK: Hash password before saving to DB
// -------------------------------------------------------
// This runs automatically before every .save()
userSchema.pre("save", async function () {
  // Only re-hash if password was actually changed
  // (prevents re-hashing on profile updates)
  if (!this.isModified("password")) return;

  this.password = await bcrypt.hash(this.password, 12);
});

// -------------------------------------------------------
// METHOD: Compare entered password with hashed DB password
// -------------------------------------------------------
userSchema.methods.isPasswordCorrect = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// -------------------------------------------------------
// METHOD: Generate Access Token (short-lived, 15min)
// -------------------------------------------------------
userSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    {
      _id: this._id,
      email: this.email,
      username: this.username,
      role: this.role,
    },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN },
  );
};

// -------------------------------------------------------
// METHOD: Generate Refresh Token (long-lived, 7d)
// -------------------------------------------------------
userSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    { _id: this._id }, // minimal payload — just enough to identify user
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN },
  );
};

// -------------------------------------------------------
// STATIC: Hash a refresh token before storing/comparing
// -------------------------------------------------------
// We use SHA-256 (built-in crypto) — fast, no salt needed here
// because the token itself is already a long random string
userSchema.statics.hashToken = function (token) {
  return crypto.createHash("sha256").update(token).digest("hex");
};

const User = mongoose.model("User", userSchema);
export default User;
