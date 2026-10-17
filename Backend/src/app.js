import express from 'express';
import cookieParser from "cookie-parser";

const app = express();
app.use(express.json());
app.use(cookieParser());

app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin) {
        res.setHeader("Access-Control-Allow-Origin", origin);
    }
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    
    if (req.method === "OPTIONS") {
        return res.sendStatus(200);
    }
    next();
});


import authRoutes from "./routes/auth.route.js";
import categoryRoutes from "./routes/category.route.js";
import uploadRoutes from "./routes/upload.route.js";

import companionRoutes from "./routes/companion.route.js";
import documentChatRoutes from "./routes/documentChat.route.js";


app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/categories", categoryRoutes);
app.use("/api/v1/upload", uploadRoutes);

app.use("/api/v1/companions", companionRoutes);
app.use("/api/v1/document-chat", documentChatRoutes);




app.use((err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
        success: false,
        message: err.message || "Internal Server Error",
        errors: err.errors || [],
    });
});

export  { app };
