import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";

// Notes--
//ye User use karna hai when  mongoose in action like 'findOne' , 'find' etc.
// use this 'user' - it is method aapke bnaye hue method yaha par aate hai like 'isPasswordCorrect'

//Notes-
// Jo kaam hone me time lega waha await use kar lenge

//advise-agar aap kahi koi file update karwa rahe ho to uske alag controller/endpoint rakhna it's better

// generateAccessAndRefreshTokens.....................
const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false }); //save to DB //validateBeforeSave-method hai inbuilt

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating refresh and access token"
    );
  }
};

// registerUser............................
const registerUser = asyncHandler(async (req, res) => {
  // Take input from user name, email,password
  // get user details from frontend
  const { fullName, email, username, password } = req.body;
  console.log("email:", email);

  // validation || check user already registered or not
  // if(fullname === ""){
  //     throw new ApiError(400,"fullname is required")
  // }
  // we can check all by if condition but we use some advancement

  if (
    [fullName, email, username, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fiels are required");
  }

  //if already registered return response
  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });
  if (existedUser) {
    throw new ApiError(409, "User with email or username already exists");
  }
  console.log("existedUser", existedUser);

  //Check for images,check for avator
  const avatarLocalPath = req.files?.avatar[0]?.path;
  // console.log(files);
  // const coverImageLocalPath = req.files?.coverImage[0]?.path;
  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required");
  }

  //upload them to cloudinary, avator
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);
  if (!avatar) {
    throw new ApiError(400, "Avatar file is required");
  }

  //create user object-> create entry in DB
  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase(),
  });

  // remove password and refresh token field from response
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken" // '-' mtlb nhi chahiye
  );

  // check for user creation
  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering the user");
  }

  // return response ( 200 status code)
  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User registered successfully"));
});

// loginUser.........................
const loginUser = asyncHandler(async (req, res) => {
  //take data from req body -> email, username
  //validate the data
  // username or email
  //find the user
  //password check
  // access and refresh token
  //send coookies
  // send response of login

  const { email, password, username } = req.body;

  if (!username && !email) {
    throw new ApiError(400, "username or email is required");
  }

  // if(!username){
  //     throw new ApiError(400,"username or email is required")
  // }

  // Here is an alternative of above code based on logic discussed in video:
  // if (!(username || email)) {
  //     throw new ApiError(400, "username or email is required")

  // }

  const user = await User.findOne({
    $or: [{ username }, { email }], //$or modgodb operator - array ke andar object pass kar sakte ho
  });

  if (!user) {
    throw new ApiError(400, "User does not exist");
  }

  const isPasswordValid = await user.isPasswordCorrect(password); //ye User nhi use karna hai kyuki ye ek mongoose ka object hai like 'findOne' , 'find' etc.
  // use this 'user' - it is method aapke bnaye hue method yaha par aate hai like 'isPasswordCorrect'

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid user credentials");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password - refreshToken"
  ); // password and refreshToken ye dono field nhi chahiye

  // Now we want to send cookies
  // ye cookies koi bhi modified kar sakta hai but jab aap httpOnly and secure likh dete ho tab ye kewal server se modified hoti hai
  // frontend se modify nhi kar sakte ho

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200, // statuscode
        {
          user: loggedInUser,
          accessToken,
          refreshToken, // data part
        },
        "User logged In Successfully" //message
      )
    );
});

// logoutUser......................
// login ke time par email and username maang kar login karwa deta tha but if we use findById -  then koi bhi user email daal kar logout kar dega
// that's why use middleware - auth
const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id, // ye middleware se aya hai , aap login the aapke paas access token tha
    // maine uske basis par query kari database se aur req.user add kar diya then uske baad id nikaal lo
    // id mil gye to pura user object le aoge ek query se aur uska refresh token delete kar dunga
    {
      $unset: {
        // mongodb ka operator use karna padta hai
        refreshToken: 1, // this remove from document
      },
    },
    {
      new: true,
    }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  //clear cookies
  return res
    .status(200)
    .clearCookie("accessToken", options) // options bhi paas karna padta hai
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out"));
});

// refreshAccessToken...................
const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiResponse(401, "unauthorized request");
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodedToken?._id);
    if (!user) {
      throw new ApiError(401, "Invalid refresh token");
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "refresh token is expired or used");
    }

    const options = {
      httpOnly: true,
      secure: true,
    };

    const { accessToken, newRefreshToken } =
      await generateAccessAndRefreshTokens(user._id);

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken: newRefreshToken },
          "Access token refreshed"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token");
  }
});

