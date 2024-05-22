import express from "express";
import {
    allChat,
    allMessages,
    allUser,
    getDashboardStats,
    adminLogin,
    adminLogout,
    getAdminData
} from "../controllers/admin.js";
import { adminValidator, validateHandler } from "../lib/validators.js";
import { isAdmin } from "../middleware/auth.js";


const app = express.Router();
app.post("/verify",adminValidator(),validateHandler,adminLogin);
app.get("/logout",adminLogout);

//admin can access
app.use(isAdmin);
app.get("/",getAdminData);
app.get("/users", allUser);
app.get("/chats", allChat);
app.get("/messages", allMessages);
app.get("/stats", getDashboardStats);

export default app;