import mongoose from "mongoose"

export interface IBoard extends mongoose.Document {
    title: string;
    tag?: string;
    owner: mongoose.Types.ObjectId;
    members: mongoose.Types.ObjectId[];
    createdAt: Date;
    updatedAt: Date;
}

const boardSchema = new mongoose.Schema<IBoard>({
    title: {
        type: String,
        required: [true, "Board title is required"],
        trim: true
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    members: {
        type: [mongoose.Schema.Types.ObjectId],
        ref: 'User',
        default: []
    },
    tag: {
        type: String,
        trim: true
    }
}, {
    timestamps: true
})

export default mongoose.model<IBoard>("Board", boardSchema)