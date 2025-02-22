import { capitalizeFirstLetter } from "../Helper/formatChange.js";
import {
  failureResponse,
  successResponse,
} from "../MiddleWare/responseMiddleware.js";
import { validateAddCategory } from "../MiddleWare/userValidation.js";
import { Category } from "../Model/categoryModel.js";

// Main Controller
const addCategory = async (req, res) => {
  try {
    // Body Validation
    const { error } = validateAddCategory(req.body);
    if (error) {
      return failureResponse(res, 400, error.details[0].message, null);
    }
    // Capital First Letter
    const category = capitalizeFirstLetter(req.body.category);
    // Find in RECORDS
    const isPresent = await Category.findOne({ category });
    if (isPresent)
      return failureResponse(res, 400, `This category already exist!`);
    // Create this Category
    await Category.create({ category });
    // Send final success response
    return successResponse(res, 201, `Category added successfully!`);
  } catch (err) {
    failureResponse(res, 500, err.message, null);
  }
};

const category = async (req, res) => {
  try {
    const details = await Category.find().select("_id category").sort({
      createdAt: -1,
    });
    // Send final success response
    return successResponse(res, 201, `Category fetched successfully!`, {
      details,
    });
  } catch (err) {
    failureResponse(res, 500, err.message, null);
  }
};

const categoryById = async (req, res) => {
  try {
    const details = await Category.findById(req.params.id).select(
      "_id category"
    );
    if (!details)
      return failureResponse(res, 400, `This category does not exist!`);
    // Send final success response
    return successResponse(res, 201, `Category fetched successfully!`, {
      details,
    });
  } catch (err) {
    failureResponse(res, 500, err.message, null);
  }
};

const deleteCategory = async (req, res) => {
  try {
    await Category.findByIdAndDelete(req.params.id);
    // Send final success response
    return successResponse(res, 201, `Category deleted successfully!`);
  } catch (err) {
    failureResponse(res, 500, err.message, null);
  }
};

export { addCategory, category, categoryById, deleteCategory };
