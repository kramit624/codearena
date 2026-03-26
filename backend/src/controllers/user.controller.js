import Submission from "../models/submission.model.js";
import User from "../models/auth.model.js";
import ApiResponse from "../utils/ApiResponse.js";

// -------------------------------------------------------
// GET MY SOLVED QUESTIONS
// GET /api/v1/users/solved
// Returns all unique questions the user has solved (accepted)
// -------------------------------------------------------
export const getSolvedQuestions = async (req, res) => {
  try {
    const userId = req.user._id;

    // Find all accepted submissions for this user
    // Populate question to get title, tags, difficulty
    const acceptedSubmissions = await Submission.find({
      userId,
      status: "accepted",
    })
      .populate("questionId", "title tags difficulty")
      .sort({ createdAt: -1 });

    // Remove duplicate questions — user may have solved same question multiple times
    // Keep only the first (most recent) submission per question
    const seenQuestionIds = new Set();
    const uniqueSolved = [];

    for (const sub of acceptedSubmissions) {
      // question might be deleted — skip if null
      if (!sub.questionId) continue;

      const qId = sub.questionId._id.toString();
      if (seenQuestionIds.has(qId)) continue;

      seenQuestionIds.add(qId);
      uniqueSolved.push({
        questionId: sub.questionId._id,
        title: sub.questionId.title,
        tags: sub.questionId.tags,
        difficulty: sub.questionId.difficulty,
        solvedAt: sub.createdAt,
        submissionId: sub._id,
        language: sub.language,
      });
    }

    return res.status(200).json(
      new ApiResponse(200, "Solved questions fetched", {
        totalSolved: uniqueSolved.length,
        solved: uniqueSolved,
      }),
    );
  } catch (err) {
    console.error("getSolvedQuestions error:", err);
    return res.status(500).json(new ApiResponse(500, "Server error"));
  }
};

// -------------------------------------------------------
// GET MY PROFILE
// GET /api/v1/users/me
// Returns the current user's basic profile (no password)
// -------------------------------------------------------
export const getMyProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId).select(
      "_id username email role createdAt",
    );
    if (!user)
      return res.status(404).json(new ApiResponse(404, "User not found"));

    return res
      .status(200)
      .json(new ApiResponse(200, "Profile fetched", { user }));
  } catch (err) {
    console.error("getMyProfile error:", err);
    return res.status(500).json(new ApiResponse(500, "Server error"));
  }
};

// -------------------------------------------------------
// UPDATE PROFILE (username and/or password)
// PATCH /api/v1/users/me
// Body: { username?, currentPassword?, newPassword? }
// If changing password, currentPassword is required. Username change must be unique.
// -------------------------------------------------------
export const updateUser = async (req, res) => {
  try {
    const userId = req.user._id;
    const { username, currentPassword, newPassword } = req.body;

    if (!username && !newPassword) {
      return res
        .status(400)
        .json(
          new ApiResponse(
            400,
            "Nothing to update. Provide username or newPassword.",
          ),
        );
    }

    const user = await User.findById(userId).select("username password");
    if (!user)
      return res.status(404).json(new ApiResponse(404, "User not found"));

    // Handle username update
    if (username && username !== user.username) {
      // simple validation
      if (typeof username !== "string" || username.trim().length < 3)
        return res
          .status(400)
          .json(new ApiResponse(400, "Username must be at least 3 characters"));

      // check uniqueness
      const exists = await User.findOne({ username: username.toLowerCase() });
      if (exists && exists._id.toString() !== userId.toString()) {
        return res
          .status(409)
          .json(new ApiResponse(409, "Username already taken"));
      }

      user.username = username.toLowerCase();
    }

    // Handle password update
    if (newPassword) {
      if (!currentPassword)
        return res
          .status(400)
          .json(
            new ApiResponse(
              400,
              "currentPassword is required to change password",
            ),
          );

      const ok = await user.isPasswordCorrect(currentPassword);
      if (!ok)
        return res
          .status(401)
          .json(new ApiResponse(401, "Current password is incorrect"));

      if (typeof newPassword !== "string" || newPassword.length < 6)
        return res
          .status(400)
          .json(
            new ApiResponse(400, "New password must be at least 6 characters"),
          );

      user.password = newPassword; // will be hashed by pre-save hook
    }

    await user.save();

    return res.status(200).json(new ApiResponse(200, "Profile updated"));
  } catch (err) {
    console.error("updateUser error:", err);
    return res.status(500).json(new ApiResponse(500, "Server error"));
  }
};

