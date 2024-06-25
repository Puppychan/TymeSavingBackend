import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "src/config/connectMongoDB";
import { verifyAuth } from "src/lib/authentication";
import { ISharedBudget } from "src/models/sharedBudget/interface";
import SharedBudget from "src/models/sharedBudget/model";
import User from "src/models/user/model";

// PUT: edit shared budget information (available only for the Host of the shared budget)
export const PUT = async (req: NextRequest, { params }: { params: { sharedBudgetId: string }}) => {
  try {
      await connectMongoDB();

      const verification = await verifyAuth(req.headers)
      if (verification.status !== 200) {
        return NextResponse.json({ response: verification.response }, { status: verification.status });
      }

      const authUser = verification.response;

      const payload = await req.json() as Partial<ISharedBudget>

      const sharedBudget = await SharedBudget.findById(params.sharedBudgetId)
      if (!sharedBudget) {
        return NextResponse.json({ response: 'Shared Budget not found' }, { status: 404 });
      }

      if (authUser._id !== sharedBudget.hostBy) {
        return NextResponse.json({ response: 'Only the Host can edit this shared budget' }, { status: 401 });
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