// changeCurrentPassword............................
const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  // if you want to make functionality like confirmPassword
  // const {oldPassword,newPassword,confirmPassword}=req.body

  // if(newPassword === confirmPassword){
  //     throw an error
  // }

  const user = await User.findById(req.user?._id);

  const ispasswordCorrect = await user.isPasswordCorrect(oldPassword);

  if (!ispasswordCorrect) {
    throw new ApiError(400, "Invalid old Password");
  }

  user.password = newPassword;
  await user.save({ validateBeforeSave: false }); //validateBeforeSave

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password cannot be Password"));
});

// getCurrentUser.......................
const getCurrentUser = asyncHandler(async (req, res) => {
  return res.status(200).json(
    new ApiResponse(
      200, //status code
      req.user, //data
      "current user fetched successfully" //message
    )
  );
});

// updateAccountDetails..........................
const updateAccountDetails = asyncHandler(async (req, res) => {
  //take data from req.body
  const { fullName, email } = req.body;

  //advise-agar aap kahi koi file update karwa rahe ho to uske alag controller/endpoint rakhna it's better
  if (!(fullName && email)) {
    throw new ApiError(400, "all fields are required");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        // mongodb operator
        fullName, // fullName:fullName
        email: email,
      },
    },
    { new: true }
  ).select("-password"); // password ko remove kar raha hu

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated successfully"));
});

// updateUserAvatar................................
const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path; // req.file multer middleware se mila hai

  // validation
  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is missing");
  }

  //TODO: delete old image - assignment

  const avatar = await uploadOnCloudinary(avatarLocalPath);

  if (!avatar.url) {
    throw new ApiError(400, "Error while uploading avatar");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        // mongodb operator
        avatar: avatar.url,
      },
    },
    { new: true } // for new avatar
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "avatar image update successfully"));
});

// updateUserCoverImage..................................
const updateUserCoverImage = asyncHandler(async (req, res) => {
  const coverImageLocalPath = req.file?.path;

  if (!coverImageLocalPath) {
    throw new ApiError(400, "Cover Image file is missing");
  }

  // TODO: delete old image - assignment

  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!coverImage.url) {
    throw new ApiError(400, "Error while uploading CoverImage");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        coverImage: coverImage.url,
      },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "cover image updated successfully"));
});

// getUserChannelProfile .............................
const getUserChannelProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;

  if (!username?.trim()) {
    throw new ApiError(400, "username is missing");
  }

  // User.find({username})
  const channel = await User.aggregate([
    {
      // match the user
      $match: {
        username: username?.toLowerCase(),
      },
    },
    {
      // count the subscribers through the channel
      $lookup: {
        from: "subscriptions", //model me saari cheje lowercasse me ho jat hai aur plural ho jaati hai
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      // aapne kitno ko subscribe kiya hai uske subscriber ke through
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo",
      },
    },
    {
      // usme jo original user object tha usme 2-3 field aur add kar diya
      $addFields: {
        subscribersCount: {
          $size: "$subscribers",
        },
        channelsSubscribedToCount: {
          $size: "$subscribedTo",
        },
        isSubscribed: {
          $cond: {
            if: { $in: [req.user?._id, "$subscribers:subscriber"] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      // projection deta hai ki saari value ko nhi project karunga jo demand kar raha hai
      // mai usko selected cheeje dunga , jis cheej ko passon karna hai use 1 likh do
      $project: {
        fullName: 1,
        username: 1,
        subscribersCount: 1,
        channelsSubscribedToCount: 1,
        isSubscribed: 1,
        avatar: 1,
        coverImage: 1,
        email: 1,
      },
    },
  ]);
  console.log("channel", channel); // explore it

  if (!channel?.length) {
    throw new ApiError(404, "Channel does not exists");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, channel[0], "User channel fetched successfully")
    );
});

// getwatchHistory ................
const getWatchHistory = asyncHandler(async (req, res) => {
  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user._id),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
        pipeline: [
          {
            $lookup: {
              from: "user",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    fullName: 1,
                    username: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              owner: {
                $first: "$owner",
              },
            },
          },
        ],
      },
    },
  ]);
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        user[0].watchHistory,
        "watch history fetched successfully"
      )
    );
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
  getUserChannelProfile,
  getWatchHistory,
};
