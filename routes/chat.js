import express from "express";
import {
    addMembers,
    deleteChat,
    getChatDetails,
    getMessages,
    getMyChats,
    getMyGroups,
    leaveGroup,
    newGroup,
    removeMembers,
    renameGroup,
    sendAttachment
} from "../controllers/chat.js";
import { addMemberValidator, chatIdValidator, newGroupChatValidator, removeMemberValidator, renameGroupValidator, sendAttachmentValidator, validateHandler } from "../lib/validators.js";
import { isAuthenticated } from "../middleware/auth.js";
import { attachmentMulter } from '../middleware/multer.js';
const app = express.Router();
//user must be login
app.use(isAuthenticated);

app.post("/new", newGroupChatValidator(), validateHandler, newGroup);
app.get("/my", getMyChats);
app.get("/my/groups", getMyGroups);
app.put("/addmembers", addMemberValidator(), validateHandler, addMembers);
app.put("/removemembers", removeMemberValidator(), validateHandler, removeMembers);
app.delete("/leavegroup/:id", chatIdValidator(), validateHandler, leaveGroup);
//send attachment
app.post("/message",
    attachmentMulter,
    sendAttachmentValidator(),
    validateHandler,
    sendAttachment
);

app.get("/message/:id",
    chatIdValidator(),
    validateHandler,
    getMessages
);

app.route("/:id")
    .get(chatIdValidator(), validateHandler, getChatDetails)
    .put(renameGroupValidator(),validateHandler,renameGroup)
    .delete(chatIdValidator(),validateHandler,deleteChat);
export default app;