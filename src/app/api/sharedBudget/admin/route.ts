// 'use client'
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "src/config/connectMongoDB";
import { verifyAuth } from "src/lib/authentication";
import SharedBudget from "src/models/sharedBudget/model";
import { UserRole } from "src/models/user/interface";

// GET: get shared budget list of all users
export const GET = async (req: NextRequest) => {
  try {
      const searchParams = req.nextUrl.searchParams
      const name = searchParams.get('name')
      const from = searchParams.get('fromDate')
      const to = searchParams.get('toDate')
      const sort = searchParams.get('sort') || 'descending' // sort: ascending/descending

      await connectMongoDB();

      const verification = await verifyAuth(req.headers)
      if (verification.status !== 200) {
        return NextResponse.json({ response: verification.response }, { status: verification.status });
      }

      const authUser = verification.response;
      console.log(authUser)

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
      list = await SharedBudget.aggregate([
          { $match: query },
          { $sort: { joinedDate: (sort === 'ascending') ? 1 : -1 } },
        ])
       
      return NextResponse.json({ response: list }, { status: 200 });
  } catch (error: any) {
    console.log('Error getting shared budget list:', error);
    return NextResponse.json({ response: 'Failed to get shared budget list'}, { status: 500 });
  }
};
