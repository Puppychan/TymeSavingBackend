import Invitation from "src/models/invitation/model";
import User from "src/models/user/model";
import { connectMongoDB } from "src/config/connectMongoDB";
import mongoose from "mongoose";
// Queries for invitation/admin and invitation/byUser/[userId]
/* 
    Sort: 
        sortGroupId
        sortGroupType
        sortStatus
    Match: 
        getGroupId
        getGroupType
        getCode
        getStatus  : Accepted, Cancelled, Pending
    Handle user:
        Admin: getUserId to match User Id
        User: fromUser
*/

export const invitationData = async (fromUser: string | null, params) => {
  // fromUser = userId -> show invitations for one user; else: from
  try {
    await connectMongoDB();
    console.log(Object.keys(params).length, fromUser, params);
    let aggregate = Invitation.aggregate();
    aggregate.lookup({
      from: "userinvitations",
      localField: "_id",
      foreignField: "invitationId",
      as: "userInvitations",
    });
    // if(fromUser || params.hasOwnProperty('getUserId') || params.hasOwnProperty('getStatus') || params.hasOwnProperty('sortStatus')){
    //     aggregate.unwind('$userInvitations'); // unwind so that the user only sees each invitation once
    // }
    aggregate.unwind("$userInvitations");

    // Lookup from GroupSaving
    // Combined lookup for both GroupSaving and SharedBudget
    aggregate
      .lookup({
        from: "groupsavings",
        localField: "groupId",
        foreignField: "_id",
        as: "groupSavingDetails",
      })
      .lookup({
        from: "sharedbudgets",
        localField: "groupId",
        foreignField: "_id",
        as: "sharedBudgetDetails",
      })
      .addFields({
        groupDetails: {
          $cond: {
            if: { $gt: [{ $size: "$groupSavingDetails" }, 0] },
            then: { $arrayElemAt: ["$groupSavingDetails", 0] },
            else: { $arrayElemAt: ["$sharedBudgetDetails", 0] },
          },
        },
      });

    // Lookup hostedBy user details
    aggregate
      .lookup({
        from: "users",
        localField: "groupDetails.hostedBy",
        foreignField: "_id",
        as: "hostedByUserDetails",
      })
      .unwind("$hostedByUserDetails");

    // Efficient lookup with conditional logic for participation
    aggregate
      .lookup({
        from: "groupsavingparticipations",
        let: { groupId: "$groupId", groupType: "$type" },
        pipeline: [
          {
            $match: {
              $expr: {
                $or: [
                  {
                    $and: [
                      { $eq: ["$groupSaving", "$$groupId"] },
                      { $eq: ["$$groupType", "GroupSaving"] },
                    ],
                  },
                  {
                    $and: [
                      { $eq: ["$sharedBudget", "$$groupId"] },
                      { $eq: ["$$groupType", "SharedBudget"] },
                    ],
                  },
                ],
              },
            },
          },
          {
            $project: { role: 1 }, // Only retrieve the role field to minimize data load
          },
        ],
        as: "groupMembers",
      })
      .addFields({
        memberCount: {
          $size: {
            $filter: {
              input: "$groupMembers",
              as: "member",
              cond: { $eq: ["$$member.role", "Member"] },
            },
          },
        },
      });
    //User: Get all the invitations for this user
    if (fromUser) {
      aggregate.match({
        "userInvitations.userId": new mongoose.Types.ObjectId(fromUser),
      });
    }
    // //Admin: Get all the invitations for a queried user
    if (params.hasOwnProperty("getUserId")) {
      const userId: string = params["getUserId"];
      console.log(userId);
      if (mongoose.Types.ObjectId.isValid(userId)) {
        console.log("Valid");
        aggregate.match({
          "userInvitations.userId": new mongoose.Types.ObjectId(userId),
        });
      }
    }

    // Match groupId
    if (params.hasOwnProperty("getGroupId")) {
      const groupId: string = params["getGroupId"];
      aggregate.match({ groupId: new mongoose.Types.ObjectId(groupId) });
    }

    // Match group type
    if (params.hasOwnProperty("getGroupType")) {
      const groupType = params["getGroupType"];
      aggregate.match({ type: groupType });
    }

    // Match invitation code
    if (params.hasOwnProperty("getCode")) {
      const code = params["getCode"];
      aggregate.match({ code: code });
    }

    // Match invitation status
    if (params.hasOwnProperty("getStatus")) {
      const invitationStatus = params["getStatus"];
      aggregate.match({ "userInvitations.status": invitationStatus });
    }

    // Default sorting
    if (Object.keys(params).length == 0) {
      aggregate.sort({ _id: 1 }); //sort by invitation._id -> by time created
    }

    // Sort by groupId
    if (params.hasOwnProperty("sortGroupId")) {
      const sortOrder = params["sortGroupId"] === "ascending" ? 1 : -1;
      aggregate.sort({ groupId: sortOrder });
    }

    // Sort by group type
    if (params.hasOwnProperty("sortGroupType")) {
      const sortOrder = params["sortGroupType"] === "ascending" ? 1 : -1;
      aggregate.sort({ type: sortOrder });
    }

    // Sort by invitation status - in UserInvitation
    if (params.hasOwnProperty("sortStatus")) {
      const sortOrder = params["sortStatus"] === "ascending" ? 1 : -1;
      aggregate.sort({ "userInvitations.status": sortOrder });
    }

    // Execute the aggregation pipeline
    let result = await aggregate.exec();

    // Filter fields for user
    if (fromUser) {
      result = result.map((invitation: any) => ({
        invitationId: invitation._id,
        userId: fromUser,
        code: invitation.code,
        description: invitation.description,
        type: invitation.type,
        groupId: invitation.groupId,
        status: invitation.userInvitations.status,
        summaryGroup: {
          name: invitation.groupDetails.name,
          description: invitation.groupDetails.description,
          hostUsername: invitation.hostedByUserDetails.username,
          memberCount: invitation.memberCount,
          createdDate: invitation.groupDetails.createdDate,
        },
      }));
    } else {
      result = result.map((invitation: any) => ({
        invitationId: invitation._id,
        userId: invitation.userInvitations.userId,
        status: invitation.userInvitations.status,
        code: invitation.code,
        description: invitation.description,
        type: invitation.type,
        groupId: invitation.groupId,
        summaryGroup: {
            name: invitation.groupDetails.name,
            description: invitation.groupDetails.description,
            hostUsername: invitation.hostedByUserDetails.username,
            memberCount: invitation.memberCount,
            createdDate: invitation.groupDetails.createdDate,
          },
        // // user list: show this to admin?
        // users: invitation.users,
        // cancelledUsers: invitation.cancelledUsers
      }));
    }
    console.log(result);

    return { response: result, status: 200 };
  } catch (error: any) {
    return { response: error.message, status: 500 };
  }
};

// Check if this user is in the GroupSaving/SharedBudget
export const checkUserInGroup = async (
  userId: string,
  groupId: string,
  groupType: "SharedBudget" | " GroupSaving"
) => {};
