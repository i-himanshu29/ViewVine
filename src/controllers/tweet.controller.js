import mongoose, { isValidObjectId } from "mongoose"
import {Tweet} from "../models/tweet.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const createTweet = asyncHandler(async (req, res) => {
    //TODO: create tweet
    // content and owner from model
    // fetch data from req body || from params
    // now write the content 
    const {video,userId} = req.body || req.params;


})

const getUserTweets = asyncHandler(async (req, res) => {
    // TODO: get user tweets
    return res
    .status(200)
    .json(
        new ApiResponse(
            200,  //status code
            req.user, //data
            "User Tweets fetched successfully" //message
            )
        )
})

const updateTweet = asyncHandler(async (req, res) => {
    //TODO: update tweet

    // find userId,videoId,tweet from req body
    const {video,userId} = req.body;
})

const deleteTweet = asyncHandler(async (req, res) => {
    //TODO: delete tweet
})

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}