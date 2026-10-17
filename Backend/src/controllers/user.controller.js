import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import Auth from "../models/auth.model.js";
import { Op } from "sequelize";

const getAllUsers = asyncHandler(async (req, res) => {
  if (!req.user.isAdmin) {
    throw new ApiError(403, "Forbidden: Admin access required");
  }

  const { search, status, page = 1, limit = 10 } = req.query;
  const whereClause = {};

  if (search) {
    whereClause[Op.or] = [
      { fname: { [Op.iLike]: `%${search}%` } },
      { lname: { [Op.iLike]: `%${search}%` } },
      { email: { [Op.iLike]: `%${search}%` } },
    ];
  }

  if (status === 'active') {
    whereClause.isActive = true;
  } else if (status === 'inactive') {
    whereClause.isActive = false;
  }

  const offset = (page - 1) * limit;

  const { count, rows: users } = await Auth.findAndCountAll({
    where: whereClause,
    attributes: { exclude: ['password', 'refreshToken'] },
    order: [['createdAt', 'DESC']],
    limit: parseInt(limit),
    offset: parseInt(offset)
  });

  return res.status(200).json(
    new ApiResponse(200, {
      users,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      totalRecords: count
    }, "Users fetched successfully")
  );
});

const updateUser = asyncHandler(async (req, res) => {
  if (!req.user.isAdmin) {
    throw new ApiError(403, "Forbidden: Admin access required");
  }

  const { id } = req.params;
  const { fname, lname, email, password, isActive } = req.body;

  const user = await Auth.findByPk(id);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  if (fname !== undefined) user.fname = fname;
  if (lname !== undefined) user.lname = lname;
  if (email !== undefined) user.email = email;
  if (password) user.password = password;
  if (isActive !== undefined) user.isActive = isActive;

  await user.save();

  return res.status(200).json(
    new ApiResponse(200, user, "User updated successfully")
  );
});

const deleteUser = asyncHandler(async (req, res) => {
  if (!req.user.isAdmin) {
    throw new ApiError(403, "Forbidden: Admin access required");
  }

  const { id } = req.params;
  const user = await Auth.findByPk(id);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  await user.destroy();

  return res.status(200).json(
    new ApiResponse(200, null, "User deleted successfully")
  );
});

const toggleUserStatus = asyncHandler(async (req, res) => {
  if (!req.user.isAdmin) {
    throw new ApiError(403, "Forbidden: Admin access required");
  }

  const { id } = req.params;
  const { isActive } = req.body;

  const user = await Auth.findByPk(id);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  if (isActive !== undefined) {
    user.isActive = isActive;
    await user.save();
  }

  return res.status(200).json(
    new ApiResponse(200, user, "User status updated successfully")
  );
});

export { getAllUsers, updateUser, deleteUser, toggleUserStatus };
