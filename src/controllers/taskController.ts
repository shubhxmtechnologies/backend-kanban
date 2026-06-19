import type { Response } from 'express';
import Task from '../models/Task.js';
import List from '../models/List.js';
import Board from '../models/Board.js';
import type { AuthRequest } from './authController.js';

// ─── helpers ───────────────────────────────────────────────────────────────────

/** Verify the requesting user is a member of the board. */
const authorizeBoard = async (req: AuthRequest, res: Response, boardId: unknown) => {
    if (!req.user) {
        res.status(401).json({ message: 'Not authorized, user missing' });
        return null;
    }

    const board = await Board.findById(boardId);
    if (!board) {
        res.status(404).json({ message: 'Board not found' });
        return null;
    }

    if (!board.members.some(m => m.toString() === req.user!._id.toString())) {
        res.status(403).json({ message: 'Not authorized' });
        return null;
    }

    return board;
};

/** Find task + authorize its board in one step. */
const findTaskAndAuthorize = async (req: AuthRequest, res: Response) => {
    if (!req.params.id) {
        res.status(400).json({ message: 'Task ID is required' });
        return null;
    }

    const task = await Task.findById(req.params.id);
    if (!task) {
        res.status(404).json({ message: 'Task not found' });
        return null;
    }

    const board = await authorizeBoard(req, res, task.board);
    if (!board) return null;

    return { task, board };
};

// ─── CRUD ──────────────────────────────────────────────────────────────────────

// @desc    Create a task in a list
// @route   POST /api/lists/:listId/tasks
const createTask = async (req: AuthRequest, res: Response) => {
    try {
        if (typeof req.body.title !== 'string' || !req.body.title.trim()) {
            return res.status(400).json({ message: 'Task title is required' });
        }

        if (!req.params.listId) {
            return res.status(400).json({ message: 'List ID is required' });
        }

        const list = await List.findById(req.params.listId);

        if (!list) {
            return res.status(404).json({ message: 'List not found' });
        }

        const board = await authorizeBoard(req, res, list.board);
        if (!board) return;

        // Shift existing tasks down to make room at the top
        await Task.updateMany(
            { list: list._id },
            { $inc: { position: 1 } }
        );

        // Accept all schema fields from the request body
        const task = await Task.create({
            title: req.body.title.trim(),
            description:
                typeof req.body.description === 'string'
                    ? req.body.description.trim()
                    : '',

            list: list._id,
            board: list.board,

            position: 0,

            assignedTo: Array.isArray(req.body.assignedTo)
                ? req.body.assignedTo
                : [],

            labels: Array.isArray(req.body.labels)
                ? req.body.labels.filter((l: unknown) => typeof l === 'string')
                : [],

            priority: ['low', 'medium', 'high'].includes(req.body.priority)
                ? req.body.priority
                : 'medium',

            completed:
                typeof req.body.completed === 'boolean'
                    ? req.body.completed
                    : false,
        });

        const populatedTask = await Task.findById(task._id).populate('assignedTo', 'name email avatar').populate("list", "title description");
        const io = req.app.get('io');
        const room = io.to(task.board.toString());
        const target = req.socketId ? room.except(req.socketId) : room;
        target.emit('task-created', { task: populatedTask, user: { _id: req.user!._id, name: req.user!.name } });
        res.status(201).json(populatedTask);
    } catch (error) {
        res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : String(error),
        });
    }
};

// @desc    Get all tasks for a board
// @route   GET /api/boards/:boardId/tasks
const getTasks = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.params.boardId) {
            return res.status(400).json({ message: 'Board ID is required' });
        }

        const board = await authorizeBoard(req, res, req.params.boardId);
        if (!board) return;

        const tasks = await Task.find({ board: board._id })
            .populate('assignedTo', 'name email avatar').populate("list", "title description")
            .sort({ position: 1 });
        res.json(tasks);
    } catch (error) {
        res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : String(error),
        });
    }
};

// @desc    Get a single task by ID
// @route   GET /api/tasks/:id
const getTask = async (req: AuthRequest, res: Response) => {
    try {
        const result = await findTaskAndAuthorize(req, res);
        if (!result) return;

        await result.task.populate('assignedTo', 'name email avatar');
        const populated = await result.task.populate("list", "title description");

        res.json(populated);
    } catch (error) {
        res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : String(error),
        });
    }
};

