import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { uploadFile as uploadToStorage } from "../services/storage.service.js";
import Auth from "../models/auth.model.js";

const getProfile = asyncHandler(async (req, res) => {
  const user = await Auth.findByPk(req.user.id, {
    attributes: { exclude: ['password', 'refreshToken'] }
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return res.status(200).json(
    new ApiResponse(200, user, "User profile fetched successfully")
  );
});

const updateProfile = asyncHandler(async (req, res) => {
  const { fname, lname } = req.body;
  const user = await Auth.findByPk(req.user.id);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  if (fname !== undefined) user.fname = fname;
  if (lname !== undefined) user.lname = lname;

  if (req.file) {
    try {
      const response = await uploadToStorage(req.file);
      user.profileImage = response.url;
    } catch (error) {
      console.error("Error uploading profile image:", error);
      throw new ApiError(500, "Error uploading profile image");
    }
  } else if (req.body.profileImage) {
    user.profileImage = req.body.profileImage;
  }

  await user.save();

  const updatedUser = await Auth.findByPk(user.id, {
    attributes: { exclude: ['password', 'refreshToken'] }
  });

  return res.status(200).json(
    new ApiResponse(200, updatedUser, "User profile updated successfully")
  );
});

export { getProfile, updateProfile };
