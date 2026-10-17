import {Router} from 'express';
import { addCategory,getAllCategories,getOneCategory,updateCategory,deleteCategory } from '../controllers/category.controller.js';
import { authenticate } from "../middlewares/auth.middleware.js";

import { validate } from "../middlewares/validate.middleware.js";
import { addCategorySchema } from "../validations/category.validation.js";


const router = Router();
router.post('/add', authenticate, validate(addCategorySchema), addCategory);
router.get('/list', authenticate, getAllCategories);
router.get('/:id', authenticate, getOneCategory);
router.patch('/update/:id', authenticate, updateCategory);
router.delete('/delete/:id', authenticate, deleteCategory);




export default router;