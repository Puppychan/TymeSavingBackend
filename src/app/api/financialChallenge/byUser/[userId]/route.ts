import { ObjectId } from "mongodb";
import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "src/config/connectMongoDB";
import { verifyAuth } from "src/lib/authentication";
import FinancialChallenge from "src/models/financialChallenge/model";

// GET: get financial challenge list of a user
export const GET = async (req: NextRequest, { params }: { params: { userId: string }}) => {
  try {
      const searchParams = req.nextUrl.searchParams
      const name = searchParams.get('name')
      const from = searchParams.get('fromDate')
      const to = searchParams.get('toDate')
      const sort = searchParams.get('sort') || 'descending' // sort: ascending/descending
      const pageNo = searchParams.get('pageNo') ? parseInt(searchParams.get('pageNo')) : 1
      const pageSize = searchParams.get('pageSize') ? parseInt(searchParams.get('pageSize')) : 10

      await connectMongoDB();

      const verification = await verifyAuth(req.headers, params.userId)
      if (verification.status !== 200) {
        return NextResponse.json({ response: verification.response }, { status: verification.status });
      }

      let filter = []
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

      let list = []
      list = await FinancialChallenge.aggregate([
          { $match: { members: { $in: [new ObjectId(params.userId)]} } },
          { $match: query },
          { $sort: { joinedDate: (sort === 'ascending') ? 1 : -1 } },
          { $skip: (pageNo - 1) * pageSize },
          { $limit: pageSize }
        ])
       
      return NextResponse.json({ response: list }, { status: 200 });
  } catch (error: any) {
    console.log('Error getting financial challenge list:', error);
    return NextResponse.json({ response: 'Failed to get financial challenge list: ' + error }, { status: 500 });
  }
};
