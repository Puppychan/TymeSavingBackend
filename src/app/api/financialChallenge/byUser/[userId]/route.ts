import { ObjectId } from "mongodb";
import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "src/config/connectMongoDB";
import { verifyAuth } from "src/lib/authentication";
import FinancialChallenge from "src/models/financialChallenge/model";
import { localDate } from "src/lib/datetime";

// GET: get financial challenge list of a user
export const GET = async (req: NextRequest, { params }: { params: { userId: string }}) => {
  try {
    const searchParams = req.nextUrl.searchParams;
    const name = searchParams.get('name');
    const from = searchParams.get('fromDate');
    const to = searchParams.get('toDate');
    const sortCreatedDate = searchParams.get('sortCreatedDate'); // ascending/descending
    const sortName = searchParams.get('sortName'); // ascending/descending
    const pageNo = searchParams.get('pageNo') ? parseInt(searchParams.get('pageNo')) : 1;
    const pageSize = searchParams.get('pageSize') ? parseInt(searchParams.get('pageSize')) : 10;

    await connectMongoDB();

    const verification = await verifyAuth(req.headers, params.userId);
    if (verification.status !== 200) {
      return NextResponse.json({ response: verification.response }, { status: verification.status });
    }

    let filter = [];
    if (name) {
      filter.push({ "name":{ $regex:'.*' + name + '.*', $options: 'i' } });
    }

    if (from || to ) {
      let dateFilter : any = {};
      if (from) dateFilter['$gte'] = new Date(from);
      if (to) dateFilter['$lte'] = new Date(to);
      filter.push({ "createdDate": dateFilter });
    }

    let query = {};
    if (filter.length > 0) query['$and'] = filter;

    let sort = {};
    if (sortCreatedDate === 'ascending' || sortCreatedDate === 'descending') {
      sort['createdDate'] = sortCreatedDate === 'ascending' ? 1 : -1;
    }
    if (sortName === 'ascending' || sortName === 'descending') {
      sort['name'] = sortName === 'ascending' ? 1 : -1;
    }
    if (!sortName && !sortCreatedDate) {
      sort['name'] = 1; //default option
    }

    // Show unpublished challenges by this user as well
    let list = await FinancialChallenge.aggregate([
      {
        $match: {
          members: { $in: [new ObjectId(params.userId)] },
          $or: [
            { isPublished: true }, // Only challenges published by its creator are shown
            { // Unpublished challenges by this user
              isPublished: false,
              createdBy: new ObjectId(params.userId)
            }
          ]
        }
      },
      { $match: query },
      {
        $lookup: {
          from: 'users', // Collection to join with
          localField: 'createdBy', // Field from FinancialChallenge
          foreignField: '_id', // Field from User
          as: 'creator', // Output field name
          pipeline: [
            { $project: { _id: 0, fullname: 1 } } // Only fetch the fullname field
          ]
        }
      },
      { $unwind: '$creator' },
      {
        $lookup: {
          from: 'groupsavings',
          localField: 'savingGroupId',
          foreignField: '_id',
          as: 'groupSaving'
        }
      },
      {
        $lookup: {
          from: 'sharedbudgets',
          localField: 'budgetGroupId',
          foreignField: '_id',
          as: 'sharedBudget'
        }
      },
      {
        $addFields: {
          groupExists: {
            $cond: {
              if: {
                $or: [
                  {
                    $and: [
                      { $gt: [{ $size: "$groupSaving" }, 0] }, // Group saving exists
                      { $gt: [{ $arrayElemAt: ["$groupSaving.endDate", 0] }, localDate(new Date())] }, // Group saving has not ended
                      { $eq: [{ $arrayElemAt: ["$groupSaving.isClosed", 0] }, false] } // Group saving is not closed
                    ]
                  },
                  {
                    $and: [
                      { $gt: [{ $size: "$sharedBudget" }, 0] }, // Shared budget exists
                      { $gt: [{ $arrayElemAt: ["$sharedBudget.endDate", 0] }, localDate(new Date())] }, // Shared budget has not ended
                      { $eq: [{ $arrayElemAt: ["$sharedBudget.isClosed", 0] }, false] } // Shared budget is not closed
                    ]
                  }
                ]
              },
              then: true,
              else: false
            }
          }
        }
      },
      {
        $match: {
          groupExists: true // Only include challenges where the group exists
        }
      },
      {
        $addFields: {
          createdBy: '$creator.fullname', // Show the fullname instead of user ID
          totalCheckPointCount: { $size: '$checkpoints' } // Count the number of checkpoints
        }
      },
      { $sort: sort },
      { $skip: (pageNo - 1) * pageSize },
      { $limit: pageSize },
      { $project: { creator: 0, groupSaving: 0, sharedBudget: 0, groupExists: 0 } }
    ]);

    return NextResponse.json({ response: list }, { status: 200 });
  } catch (error: any) {
    console.log('Error getting financial challenge list:', error);
    return NextResponse.json({ response: 'Failed to get financial challenge list: ' + error }, { status: 500 });
  }
};

