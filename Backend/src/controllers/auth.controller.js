import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { uploadFile as uploadToStorage } from "../services/storage.service.js";
import Auth from "../models/auth.model.js";


const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await Auth.findByPk(userId);

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validate: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating access and refresh tokens"
    );
  }
};

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ApiError(400, "Email and password are required");
  }

  const user = await Auth.findOne({ where: { email } });

  if (!user) {
    throw new ApiError(404, "User not found!");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid credentials!");
  }

  const { accessToken, refreshToken } =
    await generateAccessAndRefreshTokens(user.id);

  const loggedInUser = await Auth.findByPk(user.id, {
    attributes: { exclude: ['password', 'refreshToken'] }
  });

  const options = {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "Login DONE"
      )
    );
});


const updatePassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword) {
    throw new ApiError(400, "Both old and new passwords are required");
  }

  const user = await Auth.findByPk(req.user.id);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const isOldPasswordCorrect = await user.isPasswordCorrect(oldPassword);

  if (!isOldPasswordCorrect) {
    throw new ApiError(400, "Invalid old password");
  }

  user.password = newPassword;
  await user.save();

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password updated successfully"));
});

const logout = asyncHandler(async (req, res) => {
  if (!req.user?.id) {
    throw new ApiError(401, "Unauthorized request");
  }

  await Auth.update(
    { refreshToken: null },
    { where: { id: req.user.id } }
  );

  const options = {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "Logout successful"));
});

const signup = asyncHandler(async (req, res) => {
  const { fname, lname, email, password } = req.body;

  if (!email || !password || !fname || !lname) {
    throw new ApiError(400, "First name, last name, email, and password are required");
  }

  const existingUser = await Auth.findOne({ where: { email } });

  if (existingUser) {
    throw new ApiError(409, "User with email already exists");
  }

  let profileImage = null;
  if (req.file) {
    try {
      const response = await uploadToStorage(req.file);
      profileImage = response.url;
    } catch (error) {
      console.error("Error uploading profile image:", error);
      throw new ApiError(500, "Error uploading profile image");
    }
  } else if (req.body.profileImage) {
    profileImage = req.body.profileImage;
  }

  const isAdmin = email === "abdushs54@gmail.com";

  const user = await Auth.create({
    fname,
    lname,
    email,
    password,
    profileImage,
    isAdmin
  });

  const createdUser = await Auth.findByPk(user.id, {
    attributes: { exclude: ['password', 'refreshToken'] }
  });

  return res.status(201).json(
    new ApiResponse(201, createdUser, "User registered successfully")
  );
});

export { signup, login, logout, updatePassword };