import mongoose from "mongoose";

export interface IComment extends mongoose.Document {
    text: string;
    task: mongoose.Types.ObjectId;
    board: mongoose.Types.ObjectId;
    author: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const commentSchema = new mongoose.Schema<IComment>({
    text: {
        type: String,
        required: [true, "Comment text is required"],
        trim: true
    },
    task: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Task',
        required: true
    },
    board: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Board',
        required: true
    },
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
});

// Index for fast lookups by task
commentSchema.index({ task: 1, createdAt: -1 });

export default mongoose.model<IComment>("Comment", commentSchema);
