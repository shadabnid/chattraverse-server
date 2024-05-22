import { hash } from "bcrypt";
import { Schema } from "mongoose";
import mongoose from "mongoose";


const schema =  new Schema({
    name:{
        type:String,
        required:true,
    },
    bio:{
        type:String,
        required:true,
    },
    username:{
        type:String,
        required:true,
        unique:true,
    },
    password:{
        type:String,
        required:true,
        select:false
    },
    avatar:{
        public_id:{
            type:String,
            required:true
        },
        url:{
            type:String,
            required:true,
        }
    }

},{
    timestamps:true, 
});
schema.pre("save",async function(next){
    if(!this.isModified("password")) return next();

    this.password = await hash(this.password,10);
})
const User = mongoose.model.User || mongoose.model("User",schema);

export default User;