// -------------------------------------------------------
// DELETE MY ACCOUNT
// DELETE /api/v1/users/me
// Body: { currentPassword }
// Require currentPassword to prevent accidental deletions.
// Deletes user record and related submissions, and clears auth cookies.
// -------------------------------------------------------
export const deleteUser = async (req, res) => {
  try {
    const userId = req.user._id;
    const { currentPassword } = req.body;

    if (!currentPassword) {
      return res
        .status(400)
        .json(
          new ApiResponse(400, "currentPassword is required to delete account"),
        );
    }

    // fetch user with password for verification
    const user = await User.findById(userId).select("password");
    if (!user)
      return res.status(404).json(new ApiResponse(404, "User not found"));

    const ok = await user.isPasswordCorrect(currentPassword);
    if (!ok)
      return res
        .status(401)
        .json(new ApiResponse(401, "Current password is incorrect"));

    // delete related submissions
    await Submission.deleteMany({ userId });

    // delete the user
    await User.deleteOne({ _id: userId });

    // clear auth cookies (if any)
    try {
      res.clearCookie("accessToken");
      res.clearCookie("refreshToken");
    } catch (e) {
      // non-fatal
    }

    return res.status(200).json(new ApiResponse(200, "Account deleted"));
  } catch (err) {
    console.error("deleteUser error:", err);
    return res.status(500).json(new ApiResponse(500, "Server error"));
  }
};

// -------------------------------------------------------
// GET SUBMISSIONS FOR HEATMAP
// GET /api/v1/users/submissions/heatmap
// Returns minimal submission list (submittedAt) for the past year
// -------------------------------------------------------
export const getSubmissionsHeatmap = async (req, res) => {
  try {
    const userId = req.user._id;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const oneYearAgo = new Date(today);
    oneYearAgo.setDate(today.getDate() - 365);

    const subs = await Submission.find({
      userId,
      createdAt: { $gte: oneYearAgo },
    })
      .select("createdAt")
      .sort({ createdAt: 1 })
      .lean();

    // Normalize to the field name front-end expects (submittedAt)
    const submissions = subs.map((s) => ({ submittedAt: s.createdAt }));

    return res
      .status(200)
      .json(new ApiResponse(200, "Heatmap data fetched", { submissions }));
  } catch (err) {
    console.error("getSubmissionsHeatmap error:", err);
    return res.status(500).json(new ApiResponse(500, "Server error"));
  }
};

// -------------------------------------------------------
// GET MY SUBMISSION HISTORY
// GET /api/v1/users/submissions
// All submissions (accepted + failed + wrong) with pagination
// -------------------------------------------------------
export const getMySubmissions = async (req, res) => {
  try {
    const userId = req.user._id;

    // Pagination via query params — ?page=1&limit=20
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 20);
    const skip = (page - 1) * limit;

    const [submissions, total] = await Promise.all([
      Submission.find({ userId })
        .populate("questionId", "title tags difficulty")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Submission.countDocuments({ userId }),
    ]);

    const formatted = submissions.map((sub) => ({
      submissionId: sub._id,
      jobId: sub.jobId,
      question: sub.questionId
        ? {
            questionId: sub.questionId._id,
            title: sub.questionId.title,
            tags: sub.questionId.tags,
            difficulty: sub.questionId.difficulty,
          }
        : null,
      status: sub.status,
      language: sub.language,
      passedCount: sub.passedCount,
      totalCount: sub.totalCount,
      executionTime: sub.executionTime,
      submittedAt: sub.createdAt,
    }));

    return res.status(200).json(
      new ApiResponse(200, "Submission history fetched", {
        total,
        page,
        totalPages: Math.ceil(total / limit),
        submissions: formatted,
      }),
    );
  } catch (err) {
    console.error("getMySubmissions error:", err);
    return res.status(500).json(new ApiResponse(500, "Server error"));
  }
};

