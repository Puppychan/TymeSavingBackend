import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "src/config/connectMongoDB";
import { verifyUser } from "src/lib/authentication";
import User from "src/models/user/model";
import ChallengeProgress from "src/models/challengeProgress/model";
import mongoose from "mongoose";

// GET: Read the user information
export const GET = async (
  req: NextRequest,
  { params }: { params: { userId: string } }
) => {
  try {
    await connectMongoDB();
    let urlSearchParams = req.nextUrl.searchParams;
    let vnpParams: { [key: string]: string } = {};
    urlSearchParams.forEach((value, key) => {
        vnpParams[key] = value;
    });
    // Sort date and challenge name from search parameters
    const sortDatePassed = vnpParams['sortDatePassed'];
    const sortChallengeName = vnpParams['sortChallengeName'];
    let sort = {};
    if(sortDatePassed){
        const order = sortDatePassed == "ascending" ? 1:-1;
        sort["checkpointPassedDate"] = order;
    }
    if(sortChallengeName){
        const order = sortChallengeName == "ascending" ? 1:-1;
        sort["challengeName"] = order;
    }
    if (!sortChallengeName && !sortDatePassed){
        sort["checkpointPassedDate"] = -1; // Default option: most recent reward
    }
    const user = await User.findById(params.userId);
    if (!user) {
      return NextResponse.json({ response: "User not found" }, { status: 404 });
    }
    // Verify logged in user
    const verification = await verifyUser(req.headers, user.username)
    if (verification.status !== 200) {
      return NextResponse.json({ response: verification.response }, { status: verification.status });
    }    
    const userId = params.userId;
    let rewardHistory = await ChallengeProgress.aggregate([
    // 1. Match userId
      {
        $match: { "userId": new mongoose.Types.ObjectId(userId) }
      }, 
    // 2. Separate checkpoint passed
      {
        $unwind: { "path": "$checkpointPassed" }
      }, 
      {
        $lookup: {
          from: "challengecheckpoints", 
          localField: "checkpointPassed.checkpointId", 
          foreignField: "_id", 
          as: "cp"
        }
      }, 
      {
        $unwind: { path: "$cp" }
      }, 
    // 3. Get reward information for each checkpoint passed
      {
        $lookup: {
          from: "rewards", 
          localField: "cp.reward", 
          foreignField: "_id", 
          as: "reward"
        }
      }, 
      {
        $unwind: { path: "$reward" }
      }, 
    // 4. Get challenge name
      {
        $lookup: {
          from: "financialchallenges", 
          localField: "challengeId", 
          foreignField: "_id", 
          as: "challenge"
        }
      }, 
      {
        $unwind: { path: "$challenge" }
      }, 
    // 5. Show passed date, challenge name, checkpoint name, prize
      {
        $addFields: {
          checkpointPassedDate: "$checkpointPassed.date",
          checkpointName: "$cp.name",
          challengeName: "$challenge.name",
          prize: "$reward.prize"
        }
      },
      {
        $project:{
          _id: 0,
          checkpointPassedDate: 1,
          challengeName: 1,
          checkpointName: 1,
          prize: 1
        }
      },
      {
        $sort: sort
      }
    ]);

    return NextResponse.json({ response: rewardHistory }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ response: error.message }, { status: 500 });
  }
};
