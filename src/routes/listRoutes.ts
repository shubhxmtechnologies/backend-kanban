import express from 'express';
const router = express.Router();
import { createList, getLists, updateList, deleteList } from '../controllers/listController.js';
import protect from '../middleware/authMiddleware.js';

router.route('/boards/:boardId/lists').post(protect, createList).get(protect, getLists);

router.route('/lists/:id').put(protect, updateList).delete(protect, deleteList);

export default router;