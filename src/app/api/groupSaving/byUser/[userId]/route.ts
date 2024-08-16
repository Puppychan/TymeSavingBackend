import { ObjectId } from "mongodb";
import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "src/config/connectMongoDB";
import { verifyAuth } from "src/lib/authentication";
import GroupSavingParticipation from "src/models/groupSavingParticipation/model";
import { localDate } from "src/lib/datetime";

// GET: get group saving list of a user
export const GET = async (req: NextRequest, { params }: { params: { userId: string }}) => {
  try {
      const searchParams = req.nextUrl.searchParams
      const name = searchParams.get('name')
      const from = searchParams.get('fromDate')
      const to = searchParams.get('toDate')
      const sort = searchParams.get('sort') || 'descending' // sort: ascending/descending
      const showClosedExpired = searchParams.get('showClosedExpired') ?? 'true'; // also show closed or expired groups
      const pageNo = searchParams.get('pageNo') ? parseInt(searchParams.get('pageNo')) : 1
      const pageSize = searchParams.get('pageSize') ? parseInt(searchParams.get('pageSize')) : 10
      await connectMongoDB();

      const verification = await verifyAuth(req.headers, params.userId)
      if (verification.status !== 200) {
        return NextResponse.json({ response: verification.response }, { status: verification.status });
      }

      let filter = []
      if (name) {
        filter.push({ "groupSaving.name":{ $regex:'.*' + name + '.*', $options: 'i' } })
      }

      if (from || to ) {
        let dateFilter : any = {}
        if (from) dateFilter['$gte'] = new Date(from)
        if (to) dateFilter['$lte'] = new Date(to)
          filter.push({ "joinedDate": dateFilter })
      }

      let query = {}
      if (filter.length > 0) query['$and'] = filter
      if(showClosedExpired != 'true'){  
        query["groupSaving.endDate"] = { $gt: localDate(new Date()) };
        query["groupSaving.isClosed"] = false ;
      }

      let list = []
      list = await GroupSavingParticipation.aggregate([
          { $match: { user: new ObjectId(params.userId) } },
          { $lookup: {from: 'groupsavings', localField: 'groupSaving', foreignField: '_id', as: 'groupSaving'} },
          { $unwind : "$groupSaving" },
          { 
            $addFields: {
              "groupSaving.isClosedOrExpired": {
                $or: [
                  { $lt: ["$groupSaving.endDate", localDate(new Date())] },
                  "$groupSaving.isClosed"
                ]
              }
            }
          },
          { $match: query },
          { $sort: { createdDate: (sort === 'ascending') ? 1 : -1 } },
          { $replaceRoot: { newRoot: "$groupSaving" } },
          { $skip: (pageNo - 1) * pageSize },
          { $limit: pageSize }
        ])
      // console.log("Group Saving List: ", list);
       
      return NextResponse.json({ response: list }, { status: 200 });
  } catch (error: any) {
    console.log('Error getting group saving list:', error);
    return NextResponse.json({ response: 'Failed to get group saving list'}, { status: 500 });
  }
};
