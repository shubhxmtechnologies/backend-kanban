import type { Request, Response } from "express";
import User, { type IUser } from "../models/User.js";
import generateToken from "../utils/generateToken.js";
import bcrypt from "bcryptjs";

export interface AuthRequest extends Request {
    user?: IUser;
    socketId?: string | undefined;
}

// @desc    Register a new user
// @route   POST /api/auth/register

const register = async (req: Request, res: Response) => {
    try {
        const { name, email, password, avatar } = req.body;
        if (
            typeof name !== "string" ||
            typeof email !== "string" ||
            typeof password !== "string"
        ) {
            return res.status(400).json({
                message: "Invalid input types"
            });
        }

        if (name.trim().length < 3 || name.trim().length > 30) {
            return res.status(400).json({
                message: "Name must be between 3 and 30 characters"
            });
        }

        if (email.length > 20) {
            return res.status(400).json({
                message: "Email cannot be more than 20 characters long"
            });
        }

        if (email.length < 5) {
            return res.status(400).json({
                message: "Email must be at least 5 characters long"
            });
        }
        if (password.length < 8) {
            return res.status(400).json({
                message: "Password must be at least 8 characters long"
            });
        }

        if (password.length > 15) {
            return res.status(400).json({
                message: "Password cannot be more than 15 characters long"
            });
        }
        if (!avatar?.trim()) {
            return res.status(400).json({
                message: "Please provide a valid avatar URL"
            });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(email)) {
            return res.status(400).json({
                message: "Enter a valid email address"
            });
        }

        // Check if user already exists
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({
                message: "User already exists"
            });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create new user
        const user = await User.create({
            name: name.trim(),
            avatar: avatar.trim(),
            email: email.trim(),
            password: hashedPassword
        });

        // Generate token
        const token = generateToken(user._id);

        res.status(201).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            token
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Internal server error",
            error: error instanceof Error ? error.message : String(error)
        });
    }
}

// @desc    Login user
// @route   POST /api/auth/login

const login = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({
                message: "Please provide all the required fields"
            });
        }

        // Check if user exists
        const user = await User.findOne({ email }).select("+password");

        if (!user) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        // Check password
        const isMatch = await bcrypt.compare(password, user.password || "");

        if (!isMatch) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        // Generate token
        const token = generateToken(user._id);

        res.status(200).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            avatar: user.avatar,
            token
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Internal server error",
            error: error instanceof Error ? error.message : String(error)
        });
    }
}

// @desc    Get current logged-in user
// @route   GET /api/auth/me

const getMe = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Not authorized, user missing" });
        }
        res.json(req.user);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error instanceof Error ? error.message : String(error) });
    }
}

// @desc    Update details
// @route   PUT /api/auth/update

const updateMe = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Not authorized" })
        }

        let { name, avatar } = req.body;
        if (
            typeof name !== "string" &&
            typeof avatar !== "string"
        ) {
            return res.status(400).json({
                message: "At least one field is required"
            });
        }
        let user = req.user;
        let changed = false;

        if (
            typeof name === "string" &&
            name.trim() &&
            name.trim() !== user.name
        ) {
            user.name = name.trim();
            changed = true;
        }



        if (
            typeof avatar === "string" &&
            avatar.trim() &&
            avatar.trim() !== user.avatar
        ) {
            user.avatar = avatar.trim();
            changed = true;
        }

        if (!changed) {
            return res.status(400).json({
                message: "No changes detected"
            });
        }


        const updatedUser = await user.save();
        if (!updatedUser) {
            return res.status(400).json({ message: "Failed to update user" });
        }
        res.status(200).json({ updatedUser, message: "Details updated successfully" });

    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error instanceof Error ? error.message : String(error) });
    }

}
export { register, login, getMe, updateMe }   