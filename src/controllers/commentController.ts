import type { Response } from 'express';
import Comment from '../models/Comment.js';
import Task from '../models/Task.js';
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

// ─── CRUD ──────────────────────────────────────────────────────────────────────

// @desc    Get all comments for a task
// @route   GET /api/tasks/:taskId/comments
const getComments = async (req: AuthRequest, res: Response) => {
    try {
        const task = await Task.findById(req.params.taskId);
        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }

        const board = await authorizeBoard(req, res, task.board);
        if (!board) return;

        const comments = await Comment.find({ task: task._id })
            .populate('author', 'name email avatar')
            .sort({ createdAt: -1 });

        res.json(comments);
    } catch (error) {
        res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : String(error),
        });
    }
};

// @desc    Create a comment on a task
// @route   POST /api/tasks/:taskId/comments
const createComment = async (req: AuthRequest, res: Response) => {
    try {
        if (typeof req.body.text !== 'string' || !req.body.text.trim()) {
            return res.status(400).json({ message: 'Comment text is required' });
        }

        const task = await Task.findById(req.params.taskId);
        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }

        const board = await authorizeBoard(req, res, task.board);
        if (!board) return;

        const comment = await Comment.create({
            text: req.body.text.trim(),
            task: task._id,
            board: task.board,
            author: req.user!._id,
        });

        const populated = await Comment.findById(comment._id)
            .populate('author', 'name email avatar');

        const io = req.app.get('io');
        const room = io.to(task.board.toString());
        const target = req.socketId ? room.except(req.socketId) : room;
        target.emit('comment-created', { comment: populated, user: { _id: req.user!._id, name: req.user!.name } });

        res.status(201).json(populated);
    } catch (error) {
        res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : String(error),
        });
    }
};

// @desc    Update a comment
// @route   PUT /api/comments/:id
const updateComment = async (req: AuthRequest, res: Response) => {
    try {
        if (typeof req.body.text !== 'string' || !req.body.text.trim()) {
            return res.status(400).json({ message: 'Comment text is required' });
        }

        const comment = await Comment.findById(req.params.id);
        if (!comment) {
            return res.status(404).json({ message: 'Comment not found' });
        }

        // Only the author can edit their own comment
        if (comment.author.toString() !== req.user!._id.toString()) {
            return res.status(403).json({ message: 'You can only edit your own comments' });
        }

        const board = await authorizeBoard(req, res, comment.board);
        if (!board) return;

        comment.text = req.body.text.trim();
        await comment.save();

        const populated = await Comment.findById(comment._id)
            .populate('author', 'name email avatar');

        const io = req.app.get('io');
        const room = io.to(comment.board.toString());
        const target = req.socketId ? room.except(req.socketId) : room;
        target.emit('comment-updated', { comment: populated, user: { _id: req.user!._id, name: req.user!.name } });

        res.json(populated);
    } catch (error) {
        res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : String(error),
        });
    }
};

// @desc    Delete a comment
// @route   DELETE /api/comments/:id
const deleteComment = async (req: AuthRequest, res: Response) => {
    try {
        const comment = await Comment.findById(req.params.id);
        if (!comment) {
            return res.status(404).json({ message: 'Comment not found' });
        }

        // Only the author can delete their own comment
        if (comment.author.toString() !== req.user!._id.toString()) {
            return res.status(403).json({ message: 'You can only delete your own comments' });
        }

        const board = await authorizeBoard(req, res, comment.board);
        if (!board) return;

        await Comment.findByIdAndDelete(comment._id);

        const io = req.app.get('io');
        const room = io.to(comment.board.toString());
        const target = req.socketId ? room.except(req.socketId) : room;
        target.emit('comment-deleted', { commentId: comment._id, taskId: comment.task, user: { _id: req.user!._id, name: req.user!.name } });

        res.json({ message: 'Comment deleted' });
    } catch (error) {
        res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : String(error),
        });
    }
};

export {
    getComments,
    createComment,
    updateComment,
    deleteComment,
};
