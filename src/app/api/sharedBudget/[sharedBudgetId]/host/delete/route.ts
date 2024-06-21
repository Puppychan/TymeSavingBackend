'use client'
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "src/config/connectMongoDB";
import SharedBudget from "src/models/sharedBudget/model";
import User from "src/models/user/model";

// DELETE: delete a shared budget (available only for the Host of the shared budget)
export const DELETE = async (req: NextRequest, { params }: { params: { sharedBudgetId: string }}) => {
  try {
      const searchParams = req.nextUrl.searchParams
      const userId = searchParams.get('userId')

      await connectMongoDB();

      const sharedBudget = await SharedBudget.findById(params.sharedBudgetId)
      if (!sharedBudget) {
        return NextResponse.json({ response: 'Shared Budget not found' }, { status: 404 });
      }

      if (sharedBudget.hostBy !== userId) {
        return NextResponse.json({ response: 'Only the Host can delete this shared budget' }, { status: 401 });
      }

      const user = await User.findOne({ _id: userId });
      if (!user) {
        return NextResponse.json({ response: 'User not found' }, { status: 404 });
      }

      const deleted = await SharedBudget.findOneAndDelete({ _id: params.sharedBudgetId})

      return NextResponse.json({ response: 'Deleted successfully' }, { status: 200 });
  } catch (error: any) {
    console.log('Error deleting shared budget:', error);
    return NextResponse.json({ response: 'Failed to delete shared budget'}, { status: 500 });
  }
};
