import express from 'express';
const router = express.Router();
import {
    getComments,
    createComment,
    updateComment,
    deleteComment,
} from '../controllers/commentController.js';
import protect from '../middleware/authMiddleware.js';

// Nested under tasks
router.route('/tasks/:taskId/comments')
    .get(protect, getComments)
    .post(protect, createComment);

// Direct CRUD for single comment
router.route('/comments/:id')
    .put(protect, updateComment)
    .delete(protect, deleteComment);

export default router;
