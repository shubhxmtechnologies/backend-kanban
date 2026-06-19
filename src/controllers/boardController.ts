import type { Response } from "express";
import Board from "../models/Board.js";
import List from "../models/List.js"
import Task from "../models/Task.js"
import User from "../models/User.js";
import type { AuthRequest } from "./authController.js";

// @desc    Create a new board
// @route   POST /api/boards

const createBoard = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Not authorized, user missing" });
        }
        const { title } = req.body;

        if (typeof title !== "string" || !title.trim()) {
            return res.status(400).json({
                message: "Board title is required"
            });
        }
        if (title.trim().length > 50) {
            return res.status(400).json({ message: "Board title cannot be more than 50 characters" });
        }
        let tag = "";

        if (typeof req.body.tag === "string") {
            if (req.body.tag.trim().length > 15) {
                return res.status(400).json({ message: "Board tag cannot be more than 15 characters" });
            }
            tag = req.body.tag.trim();
        }
        const board = await Board.create({
            title,
            tag,
            owner: req.user._id,
            members: [req.user._id]
        })
        if (!board) {
            return res.status(400).json({ message: "Failed to create board" });
        }

        res.status(201).json({ board, message: "Board Created Successfully" });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error instanceof Error ? error.message : String(error) });
    }
}

// @desc    Get all boards for current user
// @route   GET /api/boards

const getBoards = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Not authorized, user missing" });
        }

        const boards = await Board.find({
            members: req.user._id
        }).populate('owner', 'name avatar').populate('members', 'avatar').sort({ createdAt: -1 })

        res.status(200).json(boards);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error instanceof Error ? error.message : String(error) });
    }
}


// @desc    Get single board with lists and tasks
// @route   GET /api/boards/:id

const getBoard = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Not authorized, user missing" });
        }
        if (!req.params.id) {
            return res.status(400).json({ message: "Board ID is required" });
        }
        const board = await Board.findById(req.params.id).populate('owner', 'name avatar email')
            .populate('members', 'name avatar email')

        if (!board) {
            return res.status(404).json({ message: 'Board not found' });
        }

        // Check if user is a member of board
        const currentUser = req.user;
        if (!board.members.some(member => member._id.toString() === currentUser._id.toString())) {
            return res.status(403).json({ message: 'Not authorized to access this board' });
        }
        // Get lists and tasks for this board
        const lists = await List.find({ board: board._id }).sort({ position: 1 });
        const tasks = await Task.find({ board: board._id }).populate("list","title description").sort({ position: 1 });

        res.json({ board, lists, tasks });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error instanceof Error ? error.message : String(error) });
    }
}


// @desc    Update board title
// @route   PUT /api/boards/:id

const updateBoard = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Not authorized, user missing" });
        }
        if (!req.params.id) {
            return res.status(400).json({ message: "Board ID is required" });
        }
        const board = await Board.findById(req.params.id);
        const currentUser = req.user;

        if (!board) {
            return res.status(404).json({ message: 'Board not found' });
        }

        // Check membership
        if (!board.members.some(member => member._id.toString() === currentUser._id.toString())) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        let hasChanges = false;

        if (req.body.title !== undefined) {
            if (typeof req.body.title !== "string") {
                return res.status(400).json({
                    message: "Invalid input types"
                });
            }

            const trimmedTitle = req.body.title.trim();
            if (trimmedTitle.length > 50) {
                return res.status(400).json({ message: "Board title cannot be more than 50 characters" });
            }
            if (!trimmedTitle) {
                return res.status(400).json({ message: "Board title is required" });
            }
            if (trimmedTitle !== board.title) {
                board.title = trimmedTitle;
                hasChanges = true;
            }
        }

        const tag = req.body.tag;
        if (typeof tag === "string") {
            const trimmedTag = tag.trim();
            if (trimmedTag.length > 15) {
                return res.status(400).json({ message: "Board tag cannot be more than 15 characters" });
            }
            if (trimmedTag !== "" && trimmedTag !== board.tag) {
                board.tag = trimmedTag;
                hasChanges = true;
            }
        }

        if (!hasChanges) {
            if (req.body.title !== undefined && req.body.title.trim() === board.title) {
                return res.status(400).json({ message: 'Board title is already this' });
            }
            return res.status(200).json({ board, message: "Board title is already this" });
        }

        await board.save();
        const updatedBoard = await Board.findById(board._id)
            .populate('owner', 'name avatar email')
            .populate('members', 'name avatar email');
        res.json({ updatedBoard, message: "Board updated successfully" });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error instanceof Error ? error.message : String(error) });
    }
};


// @desc    Delete board and all its lists & tasks
// @route   DELETE /api/boards/:id

