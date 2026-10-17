import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import Auth from "../models/auth.model.js";

const getDashboardStats = asyncHandler(async (req, res) => {
  if (!req.user.isAdmin) {
    throw new ApiError(403, "Forbidden: Admin access required");
  }

  const totalUsers = await Auth.count();
  const activeUsers = await Auth.count({ where: { isActive: true } });
  const inactiveUsers = await Auth.count({ where: { isActive: false } });

  const recentUsers = await Auth.findAll({
    attributes: { exclude: ['password', 'refreshToken'] },
    order: [['createdAt', 'DESC']],
    limit: 5
  });

  return res.status(200).json(
    new ApiResponse(200, {
      totalUsers,
      activeUsers,
      inactiveUsers,
      recentUsers
    }, "Dashboard stats fetched successfully")
  );
});

export { getDashboardStats };
