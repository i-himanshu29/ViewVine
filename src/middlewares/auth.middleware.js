import {asyncHandler} from "../utils/asyncHandler.js"
import {ApiError} from "../utils/ApiError.js";
import jwt from "jsonwebtoken"
import {User} from "../models/user.model.js"


export const verifyJWT = asyncHandler(async(req,res,next)=>{ // here 'res' khali pada hai too underscore '_' add kar sakte ho
  try {
    const token =   req.cookies?.accessToken || req.header
    ("Authorization")?.replace("Bearer ","") // bearer space is replace by empty string
  
    if(!token){
      throw new ApiError(401,"Unauthorized request")
    }
  
   const decodedToken =  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
  
   const user = await User.findById(decodedToken?._id).select("-password -refreshToken")
  
   if(!user){
      //NEXT: discuss about frontend
      throw new ApiError(401,"Invalid Access Token")
   }
  
   req.user = user;
   next()
  } catch (error) {
    throw new ApiError(401,error?.message ||
    "Invalid access token")
  }
})