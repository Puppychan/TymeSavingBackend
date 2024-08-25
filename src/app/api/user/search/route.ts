export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "src/config/connectMongoDB";
import { newToken } from "src/lib/authentication";
import GroupSavingParticipation from "src/models/groupSavingParticipation/model";
import SharedBudgetParticipation from "src/models/sharedBudgetParticipation/model";
import UserInvitation from "src/models/userInvitation/model";
import User from "src/models/user/model";
import mongoose from "mongoose";

// GET: Read the shortened user information - used when viewed by other users
/* 
  When only 'query' is provided: return information for users whose info match 'query'
  When a group ID and 'query' is provided: return information for users who
- is not currently in this group (look into SharedBudgetParticipation, GroupSavingParticipation)
- does not have a pending invitation to this group (look into UserInvitation)
  When no 'query' is provided: return all matching users
*/
export const GET = async (
  req: NextRequest,
  { params }: { params: { query: string } }
) => {
  try {
    await connectMongoDB();
    const urlSearchParams = req.nextUrl.searchParams;
    let searchParams: { [key: string]: string } = {};
    urlSearchParams.forEach((value, key) => {
      searchParams[key] = value;
    });
    const searchQuery = searchParams['query'];
    // Use a regular expression to perform a case-insensitive search for any records containing the searchQuery in username, fullname, or email
    const regex = new RegExp("^" + searchQuery, "i");
    let query: any = {};
    if(searchQuery){
      query = { 
        $or: [{ username: regex }, { fullname: regex }, { email: regex }],
      }
    };
    var users = [];

    // Add the exclusion condition if exceptSavingId is provided
    const exceptSavingId = searchParams["exceptSavingId"];
    const exceptBudgetId = searchParams["exceptBudgetId"];
    console.log("Searching with queries: " + searchQuery, exceptSavingId, exceptBudgetId);
    // 1. Only 'query' is provided -> return the list of matching users
    if (exceptBudgetId == null && exceptSavingId == null){
      users = await User.find(query);
    }
    // 2. Group ID is provided -> return users not invited/not in this group
    else{
      // Get the IDs of the users matching this query
      const projection = { _id: 1};
      var userIdList = (await User.find(query, projection)).map(item => item._id);
      if (!searchQuery) {
        userIdList = (await User.find({}, projection)).map((item) => item._id);
      }
      if(!userIdList){
        return NextResponse.json({ response: "No users found" }, { status: 404 });
      }
      var pendingUsers, activeUsers;
// Handle GroupSaving
      if (exceptSavingId != null) {
        const exceptGS = new mongoose.Types.ObjectId(exceptSavingId);
        // Get IDs of users without pending invitations to this group
        let pendingUsersGSPipeline = pendingUsersPipeline(exceptGS, userIdList);
        
        // Pipeline to find IDs of users already participating in the Group Saving
        let activeUsersGSPipeline = [
          // Stage 1: Match GroupSavingParticipation where sharedBudget is exceptGS and user is in usersList
          {
            $match: { groupSaving: exceptGS, user: { $in: userIdList } }
          },
          // Stage 2: Project to include only user IDs
          { $project: { user: 1, _id: 0 } }
        ];
        
        // Execute both pipelines
        [pendingUsers, activeUsers] = await Promise.all([
          UserInvitation.aggregate(pendingUsersGSPipeline),
          GroupSavingParticipation.aggregate(activeUsersGSPipeline)
        ]);
        // console.log("GS Pipelines results", pendingUsers, activeUsers);

      }
      // Add the exclusion condition if exceptBudgetId is provided: No active user in this group, No pending invitation
      else if (exceptBudgetId != null) {
        const exceptSB = new mongoose.Types.ObjectId(exceptBudgetId);
        // Get IDs of users without pending invitations to this group
        let pendingUsersSBPipeline = pendingUsersPipeline(exceptSB, userIdList);
        
        // Pipeline to find IDs of users already participating in the Shared Budget
        let activeUsersSBPipeline = [
          // Stage 1: Match SharedBudgetParticipation where sharedBudget is exceptSB and user is in usersList
          {
            $match: { sharedBudget: exceptSB, user: { $in: userIdList } }
          },
          // Stage 2: Project to include only user IDs
          { $project: { user: 1, _id: 0 } }
        ];
        
        // Execute both pipelines
        [pendingUsers, activeUsers] = await Promise.all([
          UserInvitation.aggregate(pendingUsersSBPipeline),
          SharedBudgetParticipation.aggregate(activeUsersSBPipeline)
        ]);
        // console.log("SB Pipelines results", pendingUsers, activeUsers);
      }
      // Extract user IDs from results. Convert to string to compare and reduce.
      let pendingUserIds = pendingUsers.map(user => user.userId.toString());
      let activeUserIds = activeUsers.map(user => user.user.toString());
      userIdList = userIdList.map(userId => userId.toString());
      // console.log("Before filter", pendingUserIds, activeUserIds, userIdList);

      // Filter userIdList to get users not in pendingUsers or activeUsers
      userIdList = userIdList.reduce((acc, item) => {
        if (!pendingUserIds.includes(item) && !activeUserIds.includes(item)) {
          acc.push(item);
        }
        return acc;
      }, []);
      // console.log("Filtered", userIdList);
      users = await User.find({_id: {$in: userIdList}});
    }

    // Got users list; Show selected information
    if (!users.length) {
      return NextResponse.json({ response: "No users found" }, { status: 404 });
    }
    console.log(users.length);

    // Convert each user document to a plain JavaScript object and remove sensitive fields
    const returnUsers = users.map((user) => {
      let objectUser = user.toObject();
      return {
        _id: objectUser._id,
        username: objectUser.username,
        email: objectUser.email,
        phone: objectUser.phone,
        fullname: objectUser.fullname,
        avatar: objectUser.avatar,
        userPoints: objectUser.userPoints,
        tymeReward: objectUser.tymeReward,
      };
    });

    return NextResponse.json({ response: returnUsers }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ response: error.message }, { status: 500 });
  }
};


function pendingUsersPipeline (exceptGroupId, userIdList){
  return [
    // Stage 1: Match UserInvitation where userID is in usersList and status is "Pending"
    {
      $match: {
        userId: { $in: userIdList },
        status: "Pending"
      }
    },
    // Stage 2: Lookup Invitation to get groupID
    {
      $lookup: {
        from: "invitations",
        localField: "invitationId",
        foreignField: "_id",
        as: "invitationDetails"
      }
    },
    // Unwind
    {
      $unwind: "$invitationDetails"
    },
    // Stage 3: Match Invitation where groupID is exceptGroupId
    {
      $match: {
        "invitationDetails.groupId": exceptGroupId
      }
    },
    // Stage 4: Project to include only userID
    {
      $project: {
        userId: 1,
        _id: 0
      }
    }
  ];
}