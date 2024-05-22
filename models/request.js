import mongoose from "mongoose";
import { Schema, Types } from "mongoose";
const schema = new Schema({
    
  status:{
    type:String,
    default:"pending",
    enum:["pending","accept","rejected"],
  },
  sender:{
    type:Types.ObjectId,
    ref:'User',
    required:true,
  },
  receiver:{
    type:Types.ObjectId,
    ref:'User',
    required:true,

  }
}, {
    timestamps: true,
});

const Request = mongoose.model.Request || mongoose.model("Request", schema);

export default Request;