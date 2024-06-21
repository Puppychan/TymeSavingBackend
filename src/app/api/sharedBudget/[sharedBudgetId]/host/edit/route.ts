'use client'
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "src/config/connectMongoDB";
import { ISharedBudget } from "src/models/sharedBudget/interface";
import SharedBudget from "src/models/sharedBudget/model";
import User from "src/models/user/model";

// PUT: edit shared budget information (available only for the Host of the shared budget)
export const PUT = async (req: NextRequest, { params }: { params: { sharedBudgetId: string }}) => {
  try {
      const searchParams = req.nextUrl.searchParams
      const userId = searchParams.get('userId')

      await connectMongoDB();
      const payload = await req.json() as Partial<ISharedBudget>

      const sharedBudget = await SharedBudget.findById(params.sharedBudgetId)
      if (!sharedBudget) {
        return NextResponse.json({ response: 'Shared Budget not found' }, { status: 404 });
      }

      if (sharedBudget.hostBy !== userId) {
        return NextResponse.json({ response: 'Only the Host can edit this shared budget' }, { status: 401 });
      }

      const user = await User.findOne({ _id: userId });
      if (!user) {
        return NextResponse.json({ response: 'User not found' }, { status: 404 });
      }

      const updateQuery: any = {};
      Object.keys(payload).forEach(key => {
          updateQuery[`${key}`] = payload[key as keyof ISharedBudget];
      });

      const updatedSharedBudget = await SharedBudget.findOneAndUpdate(
          { _id: params.sharedBudgetId },
          { $set: updateQuery },
          {
              new: true,
              runValidators: true,
          }
      );

      return NextResponse.json({ response: updatedSharedBudget }, { status: 200 });
  } catch (error: any) {
    console.log('Error updating shared budget:', error);
    return NextResponse.json({ response: 'Failed to update shared budget'}, { status: 500 });
  }
};