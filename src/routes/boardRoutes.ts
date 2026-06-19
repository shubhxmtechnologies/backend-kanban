import { Router } from "express";
import protect from "../middleware/authMiddleware.js"
import { createBoard, getBoard, getBoards, updateBoard, deleteBoard, addMember, removeMember } from "../controllers/boardController.js";

const router = Router();

router.route('/').post(protect, createBoard).get(protect, getBoards);
router.route('/:id').get(protect, getBoard).put(protect, updateBoard).delete(protect, deleteBoard);
router.route('/:id/members').put(protect, addMember);
router.route('/:id/members/:userId').delete(protect, removeMember);

export default router;