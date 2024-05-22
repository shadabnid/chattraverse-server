import { Schema, Types } from "mongoose";
import mongoose from "mongoose";


const schema = new Schema({
    content: {
        type: String,
        required: true,
    },
    attachment: [{
        public_id: {
            type: String,
            required: true
        },
        url: {
            type: String,
            required: true,
        }
    }
    ],
    sender: {
        type: Types.ObjectId,
        ref: 'User',
        required: true,
    },
    chat: {
        type: Types.ObjectId,
        ref: 'chat',
        required: true,
    }

}, {
    timestamps: true,
});


const Message = mongoose.model.Message || mongoose.model("Message", schema);

export default Message;