// @desc    Update a task (supports ALL schema fields)
// @route   PUT /api/tasks/:id
const updateTask = async (req: AuthRequest, res: Response) => {
    try {
        const result = await findTaskAndAuthorize(req, res);
        if (!result) return;

        const { task } = result;

        // --- title ---
        if (typeof req.body.title === 'string') {
            const trimmed = req.body.title.trim();
            if (!trimmed) {
                return res.status(400).json({ message: 'Task title cannot be empty' });
            }
            task.title = trimmed;
        }

        // --- description ---
        if (typeof req.body.description === 'string') {
            task.description = req.body.description.trim();
        }

        // --- assignedTo ---
        if (Array.isArray(req.body.assignedTo)) {
            task.assignedTo = req.body.assignedTo;
        }

        // --- labels ---
        if (Array.isArray(req.body.labels)) {
            task.labels = req.body.labels.filter(
                (l: unknown) => typeof l === 'string',
            );
        }

        // --- priority ---
        if (req.body.priority !== undefined) {
            if (!['low', 'medium', 'high'].includes(req.body.priority)) {
                return res.status(400).json({
                    message: 'Priority must be low, medium, or high',
                });
            }
            task.priority = req.body.priority;
        }

        // --- completed ---
        if (typeof req.body.completed === 'boolean') {
            task.completed = req.body.completed;
        }

        const updatedTask = await task.save();
        const populatedTask = await Task.findById(updatedTask._id).populate('assignedTo', 'name email avatar').populate("list", "title description");
        const io = req.app.get('io');
        const room = io.to(task.board.toString());
        const target = req.socketId ? room.except(req.socketId) : room;
        target.emit('task-updated', { task: populatedTask, user: { _id: req.user!._id, name: req.user!.name } });
        res.json(populatedTask);
    } catch (error) {
        res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : String(error),
        });
    }
};

// @desc    Delete a task
// @route   DELETE /api/tasks/:id
const deleteTask = async (req: AuthRequest, res: Response) => {
    try {
        const result = await findTaskAndAuthorize(req, res);
        if (!result) return;

        const { task } = result;

        // Re-order remaining tasks in the same list
        await Task.updateMany(
            { list: task.list, position: { $gt: task.position } },
            { $inc: { position: -1 } },
        );

        await Task.findByIdAndDelete(task._id);

        const io = req.app.get('io');
        const room = io.to(task.board.toString());
        const target = req.socketId ? room.except(req.socketId) : room;
        target.emit('task-deleted', { taskId: task._id, user: { _id: req.user!._id, name: req.user!.name } });
        res.json({ message: 'Task deleted' });
    } catch (error) {
        res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : String(error),
        });
    }
};

// ─── MOVE ──────────────────────────────────────────────────────────────────────

// @desc    Move a task to a different list/position
// @route   PUT /api/tasks/:id/move
const moveTask = async (req: AuthRequest, res: Response) => {
    try {
        const result = await findTaskAndAuthorize(req, res);
        if (!result) return;

        const { task } = result;
        const { listId, position } = req.body;

        if (!listId || position === undefined) {
            return res
                .status(400)
                .json({ message: 'List ID and position are required' });
        }

        const oldListId = task.list;
        const newListId = listId || task.list;

        // If moving to a different list
        if (oldListId.toString() !== newListId.toString()) {
            await Task.updateMany(
                { list: oldListId, position: { $gt: task.position } },
                { $inc: { position: -1 } },
            );
            await Task.updateMany(
                { list: newListId, position: { $gte: position } },
                { $inc: { position: 1 } },
            );
        } else {
            // Same list, reorder
            if (position > task.position) {
                await Task.updateMany(
                    {
                        list: oldListId,
                        position: { $gt: task.position, $lte: position },
                    },
                    { $inc: { position: -1 } },
                );
            } else if (position < task.position) {
                await Task.updateMany(
                    {
                        list: oldListId,
                        position: { $gte: position, $lt: task.position },
                    },
                    { $inc: { position: 1 } },
                );
            }
        }

        task.list = newListId;
        task.position = position;
        const updatedTask = await task.save();
        const populatedTask = await Task.findById(updatedTask._id).populate('assignedTo', 'name email avatar').populate("list", "title description");
        const io = req.app.get('io');
        const room = io.to(task.board.toString());
        const target = req.socketId ? room.except(req.socketId) : room;
        target.emit('task-moved', { task: populatedTask, user: { _id: req.user!._id, name: req.user!.name } });
        res.json(populatedTask);
    } catch (error) {
        res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : String(error),
        });
    }
};

