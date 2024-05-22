import express from "express";
import {
    acceptFriendRequest,
    geMyNotification,
    getMyFriends,
    getMyProfile,
    logOut, login,
    newUser, searchUser,
    sendFriendRequest,
} from "../controllers/user.js";
import { singleAvatar } from "../middleware/multer.js";
import { isAuthenticated } from "../middleware/auth.js";
import {
    acceptRequestValidator,
    loginValidator,
    registerValidator,
    requestValidator,
    validateHandler
}
    from "../lib/validators.js";

const app = express.Router();
app.post("/new", singleAvatar, registerValidator(), validateHandler, newUser);
app.post("/login", loginValidator(), validateHandler, login);

//user must be login
app.use(isAuthenticated);
app.get("/profile", getMyProfile);
app.get("/logout", logOut);
app.get("/search", searchUser);
app.put("/sendrequest", requestValidator(), validateHandler, sendFriendRequest)
app.put("/acceptrequest", acceptRequestValidator(),validateHandler,acceptFriendRequest);
app.get("/allnotifications", geMyNotification);
app.get("/friends", getMyFriends);
export default app;