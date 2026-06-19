import jwt from 'jsonwebtoken';

const generateToken = (userId: string | object) => {
    const secret = process.env.JWT_SECRET;

    if (!secret) {
        throw new Error("JWT_SECRET is not defined");
    }

    return jwt.sign(
        { id: userId },
        secret,
        {
            expiresIn: (process.env.JWT_EXPIRE || "7d") as any,
        }
    );
};

export default generateToken;