import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const healthcheck = asyncHandler(async (req, res) => {
  try {
    console.log("Checking database connection...");
   
    res.status(200).json(new ApiResponse(200, { message: "Server is running" }));
  } catch (error) {
    console.error("Healthcheck failed:", error);
   
    res
      .status(500)
      .json(new ApiError(500, "Server is not running due to an internal error"));
  }
});

export { healthcheck };
