import {Router} from 'express';
import { login, logout, updatePassword, signup } from '../controllers/auth.controller.js';
import { getProfile, updateProfile } from '../controllers/profile.controller.js';
import { getAllUsers, updateUser, deleteUser, toggleUserStatus } from '../controllers/user.controller.js';
import { getDashboardStats } from '../controllers/dashboard.controller.js';
import { authenticate } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";
const router = Router();
router.post('/signup', upload.single("profileImage"), signup);
router.post('/login', login);
router.post('/logout', authenticate, logout);
router.post('/update-password', authenticate, updatePassword);
router.get('/profile', authenticate, getProfile);
router.patch('/profile', authenticate, upload.single("profileImage"), updateProfile);



router.get('/dashboard-stats', authenticate, getDashboardStats);
router.get('/users', authenticate, getAllUsers);
router.patch('/users/:id', authenticate, updateUser);
router.delete('/users/:id', authenticate, deleteUser);
router.patch('/users/:id/status', authenticate, toggleUserStatus);

export default router;