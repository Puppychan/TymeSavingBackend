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
      await connectMongoDB();

      const verification = await verifyAuth(req.headers, params.userId)
      if (verification.status !== 200) {
        return NextResponse.json({ response: verification.response }, { status: verification.status });
      }

      let filter = []
      if (name) {
        filter.push({$or: [
          { "groupSaving.name":{ $regex:'.*' + name + '.*', $options: 'i' } },
          { "user.fullname": { $regex:'.*' + name + '.*', $options: 'i' } }
        ]});
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
          { $lookup: {from: 'users', localField: 'groupSaving.hostedBy', foreignField: '_id', as: 'user'} },
          { $unwind : "$user" },
          { 
            $addFields: {
              "groupSaving.isClosedOrExpired": {
                $or: [
                  { $lt: ["$groupSaving.endDate", localDate(new Date())] },
                  "$groupSaving.isClosed"
                ]
              },
              "groupSaving.hostedByFullName": "$user.fullname"
            }
          },
          { $match: query },
          { $sort: { createdDate: (sort === 'ascending') ? 1 : -1 } },
          { $replaceRoot: { newRoot: "$groupSaving" } },
        ])
       
      return NextResponse.json({ response: list }, { status: 200 });
  } catch (error: any) {
    console.log('Error getting group saving list:', error);
    return NextResponse.json({ response: 'Failed to get group saving list: ' + error}, { status: 500 });
  }
};
