import mongoose from "mongoose";
import jwt from 'jsonwebtoken';
import { v4 as uuid } from 'uuid';
import { v2 as cloudinary } from 'cloudinary';
import streamifier from 'streamifier';
import { getSockets } from "../lib/helper.js";

const cookieOption = {
    maxAge: 15 * 24 * 60 * 60 * 1000,
    sameSite: "none",
    httpOnly: true,
    secure: true,
}

const connectDB = (uri) => {
    mongoose.connect(uri, { dbName: "chattraverse" }).then(() => {
        console.log(`connected db `)
    }).catch((err) => {
        throw err;
    })
}

const sendToken = (res, user, code, message) => {
    const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET);
    return res.status(code).cookie("chattarverse-token",
        token,
        cookieOption).json({
            success: true,
            user,
            message,

        })

};

const emitEvent = (req, event, users, data) => {
    let io = req.app.get("io");
    const usersSocket = getSockets(users);
    io.to(usersSocket).emit(event,data);
    console.log("emitting event");
}
const uploadFilesToCloudinary = async (files = []) => {
    try {
        const uploadPromises =  files.map((file) => {
            return new Promise((resolve, reject) => {
                let stream = cloudinary.uploader.upload_stream((error, result) => {
                    if (result) {
                        resolve(result);
                    } else {
                        reject(error);
                    }
                });
                streamifier.createReadStream(file.buffer).pipe(stream);
            });
        });

        const results = await Promise.all(uploadPromises);
        console.log(results);
        const formattedResults = results.map((result) => ({
            public_id: result.public_id,
            url: result.secure_url,
        }));

        
        return formattedResults;
    } catch (error) {
        throw new Error("Error uploading files on cloudinary", error);

    }
};

const deleteFilesFromCloudinary = (public_ids) => { }
export {
    connectDB,
    sendToken,
    cookieOption,
    emitEvent,
    deleteFilesFromCloudinary,
    uploadFilesToCloudinary,
};