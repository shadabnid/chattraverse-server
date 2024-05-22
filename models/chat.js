import { Schema, Types } from "mongoose";
import mongoose from "mongoose";

const schema =  new Schema({
    name:{
        type:String,
        required:true,
    },
    groupchat:{
        type:Boolean,
        default:false,
    },
    creator:{
        type:Types.ObjectId,
        ref:'User',
        
    },
    members:[{
        type:Types.ObjectId,
        ref:'User',

    }]

},{
    timestamps:true, 
});

const Chat = mongoose.model.Chat || mongoose.model("Chat",schema);
export default Chat;