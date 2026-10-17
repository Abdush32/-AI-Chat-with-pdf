import jwt from "jsonwebtoken";
import { Op } from "sequelize";

import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

import Category from "../models/category.model.js";

const JWT_SECRET = process.env.JWT_SECRET;

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const addCategory = asyncHandler(async (req, res) => {
  const { name, description } = req.body;

  const existingCategory = await Category.findOne({ where: { name } });

  if (existingCategory) {
    throw new ApiError(409, "Category already exists");
  }

  const category = await Category.create({
    name,
    description,
  });

  return res.status(201).json(
    new ApiResponse(
      201,
      { category },
      "Category created successfully!"
    )
  );
});

const getAllCategories = asyncHandler(async (req, res) => {
  const page = parseInt(req.body.page) || 1;
  const limit = 10;

  if (page < 1) {
    throw new ApiError(400, "Page must be greater than 0");
  }

  const offset = (page - 1) * limit;

  const { count: totalCategories, rows: categories } = await Category.findAndCountAll({
    offset,
    limit,
    order: [['createdAt', 'DESC']]
  });

  const totalPages = Math.ceil(totalCategories / limit);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        categories,
        pagination: {
          currentPage: page,
          totalPages,
          totalCategories,
          limit,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      },
      "Categories fetched successfully!"
    )
  );
});

const getOneCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  if (!uuidRegex.test(id)) {
    throw new ApiError(400, "Invalid category ID");
  }
  
  const category = await Category.findByPk(id);

  if (!category) {
    throw new ApiError(404, "Category not found");
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      { category },
      "Category single fetched successfully!"
    )
  );
});

const updateCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, description } = req.body;

  if (!uuidRegex.test(id)) {
    throw new ApiError(400, "Invalid category ID");
  }

  if (!name) {
    throw new ApiError(400, "Name cannot be empty");
  }

  const category = await Category.findByPk(id);

  if (!category) {
    throw new ApiError(404, "Category not found");
  }

  if (name) {
    const existingCategory = await Category.findOne({
      where: {
        name,
        id: { [Op.ne]: id },
      }
    });

    if (existingCategory) {
      throw new ApiError(409, "Category name already exists");
    }

    category.name = name;
  }

  if (description) {
    category.description = description;
  }

  const updatedCategory = await category.save();

  return res.status(200).json(
    new ApiResponse(
      200,
      { category: updatedCategory },
      "Category updated successfully!"
    )
  );
});

const deleteCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;  
  
  if (!uuidRegex.test(id)) {
    throw new ApiError(400, "Invalid category ID");
  }
  
  const category = await Category.findByPk(id);

  if (!category) {
    throw new ApiError(404, "Category not found");
  }
  
  await category.destroy();

  return res.status(200).json(
    new ApiResponse(
      200,
      null,
      "Category deleted successfully!"
    )
  );
});

export { addCategory, getAllCategories, getOneCategory, updateCategory, deleteCategory };