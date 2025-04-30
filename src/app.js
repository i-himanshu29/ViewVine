import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"


const app = express()
// middleware
app.use(cors({
    origin:process.env.CORS_ORIGIN,
    credentials:true
}))

app.use(express.json({limit:"16kb"}))//accepting the json also their was another way called body-parser
app.use(express.urlencoded({extended:true,limit:"16kb"}))
app.use(express.static("public"))//pdf , img
app.use(cookieParser()) 

//routes import
import userRouter from './routes/user.routes.js'
import healthcheckRouter from "./routes/healthcheck.routes.js"
import tweetRouter from "./routes/tweet.routes.js"
import subscriptionRouter from "./routes/subscription.routes.js"
import videoRouter from "./routes/video.routes.js"
import commentRouter from "./routes/comment.routes.js"
import likeRouter from "./routes/like.routes.js"
import playlistRouter from "./routes/playlist.routes.js"
import dashboardRouter from "./routes/dashboard.routes.js"

//routes declaration
// pahle humne app.get() padha hua hai but ab middleware a gya hai to app.use use karenge route likhne ke liye
app.use("/api/v1/healthcheck", healthcheckRouter)

app.use("/api/v1/users", userRouter)
// how does it work 
// http://localhost:8000/users abb ye userRouter par jayenge toh 
// http://localhost:8000/api/v1/users/register  this is actual url
app.use("/api/v1/tweets", tweetRouter)
app.use("/api/v1/subscriptions", subscriptionRouter)
app.use("/api/v1/videos", videoRouter)
app.use("/api/v1/comments", commentRouter)
app.use("/api/v1/likes", likeRouter)
app.use("/api/v1/playlist", playlistRouter)
app.use("/api/v1/dashboard", dashboardRouter)

// http://localhost:8000/api/v1/users/register

export {app}