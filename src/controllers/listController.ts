import type { Response } from "express";
import List from "../models/List.js";
import type { AuthRequest } from "./authController.ts";
import Board from "../models/Board.js";
import Task from "../models/Task.js";

// @desc    Create a list in a board
// @route   POST /api/boards/:boardId/lists
const createList = async (req: AuthRequest, res: Response) => {
    try {
        if (typeof req.body.title !== "string" || !req.body.title.trim()) {
            return res.status(400).json({ message: "List title is required" });
        }
        if (!req.user) {
            return res.status(401).json({ message: "Not authorized, user missing" });
        }
        if (!req.params.boardId) {
            return res.status(400).json({ message: "Board ID is required" });
        }
        let description = ""
        if (typeof req.body.description === "string" && req.body.description.trim()) {
            description = req.body.description.trim();
        }

        const board = await Board.findById(req.params.boardId);

        if (!board) {
            return res.status(404).json({ message: 'Board not found' });
        }

        if (
            !board.members.some(
                member => member.toString() === req.user!._id.toString()
            )
        ) {
            return res.status(403).json({ message: "Not authorized" });
        }

        // Position = how many lists are already on this board
        const listCount = await List.countDocuments({ board: board._id });

        const list = await List.create({
            title: req.body.title.trim(),
            description,
            board: board._id,
            position: listCount,
        });
        const io = req.app.get('io');
        const room = io.to(board._id.toString());
        const target = req.socketId ? room.except(req.socketId) : room;
        target.emit('list-created', { list, user: { _id: req.user!._id, name: req.user!.name } });
        res.status(201).json({ list, message: "List created successfully" });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error instanceof Error ? error.message : String(error) });
    }
};

// @desc    Get all lists for a board
// @route   GET /api/boards/:boardId/lists
const getLists = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Not authorized, user missing" });
        }
        if (!req.params.boardId) {
            return res.status(400).json({ message: "Board ID is required" });
        }

        const board = await Board.findById(req.params.boardId);

        if (!board) {
            return res.status(404).json({ message: 'Board not found' });
        }

        if (
            !board.members.some(
                member => member.toString() === req.user!._id.toString()
            )
        ) {
            return res.status(403).json({ message: "Not authorized" });
        }

        const lists = await List.find({ board: board._id }).sort({ position: 1 });
        res.json(lists);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error instanceof Error ? error.message : String(error) });
    }
};


// @desc    Update a list title
// @route   PUT /api/lists/:id
const updateList = async (req: AuthRequest, res: Response) => {
    try {

        const title =
            typeof req.body.title === "string" && req.body.title.trim()
                ? req.body.title.trim()
                : undefined;

        const description =
            typeof req.body.description === "string"
                ? req.body.description.trim()
                : undefined;

        if (title === undefined && description === undefined) {
            return res.status(400).json({
                message: "At least one field is required"
            });
        }

        if (!req.user) {
            return res.status(401).json({ message: "Not authorized, user missing" });
        }
        if (!req.params.id) {
            return res.status(400).json({ message: "List ID is required" });
        }

        const list = await List.findById(req.params.id);

        if (!list) {
            return res.status(404).json({ message: 'List not found' });
        }
        const titleChanged =
            title !== undefined &&
            list.title !== title;

        const descriptionChanged =
            description !== undefined &&
            list.description !== description;

        if (!titleChanged && !descriptionChanged) {
            return res.status(400).json({
                message: "No changes detected"
            });
        }



        // Check board membership
        const board = await Board.findById(list.board);
        if (!board) {
            return res.status(404).json({ message: 'Board not found' });
        }
        if (
            !board.members.some(
                member => member.toString() === req.user!._id.toString()
            )
        ) {
            return res.status(403).json({ message: "Not authorized" });
        }

        if (titleChanged) {
            list.title = title;
        }

        if (descriptionChanged) {
            list.description = description;
        }

        const updatedList = await list.save();
        const io = req.app.get('io');
        const room = io.to(list.board.toString());
        const target = req.socketId ? room.except(req.socketId) : room;
        target.emit('list-updated', { list: updatedList, user: { _id: req.user!._id, name: req.user!.name } });
        res.json({ updatedList, message: "List updated successfully" });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error instanceof Error ? error.message : String(error) });
    }
};


// @desc    Delete a list and its tasks
// @route   DELETE /api/lists/:id
const deleteList = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Not authorized, user missing" });
        }
        if (!req.params.id) {
            return res.status(400).json({ message: "List ID is required" });
        }

        const list = await List.findById(req.params.id);

        if (!list) {
            return res.status(404).json({ message: 'List not found' });
        }

        const board = await Board.findById(list.board);
        if (!board) {
            return res.status(404).json({ message: 'Board not found' });
        }

        if (
            !board.members.some(
                member => member.toString() === req.user!._id.toString()
            )
        ) {
            return res.status(403).json({ message: "Not authorized" });
        }

        // Delete all tasks in this list
        await Task.deleteMany({ list: list._id });
        await List.findByIdAndDelete(list._id);
        const io = req.app.get('io');
        const room = io.to(list.board.toString());
        const target = req.socketId ? room.except(req.socketId) : room;
        target.emit('list-deleted', { listId: list._id, user: { _id: req.user!._id, name: req.user!.name } });
        res.json({ message: 'List deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error instanceof Error ? error.message : String(error) });
    }
};

export { createList, getLists, updateList, deleteList };