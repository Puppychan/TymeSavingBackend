'use client'
export const dynamic = 'force-dynamic';
import { useSearchParams } from "next/navigation";
import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "src/config/connectMongoDB";
import { ISharedBudget } from "src/models/sharedBudget/interface";
import SharedBudget from "src/models/sharedBudget/model";
import SharedBudgetParticipation from "src/models/sharedBudgetParticipation/model";
import { UserRole } from "src/models/user/interface";
import User from "src/models/user/model";

export async function verifyMember(userId, sharedBudgetId) : Promise<boolean> {
  return new Promise(async (resolve, reject) => {
    try {
      const exist = await SharedBudgetParticipation.findOne({ user: userId, sharedBudget: sharedBudgetId})
      if (!exist) resolve(false)
      resolve(true)
    }
    catch (error) {
      console.log(error)
      reject(error)
    }
  })

}

// GET: get shared budget information
export const GET = async (req: NextRequest, { params }: { params: { sharedBudgetId: string }}) => {
  try {
      const searchParams = useSearchParams()
      const userId = searchParams.get('userId')

      await connectMongoDB();

      const user = await User.findOne({ _id: userId });
      if (!user) {
        return NextResponse.json({ response: 'User not found' }, { status: 404 });
      }

      if (user.role !== UserRole.Admin) {
        const isMember = await verifyMember(userId, params.sharedBudgetId)
        if (!isMember)
          return NextResponse.json({ response: 'This user is not a member of the shared budget' }, { status: 401 });
      }
      
      const sharedBudget = await SharedBudget.findById(params.sharedBudgetId)
      if (!sharedBudget) {
        return NextResponse.json({ response: 'Shared Budget not found' }, { status: 404 });
      }

      return NextResponse.json({ response: sharedBudget }, { status: 200 });
  } catch (error: any) {
    console.log('Error updating user:', error);
    return NextResponse.json({ response: 'Failed to get shared budget'}, { status: 500 });
  }
};

// PUT: update shared budget information (available only for the Host of the shared budget)
export const PUT = async (req: NextRequest, { params }: { params: { sharedBudgetId: string }}) => {
  try {
      const searchParams = useSearchParams()
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
    console.log('Error updating user:', error);
    return NextResponse.json({ response: 'Failed to update shared budget'}, { status: 500 });
  }
};


// DELETE: delete a shared budget (available only for the Host of the shared budget)
export const DELETE = async (req: NextRequest, { params }: { params: { sharedBudgetId: string }}) => {
  try {
      const searchParams = useSearchParams()
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
