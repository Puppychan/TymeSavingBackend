import { group } from "console";
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
    let groupByUser = ( searchParams.get('groupByUser') === 'true' ) ? true : false
    const userId = searchParams.get('userId')
    const type = searchParams.get('type')
    const category = searchParams.get('category')
    const from = searchParams.get('fromDate')
    const to = searchParams.get('toDate')
    const sort = searchParams.get('sort') || 'descending' // sort: ascending/descending
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

    if (type) {
      filter.push({ "type": type })
    }

    if (category) {
      filter.push({ "category": category })
    }

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

    let groupBy = []
    if (groupByUser) {
      groupBy = [
        { $group :{
            _id: "$user._id",
            userId: { $first: "$user._id"},
            transactions: { $push: "$$ROOT" }
          }
        }
      ]
    }

    let project = [] 
    if (groupByUser) {
      project = [
        { $project: { _id: 0 }}
      ]
    }
    let histrory = []
    histrory = await Transaction.aggregate([
      { $match: { savingGroupId: new ObjectId(params.groupId) } },
      { $match: query },
      { $sort: { createdDate: (sort === 'ascending') ? 1 : -1 } },
      { $lookup: { 
          from: 'users', 
          localField: 'userId', 
          foreignField: '_id',
          pipeline: [
            { $project: {
                _id: 1,
                username: 1,
                fullname: 1,
                phone: 1
              }
            }
          ], 
          as: 'user' 
        } 
      },
      { $unwind : "$user" },
      { $project: { userId: 0 }},
      ...groupBy,
      ...project,
    ])         

    return NextResponse.json({ response: histrory }, { status: 200 });
  } catch (error: any) {
    console.log('Error getting member list:', error);
    return NextResponse.json({ response: 'Failed to get member list'}, { status: 500 });
  }
};

