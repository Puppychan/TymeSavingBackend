export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "src/config/connectMongoDB";
import { verifyAuth } from "src/lib/authentication";
import GroupSaving from "src/models/groupSaving/model";
import { UserRole } from "src/models/user/interface";

// GET: get group saving list of all users
export const GET = async (req: NextRequest) => {
  try {
      const searchParams = req.nextUrl.searchParams
      const name = searchParams.get('name')
      const from = searchParams.get('fromDate')
      const to = searchParams.get('toDate')
      const sort = searchParams.get('sort') || 'descending' // sort: ascending/descending
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
      list = await GroupSaving.aggregate([
          { $match: query },
          { $sort: { createdDate: (sort === 'ascending') ? 1 : -1 } },
          { $skip: (pageNo - 1) * pageSize },
          { $limit: pageSize }
        ])
       
      return NextResponse.json({ response: list }, { status: 200 });
  } catch (error: any) {
    console.log('Error getting group saving list:', error);
    return NextResponse.json({ response: 'Failed to get group saving list'}, { status: 500 });
  }
};
