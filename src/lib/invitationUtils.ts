import Invitation from "src/models/invitation/model";
import User from "src/models/user/model";
import { connectMongoDB } from "src/config/connectMongoDB";
import mongoose, { startSession } from "mongoose";
import SharedBudget from "src/models/sharedBudget/model";
import SharedBudgetParticipation from "src/models/sharedBudgetParticipation/model";
import GroupSavingParticipation from "src/models/groupSavingParticipation/model";
import GroupSaving from "src/models/groupSaving/model";
import UserInvitation from "src/models/userInvitation/model";
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
    // console.log(Object.keys(params).length, fromUser, params);
    let aggregate = Invitation.aggregate();
    // Lookup for user invitations
    aggregate
      .lookup({
        from: "userinvitations",
        localField: "_id",
        foreignField: "invitationId",
        as: "userInvitations",
      })
      .unwind({
        path: "$userInvitations",
        preserveNullAndEmptyArrays: true, // Keep documents even if there are no invitations
      });

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
      .addFields({
        hostedByUserDetails: { $arrayElemAt: ["$hostedByUserDetails", 0] },
      });

    // Perform separate lookups for `groupsavingparticipations` and `sharedbudgetparticipations`
    aggregate
      // Lookup for GroupSaving participations
      .lookup({
        from: "groupsavingparticipations",
        let: { groupId: "$groupId" },
        pipeline: [
          {
            $match: {
              $expr: {
                $eq: ["$groupSaving", "$$groupId"], // Match the groupSavingId
              },
            },
          },
          {
            $project: { role: 1 }, // Only project the role field
          },
        ],
        as: "groupSavingMembers",
      })

      // Lookup for SharedBudget participations
      .lookup({
        from: "sharedbudgetparticipations",
        let: { groupId: "$groupId" },
        pipeline: [
          {
            $match: {
              $expr: {
                $eq: ["$sharedBudget", "$$groupId"], // Match the sharedBudgetId
              },
            },
          },
          {
            $project: { role: 1 }, // Only project the role field
          },
        ],
        as: "sharedBudgetMembers",
      })

      // Use $cond to select groupMembers based on the type (GroupSaving or SharedBudget)
      .addFields({
        groupMembers: {
          $cond: {
            if: { $eq: ["$type", "GroupSaving"] },
            then: "$groupSavingMembers",
            else: "$sharedBudgetMembers",
          },
        },
      })

      // Filter groupMembers to calculate the memberCount
      .addFields({
        memberCount: {
          $size: {
            $filter: {
              input: "$groupMembers",
              as: "member",
              cond: { $eq: ["$$member.role", "Member"] }, // Count only the "Member" role
            },
          },
        },
      });

    // Lookup invited user details
    aggregate
      .lookup({
        from: "users",
        localField: "userInvitations.userId",
        foreignField: "_id",
        as: "invitedUserDetails",
      })
      .addFields({
        invitedUserDetails: { $arrayElemAt: ["$invitedUserDetails", 0] },
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
    aggregate.project({
      invitationId: "$_id",
      userId: fromUser ? fromUser : "$userInvitations.userId",
      invitedUserFullName: "$invitedUserDetails.fullname",
      invitedUsername: "$invitedUserDetails.username",
      code: 1,
      description: 1,
      type: 1,
      groupId: 1,
      status: "$userInvitations.status",
      summaryGroup: {
        name: "$groupDetails.name",
        description: "$groupDetails.description",
        hostUsername: "$hostedByUserDetails.username",
        hostFullName: "$hostedByUserDetails.fullname",
        memberCount: "$memberCount",
        createdDate: "$groupDetails.createdDate",
      },
    });
    let result = await aggregate.exec();

    return { response: result, status: 200 };
  } catch (error: any) {
    return { response: error.message, status: 500 };
  }
};
// When the user accepts/declines an invitation to a group,
// returns true if the user is already in said group, false otherwise
export const isUserInGroup = async (
  userId: string,
  groupId: string,
  groupType
) => {
  return new Promise(async (resolve, reject) => {
    await connectMongoDB();
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw "CheckInvitation: User not found";
      }
      if (groupType == "SharedBudget") {
        const budgetGroup = await SharedBudget.findById(groupId);
        if (!budgetGroup) {
          throw "CheckInvitation: SharedBudget not found";
        }
        const existSBP = await SharedBudgetParticipation.find({
          userId: userId,
          sharedBudget: groupId,
        });
        if (existSBP) {
          console.log("CheckInvitation: User is already in this SharedBudget");
          resolve(true);
          return;
        }
        console.log(
          "CheckInvitation:User is not in this SharedBudget and can be invited."
        );
        resolve(false);
        return;
      } else if (groupType == "GroupSaving") {
        const savingGroup = await GroupSaving.findById(groupId);
        if (!savingGroup) {
          throw "CheckInvitation: GroupSaving not found";
        }
        const existSBP = await GroupSavingParticipation.find({
          userId: userId,
          sharedBudget: groupId,
        });
        if (existSBP) {
          console.log("CheckInvitation: User is already in this GroupSaving");
          resolve(true);
          return;
        }
        console.log(
          "CheckInvitation: User is not in this GroupSaving and can be invited."
        );
        resolve(false);
        return;
      }
    } catch (error) {
      reject(error);
    }
  });
};

// Delete UserInvitation entry of userId-invitationId. Also remove userId from invitation.users
export const removeUserInvitation = async (userId: string, invitationId: string) => {
  await connectMongoDB();
  const dbSession = await startSession();
  dbSession.startTransaction();
  return new Promise(async (resolve, reject) => {
    try{
      const invitation = await Invitation.findById(invitationId);
      if(!invitation){
        reject("REMOVE: Cannot find invitation with id " + invitationId);
      }
      // Remove userId from invitation.users
      var pendingUsers: string[] = invitation.users;
      invitation.users = pendingUsers.filter((id) => id !== userId);
      // Update the Pending UserInvitation object to Accepted
      const userInvitationObject = await UserInvitation.findOneAndUpdate(
        { userId: userId, invitationId: invitationId}, 
        { status: 'Accepted' }
      );
      await invitation.save();
      await dbSession.commitTransaction();
      await dbSession.endSession();
      resolve("Remove UserInvitation: Success");
    } catch (error){
      await dbSession.abortTransaction();
      await dbSession.endSession();
      reject("Error removing UserInvitation: " + error);
    }
  });
}
