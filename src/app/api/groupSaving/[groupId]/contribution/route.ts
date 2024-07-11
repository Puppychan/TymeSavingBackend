import { ObjectId } from "mongodb";
import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "src/config/connectMongoDB";
import { verifyAuth } from "src/lib/authentication";
import { verifyMember } from "src/lib/groupSavingUtils";
import GroupSaving from "src/models/groupSaving/model";
import Transaction from "src/models/transaction/model";
import { UserRole } from "src/models/user/interface";

// GET: get the transactions associated with this group saving
export const GET = async (req: NextRequest, { params }: { params: { groupId: string }}) => {
  try {
    const searchParams = req.nextUrl.searchParams
    const userId = searchParams.get('userId')
    const from = searchParams.get('fromDate')
    const to = searchParams.get('toDate')
    await connectMongoDB();

    const verification = await verifyAuth(req.headers)
    if (verification.status !== 200) {
      return NextResponse.json({ response: verification.response }, { status: verification.status });
    }

    const authUser = verification.response;

    if (authUser.role !== UserRole.Admin) {
      const isMember = await verifyMember(authUser._id, params.groupId)
      if (!isMember)
        return NextResponse.json({ response: 'This user is neither an admin nor a member of the group saving' }, { status: 401 });
    }
    
    const group = await GroupSaving.findById(params.groupId)
    if (!group) {
      return NextResponse.json({ response: 'Group Saving not found' }, { status: 404 });
    }

    let filter = []
    if (from || to ) {
      let dateFilter : any = {}
      if (from) dateFilter['$gte'] = new Date(from)
      if (to) dateFilter['$lte'] = new Date(to)
        filter.push({ "createdDate": dateFilter })
    }

    if (userId) {
      filter.push({ "userId": new ObjectId(userId) })
    }

    let query = {}
    if (filter.length > 0) query['$and'] = filter

    let contribution = []
    contribution = await Transaction.aggregate([
      { $match: { savingGroupId: new ObjectId(params.groupId) } },
      { $match: query },
      { $lookup: { 
          from: 'users', 
          localField: 'userId', 
          foreignField: '_id',
          pipeline: [
            { $project: {
                _id: 1,
                username: 1,
                fullname: 1,
                phone: 1,
                tymeReward: 1
              }
            }
          ], 
          as: 'user' 
        } 
      },
      { $unwind : "$user" },
      { $group : {
          _id: "$user._id",
          user: { $first: "$user"},
          contribution: { $sum: "$amount" }
        }
      },
      { $project: { _id: 0 } }
    ])         

    return NextResponse.json({ response: contribution }, { status: 200 });
  } catch (error: any) {
    console.log('Error getting member list:', error);
    return NextResponse.json({ response: 'Failed to get member list'}, { status: 500 });
  }
};