// -------------------------------------------------------
// GET MY STATS
// GET /api/v1/users/stats
// Summary numbers for profile page / analytics
// -------------------------------------------------------
export const getMyStats = async (req, res) => {
  try {
    const userId = req.user._id;

    // Run all aggregations in parallel
    const [
      totalSubmissions,
      acceptedSubmissions,
      languageBreakdown,
      difficultyBreakdown,
    ] = await Promise.all([
      // Total submissions count
      Submission.countDocuments({ userId }),

      // Accepted submissions
      Submission.countDocuments({ userId, status: "accepted" }),

      // How many submissions per language
      Submission.aggregate([
        { $match: { userId } },
        { $group: { _id: "$language", count: { $sum: 1 } } },
      ]),

      // Solved questions breakdown by difficulty
      // Join with Question to get difficulty
      Submission.aggregate([
        { $match: { userId, status: "accepted" } },
        {
          $lookup: {
            from: "questions",
            localField: "questionId",
            foreignField: "_id",
            as: "question",
          },
        },
        { $unwind: "$question" },
        // Deduplicate — one question counts once even if solved multiple times
        {
          $group: {
            _id: "$questionId",
            difficulty: { $first: "$question.difficulty" },
          },
        },
        {
          $group: {
            _id: "$difficulty",
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    // Unique solved questions count (no duplicates)
    const uniqueSolvedIds = await Submission.distinct("questionId", {
      userId,
      status: "accepted",
    });

    // Format difficulty breakdown into clean object
    const difficultyMap = { easy: 0, medium: 0, hard: 0 };
    difficultyBreakdown.forEach((d) => {
      if (d._id) difficultyMap[d._id] = d.count;
    });

    // Format language breakdown
    const languageMap = {};
    languageBreakdown.forEach((l) => {
      if (l._id) languageMap[l._id] = l.count;
    });

    // Acceptance rate
    const acceptanceRate =
      totalSubmissions > 0
        ? Math.round((acceptedSubmissions / totalSubmissions) * 100)
        : 0;

    return res.status(200).json(
      new ApiResponse(200, "User stats fetched", {
        totalSubmissions,
        totalSolved: uniqueSolvedIds.length,
        acceptanceRate: `${acceptanceRate}%`,
        solvedByDifficulty: difficultyMap,
        submissionsByLanguage: languageMap,
      }),
    );
  } catch (err) {
    console.error("getMyStats error:", err);
    return res.status(500).json(new ApiResponse(500, "Server error"));
  }
};

export const getLeaderboard = async (req, res) => {
  try {
    const users = await Submission.aggregate([
      // Group by userId
      {
        $group: {
          _id: "$userId",
          totalSubmissions: { $sum: 1 },
          acceptedCount: {
            $sum: { $cond: [{ $eq: ["$status", "accepted"] }, 1, 0] },
          },
          solvedQuestions: {
            $addToSet: {
              $cond: [{ $eq: ["$status", "accepted"] }, "$questionId", null],
            },
          },
        },
      },
      // Lookup user info
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      // Lookup question difficulties for solved problems
      {
        $lookup: {
          from: "questions",
          localField: "solvedQuestions",
          foreignField: "_id",
          as: "solvedDetails",
        },
      },
      // Project final shape
      {
        $project: {
          username: "$user.username",
          email: "$user.email",
          totalSubmissions: 1,
          totalSolved: {
            $size: {
              $filter: {
                input: "$solvedQuestions",
                cond: { $ne: ["$$this", null] },
              },
            },
          },
          acceptanceRate: {
            $concat: [
              {
                $toString: {
                  $round: [
                    {
                      $multiply: [
                        {
                          $divide: [
                            "$acceptedCount",
                            { $max: ["$totalSubmissions", 1] },
                          ],
                        },
                        100,
                      ],
                    },
                    1,
                  ],
                },
              },
              "%",
            ],
          },
          solvedByDifficulty: {
            easy: {
              $size: {
                $filter: {
                  input: "$solvedDetails",
                  cond: { $eq: ["$$this.difficulty", "easy"] },
                },
              },
            },
            medium: {
              $size: {
                $filter: {
                  input: "$solvedDetails",
                  cond: { $eq: ["$$this.difficulty", "medium"] },
                },
              },
            },
            hard: {
              $size: {
                $filter: {
                  input: "$solvedDetails",
                  cond: { $eq: ["$$this.difficulty", "hard"] },
                },
              },
            },
          },
        },
      },
      // Sort by totalSolved descending
      { $sort: { totalSolved: -1, acceptedCount: -1 } },
      { $limit: 100 },
    ]);

    return res
      .status(200)
      .json(new ApiResponse(200, "Leaderboard fetched", { users }));
  } catch (err) {
    console.error("getLeaderboard error:", err);
    return res.status(500).json(new ApiResponse(500, "Server error"));
  }
};