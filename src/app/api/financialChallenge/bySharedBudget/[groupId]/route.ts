import { ObjectId } from "mongodb";
import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "src/config/connectMongoDB";
import { verifyAuth } from "src/lib/authentication";
import FinancialChallenge from "src/models/financialChallenge/model";
import mongoose from "mongoose";

// GET: get financial challenge list of a SharedBudget
export const GET = async (req: NextRequest, { params }: { params: { groupId: string }}) => {
  try {
      const searchParams = req.nextUrl.searchParams
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

      let filter = []
      if (name) {
        filter.push({$or: [
          { "name":{ $regex:'.*' + name + '.*', $options: 'i' } },
          { "creator.fullname": { $regex:'.*' + name + '.*', $options: 'i' } }
        ]});
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
      if(sortCreatedDate === 'ascending' || sortCreatedDate === 'descending'){
        sort['createdDate'] = sortCreatedDate === 'ascending' ? 1:-1;
      }
      if(sortName === 'ascending' || sortName === 'descending'){
        sort['name'] = sortName === 'ascending' ? 1:-1;
      }
      if(!sortName && !sortCreatedDate){
        sort['name'] = 1; //default option
      }

      let list = []
      list = await FinancialChallenge.aggregate([
          { $match: { 
            budgetGroupId: new mongoose.Types.ObjectId(params.groupId),
            $or:[
              // Only challenges published by its creator are shown
              { isPublished: true }, 
              // Unpublished challenges by the current user
              { isPublished: false, createdBy: new mongoose.Types.ObjectId(verification.response._id)}
            ]
           } 
          },
          { $match: query },
          { $lookup: {
            from: 'users', // Collection to join with
            localField: 'createdBy', // Field from FinancialChallenge
            foreignField: '_id', // Field from User
            as: 'creator', // Output field name
            pipeline: [
              { $project: { _id: 1, fullname: 1 } } // Only fetch the fullname field and _id
            ]
            }
          },
          { $unwind: '$creator'},
          { $addFields: {
            createdByFullName: '$creator.fullname', // Show the fullname instead of user ID
            createdBy: '$creator._id',
            totalCheckPointCount: { $size: '$checkpoints' } // Count the number of checkpoints
            }
          },
          { $sort: sort },
          // { $skip: (pageNo - 1) * pageSize },
          // { $limit: pageSize },
          { $project: { creator: 0}},
        ])
       
      return NextResponse.json({ response: list }, { status: 200 });
  } catch (error: any) {
    console.log('Error getting financial challenge list:', error);
    return NextResponse.json({ response: 'Failed to get financial challenge list: ' + error }, { status: 500 });
  }
};
