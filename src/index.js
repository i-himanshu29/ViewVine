// SECOND APPROACH ------------------
// require('dotenv').config({path:'./env'})
    // or 
import dotenv from "dotenv"
import connectDB from "./db/index.js";
import { app } from "./app.js";

dotenv.config({
    path:'./.env'
})

connectDB()
.then(()=>{
    app.listen(process.env.PORT||8000,()=>{
        console.log(`  ⚙️  Server is running at port : ${process.env.PORT}`);
 })
})
.catch((err)=>{
    console.log("Mongo db connection failed !!",err);
})





/* FIRST APPROACH IN INDEX--------------------
//SECOND IS TO MAKE A SEPERATE FILE
//NOW STUDY FIRST APPROACH 
import mongoose from "mongoose";
import { DB_NAME } from "./constants";
import express from "express"
const app = express()
//IFFE
// always try to write a semicolon before the iffe code 
//becoz may be sometime some programmer will forget 
// to use semicolon in above code
//sometime its give an error that's why
;(async()=>{
    try{
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        //sometime DB to connect hoti hai but express me hi error aa jati hai
        app.on("error",(error)=>{
            console.log("ERROR",error);
            throw error
        })

        app.listen(process.env.PORT,()=>{
            console.log(`App is listening on port ${process.env.PORT}`);
        })
    }catch(error){
        console.log("Error",error)
        throw error
    }
})()
*/