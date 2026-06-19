import mongoose from "mongoose";

export interface ITask extends mongoose.Document {
    title: string;
    description?: string;

    list: mongoose.Types.ObjectId;
    board: mongoose.Types.ObjectId;

    position: number;

    assignedTo: mongoose.Types.ObjectId[];

    labels: string[];

    priority?: "low" | "medium" | "high";

    completed: boolean;
    color?: string;

    createdAt: Date;
    updatedAt: Date;
}

const taskSchema = new mongoose.Schema<ITask>({
    title: {
        type: String,
        required: [true, 'Task title is required'],
        trim: true,
    },

    description: {
        type: String,
        default: '',
        trim: true
    },

    list: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'List',
        required: true,
    },

    board: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Board',
        required: true,
    },

    position: {
        type: Number,
        required: true,
    },

    assignedTo: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    }],

    labels: [{
        type: String,
        trim: true,
    }],

    priority: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium',
    },

    completed: {
        type: Boolean,
        default: false,
    },

    color: {
        type: String,
        default: () => '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')
    },

}, {
    timestamps: true,
});

export default mongoose.model<ITask>('Task', taskSchema);