const deleteBoard = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Not authorized, user missing" });
        }
        if (!req.params.id) {
            return res.status(400).json({ message: "Board ID is required" });
        }

        const board = await Board.findById(req.params.id);

        if (!board) {
            return res.status(404).json({ message: 'Board not found' });
        }
        const currentUser = req.user;
        // Only owner can delete
        if (board.owner.toString() !== currentUser._id.toString()) {
            return res.status(403).json({ message: 'Only the board owner can delete this board' });
        }

        // Delete all tasks and lists belonging to this board
        await Task.deleteMany({ board: board._id });
        await List.deleteMany({ board: board._id });
        await Board.findByIdAndDelete(board._id);

        res.json({ message: 'Board deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error instanceof Error ? error.message : String(error) });
    }
};

// @desc    Add a member to board
// @route   PUT /api/boards/:id/members
const addMember = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Not authorized, user missing" });
        }
        if (!req.params.id) {
            return res.status(400).json({ message: "Board ID is required" });
        }
        const board = await Board.findById(req.params.id);

        if (!board) {
            return res.status(404).json({ message: 'Board not found' });
        }

        const currentUser = req.user;
        // Only owner can add members
        if (board.owner.toString() !== currentUser._id.toString()) {
            return res.status(403).json({ message: 'Only the board owner can add members' });
        }

        const { email }: { email: string } = req.body
        if (typeof email !== "string") {
            return res.status(400).json({
                message: "Email is required"
            });
        }

        if (!email.trim()) {
            return res.status(400).json({ message: 'Email is required' });
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(email)) {
            return res.status(400).json({
                message: "Enter a valid email address"
            });
        }

        // Find user by email
        const userToAdd = await User.findOne({ email });

        if (!userToAdd) {
            return res.status(404).json({ message: 'User not found with that email' });
        }

        // Check if already a member
        if (
            board.members.some(
                member => member.toString() === userToAdd._id.toString()
            )
        ) {
            return res.status(400).json({ message: 'User is already a member' });
        }

        board.members.push(userToAdd._id);
        await board.save();

        const updatedBoard = await Board.findById(board._id)
            .populate('owner', 'name avatar email')
            .populate('members', 'name avatar email');

        res.json({ updatedBoard, message: userToAdd.name + " is added to board" });
        const io = req.app.get('io');
        const room = io.to(board._id.toString());
        const target = req.socketId ? room.except(req.socketId) : room;
        target.emit('board:member-added', { board: updatedBoard, addedUser: { _id: userToAdd._id, name: userToAdd.name, email: userToAdd.email } });
        io.to(`user:${userToAdd._id.toString()}`).emit('board:member-added', { board: updatedBoard, addedUser: { _id: userToAdd._id, name: userToAdd.name, email: userToAdd.email } });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error instanceof Error ? error.message : String(error) });
    }
};

// @desc    Remove a member from board
// @route   DELETE /api/boards/:id/members/:userId
const removeMember = async (req: AuthRequest, res: Response) => {
    try {

        if (!req.user) {
            return res.status(401).json({ message: "Not authorized, user missing" });
        }

        if (!req.params.id) {
            return res.status(400).json({ message: "Board ID is required" });
        }

        const board = await Board.findById(req.params.id);
        if (!board) {
            return res.status(404).json({ message: 'Board not found' });
        }
        if (req.params.userId === board.owner.toString()) {
            return res.status(400).json({ message: 'Cannot remove the board owner' });
        }
        const currentUser = req.user;
        // Only owner can add members
        if (board.owner.toString() !== currentUser._id.toString()) {
            return res.status(403).json({ message: 'Only the board owner can remove members' });
        }

        board.members = board.members.filter(
            (memberId) => memberId.toString() !== req.params.userId
        );
        await board.save();

        const updatedBoard = await Board.findById(board._id)
            .populate('owner', 'name avatar email')
            .populate('members', 'name avatar email');

        res.json({ updatedBoard, message: "Member is remove from board" });
        const io = req.app.get('io');
        const room = io.to(board._id.toString());
        const target = req.socketId ? room.except(req.socketId) : room;
        target.emit('board:member-removed', { boardId: board._id, removedUserId: req.params.userId, user: { _id: req.user!._id, name: req.user!.name } });
        io.to(`user:${req.params.userId}`).emit('board:member-removed', { boardId: board._id, removedUserId: req.params.userId, user: { _id: req.user!._id, name: req.user!.name } });

    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error instanceof Error ? error.message : String(error) });
    }
};

export { createBoard, getBoards, getBoard, updateBoard, deleteBoard, addMember, removeMember };