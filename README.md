<div align="center">
  <h1 align="center">Kanban Task Board - Backend API</h1>
  <p align="center">
    A robust, scalable RESTful API and WebSocket server powering the Kanban Task Board application. Built with Node.js, Express, TypeScript, and MongoDB.
  </p>
</div>

<hr />

## ✨ Key Features

- **Real-Time Engine:** WebSocket integration via `Socket.io` for live, bi-directional event broadcasting (e.g., instant task updates, board changes).
- **Secure Authentication:** JSON Web Token (JWT) based authentication and `bcryptjs` for secure password hashing.
- **Robust Database:** NoSQL data storage using `MongoDB` and `Mongoose` ODM for flexible schemas.
- **Data Validation:** Middleware-based request validation using `express-validator`.
- **Type-Safe & Scalable:** Developed fully in `TypeScript` for structured, error-free code compilation and maintainability.

## 🛠️ Technologies Used

- **Runtime:** Node.js
- **Framework:** Express.js
- **Language:** TypeScript
- **Database:** MongoDB (Mongoose)
- **Real-Time:** Socket.io
- **Authentication:** JWT (jsonwebtoken), bcryptjs
- **Environment Management:** dotenv
- **Middleware:** cors, morgan

## 🚀 Getting Started

Follow these instructions to get the backend server up and running on your local machine.

### Prerequisites

- Node.js (v18 or higher recommended)
- MongoDB instance (Local or Atlas cloud)
- npm or yarn

### Installation

1. **Navigate to the backend directory:**
   ```bash
   cd backend_kanban
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env.local` (or `.env`) file in the root of the `backend_kanban` directory and define the following variables:
   ```env
   # Server configuration
   PORT=5000
   NODE_ENV=development

   # Database Configuration
   # Provide your local or MongoDB Atlas URI here
   MONGO_URI=your_mongodb_connection_string_here

   # Authentication Secrets
   JWT_SECRET=your_super_secret_jwt_key_at_least_32_chars
   JWT_EXPIRE=7d

   # CORS Configuration
   # The URL of your frontend client
   CLIENT_URL=http://localhost:5173
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```
   The server will start (default port: `5000`) with hot-reloading enabled via `tsx`.

## 📦 Build for Production

To compile TypeScript into standard JavaScript for production, run:
```bash
npm run build
```

Once built, you can start the production server with:
```bash
npm start
```
