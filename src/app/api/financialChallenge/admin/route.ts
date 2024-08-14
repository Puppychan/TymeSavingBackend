import { ObjectId } from "mongodb";
import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "src/config/connectMongoDB";
import { verifyAuth } from "src/lib/authentication";
import FinancialChallenge from "src/models/financialChallenge/model";
import { UserRole } from "src/models/user/interface";

// GET: get financial challenge list for admin
export const GET = async (req: NextRequest) => {
  try {
      const searchParams = req.nextUrl.searchParams
      const userId = searchParams.get('userId')
      const name = searchParams.get('name')
      const from = searchParams.get('fromDate')
      const to = searchParams.get('toDate')
      const sortCreatedDate = searchParams.get('sortCreatedDate'); // ascending/descending
      const sortName = searchParams.get('sortName'); // ascending/descending
      const pageNo = searchParams.get('pageNo') ? parseInt(searchParams.get('pageNo')) : 1
      const pageSize = searchParams.get('pageSize') ? parseInt(searchParams.get('pageSize')) : 10

      await connectMongoDB();

      const verification = await verifyAuth(req.headers)
      if (verification.status !== 200) {
        return NextResponse.json({ response: verification.response }, { status: verification.status });
      }

      const authUser = verification.response;

      if (authUser.role !== UserRole.Admin) {
        return NextResponse.json({ response: 'Forbidden Action: available for admin only' }, { status: 401 });
      }

      let filter = []
      if (userId) {
        filter.push({ "members":{ $in: [new ObjectId(userId)] } })
      }

      if (name) {
        filter.push({ "name":{ $regex:'.*' + name + '.*', $options: 'i' } })
      }

      if (from || to ) {
        let dateFilter : any = {}
        if (from) dateFilter['$gte'] = new Date(from)
        if (to) dateFilter['$lte'] = new Date(to)
          filter.push({ "createdDate": dateFilter })
      }

      let query = {}
      if (filter.length > 0) query['$and'] = filter

      let sort = {}
      sort['name'] = 1; //default option
      if(sortCreatedDate === 'ascending' || sortCreatedDate === 'descending'){
        sort['createdDate'] = sortCreatedDate === 'ascending' ? 1:-1;
      }
      if(sortName === 'ascending' || sortName === 'descending'){
        sort['name'] = sortName === 'ascending' ? 1:-1;
      }

      let list = [];
      list = await FinancialChallenge.aggregate([
          // { $match: { isPublished: true } }, // Can admin view unpublished challenges?
          { $match: query },
          { $lookup: {
            from: 'users', // Collection to join with
            localField: 'createdBy', // Field from FinancialChallenge
            foreignField: '_id', // Field from User
            as: 'creator', // Output field name
            pipeline: [
              { $project: { _id: 0, fullname: 1 } } // Only fetch the fullname field
            ]
            }
          },
          { $unwind: '$creator'},
          { $addFields: {
            createdBy: '$creator.fullname' // Show the fullname instead of user ID
            }
          },
          { $sort: sort },
          { $skip: (pageNo - 1) * pageSize },
          { $limit: pageSize },
          { $project: { creator: 0}}
        ])
       
      return NextResponse.json({ response: list }, { status: 200 });
  } catch (error: any) {
    console.log('Error getting financial challenge list:', error);
    return NextResponse.json({ response: 'Failed to get financial challenge list: ' + error }, { status: 500 });
  }
};
