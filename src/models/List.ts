import mongoose from "mongoose"

export interface IList extends mongoose.Document {
    title: string;
    description?: string;
    board: mongoose.Types.ObjectId;
    position: number;
    color?: string;
    createdAt: Date;
    updatedAt: Date;
}

const listSchema = new mongoose.Schema<IList>({
    title: {
        type: String,
        required: [true, "List title is required"],
        trim: true
    },
    board: {
        type: mongoose.Types.ObjectId,
        ref: 'Board',
        required: true
    },
    position: {
        type: Number,
        required: true
    },
    description: {
        type: String,
        trim: true,
        default: ''
    },
    color: {
        type: String,
        default: () => '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')
    }
}, {
    timestamps: true
})

export default mongoose.model<IList>("List", listSchema)