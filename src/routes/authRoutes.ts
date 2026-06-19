import express from "express";
const router = express.Router();
import { login, register, getMe, updateMe } from "../controllers/authController.js"
import protect from "../middleware/authMiddleware.js";


router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.put("/update",protect,updateMe)

export default router;