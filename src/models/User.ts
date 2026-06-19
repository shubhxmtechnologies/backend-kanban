import mongoose from "mongoose";

export interface IUser extends mongoose.Document {
    name: string;
    email: string;
    password: string;
    avatar: string;
    boards: mongoose.Schema.Types.ObjectId[];
    createdAt: Date;
    updatedAt: Date;
}

const userSchema = new mongoose.Schema<IUser>({
    name: {
        type: String,
        required: [true, "name is required"],
        trim: true
    },
    email: {
        type: String,
        required: [true, "email is required"],
        unique: true,
        lowercase: true,
        trim: true,
    },
    password: {
        type: String,
        required: [true, "Password is required"],
        minlength: 8,
        select: false
    },
    boards: {
        type: [mongoose.Schema.Types.ObjectId],
        ref: 'Board',
        default: []
    },
    
    avatar: {
        type: String,
        required: [true, "Avatar is required"],
    }
}, {
    timestamps: true
})

export default mongoose.model<IUser>("User", userSchema);