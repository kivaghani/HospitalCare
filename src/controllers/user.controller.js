import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from '../models/user.model.js';
import { uploadonCloudinary } from "../utils/cloudnary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from 'jsonwebtoken'

const generateAccessAndRefreshToken = async(userId) => {
    try {

        const user = await User.findById(userId)
        const accessToken  = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({validateBeforeSave : false})

        return {accessToken, refreshToken}

    } catch (error) {
        throw new ApiError(500, "Something went wrond while generating refresh and access token")
    }
}

const registerUser = asyncHandler(async (req, res) => {
    const { fullName, email, username, password } = req.body;

    if ([fullName, email, username, password].some((field) => field?.trim() === "")) {
        throw new ApiError(400, "All fields are required");
    }

    const existedUser = await User.findOne({ $or: [{ username }, { email }] });

    if (existedUser) {
        throw new ApiError(409, "User with email or username already exists");
    }

    const avatarLocalPath = req.files?.avatar[0]?.path;

    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path;
    }

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required");
    }

    const avatar = await uploadonCloudinary(avatarLocalPath);
    if (!avatar) {
        throw new ApiError(500, "Failed to upload avatar");
    }

    const avatarUrl = avatar.secure_url;

    let coverImageUrl = '';

    if (coverImageLocalPath) {
        const coverImage = await uploadonCloudinary(coverImageLocalPath);
        if (!coverImage) {
            throw new ApiError(500, "Failed to upload cover image");
        }
        coverImageUrl = coverImage.secure_url;
    }

    const user = await User.create({
        fullName,
        avatar: avatarUrl, 
        coverImage: coverImageUrl,
        email,
        password,
        username: username.toLowerCase(),
    });

    const createdUser = await User.findById(user._id).select("-password -refreshToken");

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user");
    }

    return res.status(201).json(
        new ApiResponse(201, createdUser, "User registered successfully")
    );
});

const loginUser = asyncHandler(async(req, res) => {
    //req body -> data
    // username or email
    //findd the user
    //password check
    //access and refresh token
    //send cookie


    const {email, username, password} = req.body
     if(!username && !email){
        throw new ApiError(400, "username or email is required")
     }

    const user = await User.findOne({
        $or: [{username}, {email}]
    })

    if(!user){
        throw new ApiError(404, "User does not exist")
    }

   const isPasswordValid  = await user.isPasswordCorrect(password)
   if(!isPasswordValid){
    throw new ApiError(401, "Invalid User password")
}

 const {accessToken, refreshToken} = await generateAccessAndRefreshToken(user._id)

 const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

 const option = {
    httpOnly : true,
    secure: true
 }

 return res
 .status(200)
 .cookie("accessToken", accessToken, option)
 .cookie("refreshToken", refreshToken, option)
 .json(
    new ApiResponse(
        200,
        {
            user:  loggedInUser, accessToken, refreshToken
        },
         "User logged In Successfully"
    )
 )

})

const logoutUser = asyncHandler(async (req, res) => {
   await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    )

    const option = {
        httpOnly : true,
        secure: true
     }

     return res
     .status(200)
     .clearCookie("accessToken", option)
     .clearCookie("refreshToken", option)
     .json(new ApiResponse(200, {}, "User logged Out"))
  
})

const refreshAccessToken = asyncHandler(async(req, res) => {
   const incomingRefreshToken =  req.cookies.refreshToken || req.body.refreshToken

   if(!incomingRefreshToken){
    throw new ApiError(401, "unautorized request"  )
   }

  try {
    const decodedToken =  jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
     )
  
    const user = await User.findById(decodedToken?._id)
  
    if(!user){
      throw new ApiError(401, "Invalid refresh Token"  )
     }
  
     if(!incomingRefreshToken !== user?.refreshToken){
      throw new ApiError(401, "Refresh Token is expired"  )
  
     }
  
     const option = {
      httpOnly : true,
      secure: true
   }
  
  const {accessToken, newrefreshToken} = await generateAccessAndRefreshToken(user._id)
   return res
   .status(200)
   .cookie("accessToken", accessToken, option)
   .cookie("refreshToken", newrefreshToken, option)
   .json(
      new ApiResponse(
          200,
          {accessToken, refreshToken: newrefreshToken},
          "Access token refreshed"
      )
   )
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token" )
  }

})

export { registerUser, loginUser, logoutUser, refreshAccessToken };
