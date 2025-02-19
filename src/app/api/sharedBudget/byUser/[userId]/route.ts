import { ObjectId } from "mongodb";
import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "src/config/connectMongoDB";
import { verifyAuth } from "src/lib/authentication";
import SharedBudgetParticipation from "src/models/sharedBudgetParticipation/model";
import { localDate } from "src/lib/datetime";
// import ISODate
// GET: get shared budget list of a user
export const GET = async (req: NextRequest, { params }: { params: { userId: string }}) => {
  try {
      const searchParams = req.nextUrl.searchParams
      const name = searchParams.get('name') // the search box
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
          { "sharedBudget.name":{ $regex:'.*' + name + '.*', $options: 'i' } },
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
        query["sharedBudget.endDate"] = { $gt: localDate(new Date()) };
        query["sharedBudget.isClosed"] = false ;
      }
      
      // Only allow transactions to be made to groups that have not been closed: endDate + isClosed = false
      let list = await SharedBudgetParticipation.aggregate([
          { $match: { user: new ObjectId(params.userId) } },
          { $lookup: {from: 'sharedbudgets', localField: 'sharedBudget', foreignField: '_id', as: 'sharedBudget'} },
          { $unwind : "$sharedBudget" },
          { $lookup: {from: 'users', localField: 'sharedBudget.hostedBy', foreignField: '_id', as: 'user'} },
          { $unwind : "$user" },
          { 
            $addFields: {
              "sharedBudget.isClosedOrExpired": {
                $or: [
                  { $lt: ["$sharedBudget.endDate", localDate(new Date())] },
                  "$sharedBudget.isClosed"
                ]
              },
              "sharedBudget.hostedByFullName": "$user.fullname"
            }
          },
          { $match: query },
          { $sort: { createdDate: (sort === 'ascending') ? 1 : -1 } },
          { $replaceRoot: { newRoot: "$sharedBudget" } }
        ]);
       
      return NextResponse.json({ response: list }, { status: 200 });
  } catch (error: any) {
    console.log('Error getting shared budget list:', error);
    return NextResponse.json({ response: 'Failed to get shared budget list: ' + error}, { status: 500 });
  }
};