// ─── FIELD-SPECIFIC ACTIONS ────────────────────────────────────────────────────

// @desc    Toggle task completion
// @route   PATCH /api/tasks/:id/toggle-complete
const toggleComplete = async (req: AuthRequest, res: Response) => {
    try {
        const result = await findTaskAndAuthorize(req, res);
        if (!result) return;

        const { task } = result;
        task.completed = !task.completed;
        const updatedTask = await task.save();
        const populatedTask = await Task.findById(updatedTask._id).populate('assignedTo', 'name email avatar').populate("list", "title description");

        const io = req.app.get('io');
        const room = io.to(task.board.toString());
        const target = req.socketId ? room.except(req.socketId) : room;
        target.emit('task-updated', { task: populatedTask, user: { _id: req.user!._id, name: req.user!.name } });
        res.json(populatedTask);
    } catch (error) {
        res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : String(error),
        });
    }
};

// @desc    Update task labels (replace all labels)
// @route   PUT /api/tasks/:id/labels
const updateLabels = async (req: AuthRequest, res: Response) => {
    try {
        const result = await findTaskAndAuthorize(req, res);
        if (!result) return;

        if (!Array.isArray(req.body.labels)) {
            return res
                .status(400)
                .json({ message: 'labels must be an array of strings' });
        }

        const { task } = result;
        task.labels = req.body.labels.filter(
            (l: unknown) => typeof l === 'string',
        );
        const updatedTask = await task.save();
        const populatedTask = await Task.findById(updatedTask._id).populate('assignedTo', 'name email avatar').populate("list", "title description");

        const io = req.app.get('io');
        const room = io.to(task.board.toString());
        const target = req.socketId ? room.except(req.socketId) : room;
        target.emit('task-updated', { task: populatedTask, user: { _id: req.user!._id, name: req.user!.name } });
        res.json(populatedTask);
    } catch (error) {
        res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : String(error),
        });
    }
};

// @desc    Update task assignees (replace all assignees)
// @route   PUT /api/tasks/:id/assignees
const updateAssignees = async (req: AuthRequest, res: Response) => {
    try {
        const result = await findTaskAndAuthorize(req, res);
        if (!result) return;

        if (!Array.isArray(req.body.assignedTo)) {
            return res
                .status(400)
                .json({ message: 'assignedTo must be an array of user IDs' });
        }

        const { task } = result;
        task.assignedTo = req.body.assignedTo;
        const updatedTask = await task.save();
        const populatedTask = await Task.findById(updatedTask._id).populate('assignedTo', 'name email avatar').populate("list", "title description");

        const io = req.app.get('io');
        const room = io.to(task.board.toString());
        const target = req.socketId ? room.except(req.socketId) : room;
        target.emit('task-updated', { task: populatedTask, user: { _id: req.user!._id, name: req.user!.name } });
        res.json(populatedTask);
    } catch (error) {
        res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : String(error),
        });
    }
};

// @desc    Update task priority
// @route   PATCH /api/tasks/:id/priority
const updatePriority = async (req: AuthRequest, res: Response) => {
    try {
        const result = await findTaskAndAuthorize(req, res);
        if (!result) return;

        if (!['low', 'medium', 'high'].includes(req.body.priority)) {
            return res
                .status(400)
                .json({ message: 'Priority must be low, medium, or high' });
        }

        const { task } = result;
        task.priority = req.body.priority;
        const updatedTask = await task.save();
        const populatedTask = await Task.findById(updatedTask._id).populate('assignedTo', 'name email avatar').populate("list", "title description");

        const io = req.app.get('io');
        const room = io.to(task.board.toString());
        const target = req.socketId ? room.except(req.socketId) : room;
        target.emit('task-updated', { task: populatedTask, user: { _id: req.user!._id, name: req.user!.name } });
        res.json(populatedTask);
    } catch (error) {
        res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : String(error),
        });
    }
};

export {
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
};