'use client'
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "src/config/connectMongoDB";
import SharedBudgetParticipation from "src/models/sharedBudgetParticipation/model";
import User from "src/models/user/model";

// GET: get shared budget list of a user
export const GET = async (req: NextRequest, { params }: { params: { userId: string }}) => {
  try {
      const searchParams = req.nextUrl.searchParams
      const name = searchParams.get('name')

      await connectMongoDB();

      const user = await User.findOne({ _id: params.userId });
      if (!user) {
        return NextResponse.json({ response: 'User not found' }, { status: 404 });
      }

      let list = []
      if (!name) {
        list = await SharedBudgetParticipation
                    .find({ user: params.userId }, {_id: 0, user: 0})
                    .populate('sharedBudget')
      }
      else {
        list = await SharedBudgetParticipation.aggregate([
          { $match: { user: params.userId } },
          { $lookup: {from: 'sharedbudgets', localField: 'sharedBudget', foreignField: '_id', as: 'sharedBudget_docs'} },
          { $match: {
              $or: [
                  {"sharedBudget_docs.name":{ $regex:'.*' + name + '.*', $options: 'i' } },
              ]
            }
          },

        ])
      }
       

      return NextResponse.json({ response: list }, { status: 200 });
  } catch (error: any) {
    console.log('Error getting shared budget list:', error);
    return NextResponse.json({ response: 'Failed to get shared budget list'}, { status: 500 });
  }
};
