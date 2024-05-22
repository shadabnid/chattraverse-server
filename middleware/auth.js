import { ErrorHandler } from "../utils/utility.js";
import jwt from 'jsonwebtoken';
import { TryCatch } from "./error.js";
import User from "../models/users.js";

const isAuthenticated = TryCatch((req, res, next) => {
   const token = req.cookies['chattarverse-token'];
   if (!token) {
      return next(new ErrorHandler("Please Login to access this route", 401));
   }
   const decodeData = jwt.verify(token, process.env.jWT_SECRET);
   req.user = decodeData._id;
   next();
});

const isAdmin = TryCatch((req, res, next) => {
   const token = req.cookies['admin-token'];
   if (!token) {
      return next(new ErrorHandler("Only admin can access this route", 401));
   }
   const secretKey = jwt.verify(token, process.env.jWT_SECRET);
   const adminSecretKey = process.env.ADMIN_SECRET_KEY || "SHADAB";
   const isMatch = secretKey === adminSecretKey;
   if (!isMatch) return next(new ErrorHandler("invalid admin key", 401));
   next();
});

const socketAuthenticator = async (err, socket, next) => {
   
   try {
      
      if (err) {
         console.log(err);
         return next(err);
      }
      const authToken = socket.request.cookies['chattarverse-token'];
      
      if (!authToken)
         return next(new ErrorHandler("Please login to access this route", 401));
      const decodeData = jwt.verify(authToken, process.env.jWT_SECRET);
   
      const user = await User.findById(decodeData._id);

      if (!user) return next(new ErrorHandler("Please login to access this route", 401));

      socket.user = user;
      next();

   } catch (error) {
      console.log(error);
      return next(new ErrorHandler("Please login to access this route", 401));
   }

}
export { isAuthenticated, isAdmin, socketAuthenticator };