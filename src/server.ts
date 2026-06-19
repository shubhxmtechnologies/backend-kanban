import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import morgan from "morgan";
import connectDB from "./config/db.js";
import errorHandler from './middleware/errorHandler.js';
import http from "http"
import { Server } from "socket.io"

// routes
import authRoutes from "./routes/authRoutes.js"
import boardRoutes from './routes/boardRoutes.js';
import listRoutes from './routes/listRoutes.js';
import taskRoutes from './routes/taskRoutes.js';
import commentRoutes from './routes/commentRoutes.js';

dotenv.config();
connectDB();

const app = express();

app.use(cors({
  origin: [process.env.CLIENT_URL || "http://localhost:5173", "http://127.0.0.1:5500"],
  credentials: true
}));
app.use(express.json());
app.use(morgan("dev"));
app.use(errorHandler);

// Basic endpoint
app.get("/test", (req, res) => {
  res.json({ message: "Kanban Board Backend API is running..." });
});

app.use("/api/auth", authRoutes);
app.use('/api/boards', boardRoutes);
app.use('/api', listRoutes);
app.use('/api', taskRoutes);
app.use('/api', commentRoutes);

const PORT = process.env["PORT"] || 5000;

const server = http.createServer(app)
// Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: [process.env.CLIENT_URL || "http://localhost:5173", "http://127.0.0.1:5500"],
  },
});
// Make io accessible in controllers via req.app
app.set('io', io);

import setupSocket from './socket/socketHandler.js';
setupSocket(io);

server.listen(PORT, () => {
  console.log(`Server running on port${PORT}`);
});