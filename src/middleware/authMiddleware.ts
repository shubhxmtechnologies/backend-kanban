import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken"
import User from "../models/User.js";
import type { AuthRequest } from "../controllers/authController.js";

const protect = async (req: AuthRequest, res: Response, next: NextFunction) => {
    let token: string | undefined;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return res.status(401).json({ message: 'Not authorized, no token' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
        const user = await User.findById(decoded.id);
        if (!user) {
            return res.status(401).json({
                message: "Not authorized, user not found"
            });
        }

        req.user = user;
        req.socketId = req.headers['x-socket-id'] as string | undefined;
        next();
    } catch (error) {
        console.error(error);

        if (error instanceof jwt.TokenExpiredError) {
            return res.status(401).json({
                message: "Token expired"
            });
        }

        if (error instanceof jwt.JsonWebTokenError) {
            return res.status(401).json({
                message: "Invalid token"
            });
        }

        return res.status(401).json({
            message: "Not authorized"
        });
    }
}

export default protect 