export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "src/config/connectMongoDB";
import { newToken } from "src/lib/authentication";
import GroupSavingParticipation from "src/models/groupSavingParticipation/model";
import SharedBudgetParticipation from "src/models/sharedBudgetParticipation/model";
import User from "src/models/user/model";

// GET: Read the shortened user information - used when viewed by other users
export const GET = async (
  req: NextRequest,
  { params }: { params: { query: string } }
) => {
  try {
    await connectMongoDB();
    const searchQuery = params.query;
    const urlSearchParams = req.nextUrl.searchParams;
    let searchParams: { [key: string]: string } = {};
    urlSearchParams.forEach((value, key) => {
      searchParams[key] = value;
    });
    // Use a regular expression to perform a case-insensitive search for any records containing the searchQuery in username, fullname, or email
    const regex = new RegExp("^" + searchQuery, "i");
  let query: any = {
      $or: [{ username: regex }, { fullname: regex }, { email: regex }],
    };

    // Add the exclusion condition if exceptSavingId is provided
    const exceptSavingId = searchParams["exceptSavingId"];
    const exceptBudgetId = searchParams["exceptBudgetId"];
    if (exceptSavingId != null) {
      const excludedUserIds = await GroupSavingParticipation.distinct("user", {
        groupSaving: exceptSavingId,
      });
      query = {
        $and: [
          query,
          { _id: { $nin: excludedUserIds } },
        ],
      };
    }
    // Add the exclusion condition if exceptBudgetId is provided
    else if (exceptBudgetId != null) {
      const excludedUserIds = await SharedBudgetParticipation.distinct("user", {
        sharedBudget: exceptBudgetId,
      });
      query = {
        $and: [
          query,
          { _id: { $nin: excludedUserIds } },
        ],
      };
      console.log("Budget query is: ", query);
    }

    const users = await User.find(query);

    if (!users.length) {
      return NextResponse.json({ response: "No users found" }, { status: 404 });
    }

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
      };
    });

    return NextResponse.json({ response: returnUsers }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ response: error.message }, { status: 500 });
  }
};
