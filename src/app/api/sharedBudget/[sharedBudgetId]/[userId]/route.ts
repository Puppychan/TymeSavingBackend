import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "src/config/connectMongoDB";
import { ISharedBudget } from "src/models/sharedBudget/interface";
import SharedBudget from "src/models/sharedBudget/model";
import User from "src/models/user/model";

// PUT: update shared budget information (available only for Host User of the shared budget)
export const PUT = async (req: NextRequest, { params }: { params: { sharedBudgetId: string, userId: string }}) => {
  try {
      await connectMongoDB();
      const payload = await req.json() as Partial<ISharedBudget>

      const sharedBudget = await SharedBudget.findById(params.sharedBudgetId)
      if (!sharedBudget) {
        return NextResponse.json({ response: 'Shared Budget not found' }, { status: 404 });
      }

      if (sharedBudget.hostBy !== params.userId) {
        return NextResponse.json({ response: 'Only Host User can edit the shared budget' }, { status: 401 });
      }

      const user = await User.findOne({ '_id': params.userId });
      if (!user) {
        return NextResponse.json({ response: 'Host User not found' }, { status: 404 });
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
    console.log('Error updating user:', error);
    return NextResponse.json({ response: 'Cannot update shared budget'}, { status: 500 });
  }
};
