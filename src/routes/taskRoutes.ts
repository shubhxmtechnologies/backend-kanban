import express from 'express';
const router = express.Router();
import {
    createTask,
    getTasks,
    getTask,
    updateTask,
    deleteTask,
    moveTask,
    toggleComplete,
    updateLabels,
    updateAssignees,
    updatePriority,
} from '../controllers/taskController.js';
import protect from '../middleware/authMiddleware.js';

// Nested routes
router.route('/lists/:listId/tasks').post(protect, createTask);
router.route('/boards/:boardId/tasks').get(protect, getTasks);

// Direct CRUD routes
router.route('/tasks/:id')
    .get(protect, getTask)
    .put(protect, updateTask)
    .delete(protect, deleteTask);

// Action routes
router.route('/tasks/:id/move').put(protect, moveTask);
router.route('/tasks/:id/toggle-complete').patch(protect, toggleComplete);
router.route('/tasks/:id/labels').put(protect, updateLabels);
router.route('/tasks/:id/assignees').put(protect, updateAssignees);
router.route('/tasks/:id/priority').patch(protect, updatePriority);

export default router;