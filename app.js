import express from 'express';
import { connectDB } from './utils/features.js';
import dotenv from 'dotenv';
import { errorMiddleware } from './middleware/error.js';
import cookieParser from 'cookie-parser';
import { Server } from 'socket.io';
import { createServer } from 'http';
import { v4 as uuid } from 'uuid';
import cors from 'cors';
import { v2 as cloudinary } from 'cloudinary';

import userRoute from './routes/users.js';
import chatRoute from './routes/chat.js';
import adminRoute from './routes/admin.js';
import { NEW_MESSAGE, NEW_MESSAGE_ALERT, START_Typing, STOP_TYPING } from './constant/event.js';
import { getSockets } from './lib/helper.js';
import Message from './models/message.js';
import { corsOptions } from './constant/config.js';
import { socketAuthenticator } from './middleware/auth.js';


dotenv.config({
    path: "./.env"
})
const port = process.env.PORT || 3000;
let envMode = process.env.NODE_ENV.trim() || "PRODUCTION";

const mongoURI = process.env.MONGO_URI;
const userSocketIds = new Map();

connectDB(mongoURI);

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
})

const app = express();
const server = createServer(app);
const io = new Server(server,{
    cors:corsOptions
});

app.set("io",io);

app.use(express.json());//for sending json data in body
app.use(cookieParser());//for passing cookie 

app.use(cors(corsOptions));//cross origin
app.get('/',(req,res)=>{
    return res.send("working");
})
app.use("/api/v1/user", userRoute);
app.use("/api/v1/chat", chatRoute);
app.use("/api/v1/admin", adminRoute);

 io.use((socket, next) => {
     cookieParser()(
         socket.request,
         socket.request.res,
      async(err)=>await socketAuthenticator(err,socket,next)
     );
   });
 
io.on("connection", (socket) => {
    const user = socket.user;
    
    userSocketIds.set(user._id.toString(), socket.id);


    console.log("a user connected", socket.id);
    socket.on(NEW_MESSAGE, async ({ chatId, members, messages }) => {
         console.log(messages);
        const messageForRealTime = {
            content: messages,
            _id: uuid(),
            sender: {
                _id: user._id,
                name: user.name
            },
            chat: chatId,
            createdAt: new Date().toISOString()
        }

        const messageForDb = {
            content: messages,
            sender: user._id,
            chat: chatId
        }

        const memberSocket = getSockets(members);

        io.to(memberSocket).emit(NEW_MESSAGE, {
            chatId,
            message: messageForRealTime
        });

        io.to(memberSocket).emit(NEW_MESSAGE_ALERT, {
            chatId
        })
        try {
            await Message.create(messageForDb);
        } catch (error) {
            console.log(error);
        }

    });

    socket.on(START_Typing,({members,chatId})=>{
        console.log("typing",chatId);
        const membersSocket = getSockets(members);

        socket.to(membersSocket).emit(START_Typing,{chatId});
    });

    socket.on(STOP_TYPING,({members,chatId})=>{
        console.log("stop typing");
        const membersSocket = getSockets(members);

        socket.to(membersSocket).emit(STOP_TYPING,{chatId});
    })

    socket.on('disconnect', () => {
        userSocketIds.delete(user._id.toString());
        console.log("user disconnected");
    });
});

app.use(errorMiddleware);

server.listen(port, () => {
    console.log(`server is running at port ${port} in ${envMode} mode`);
});

export { userSocketIds ,envMode}