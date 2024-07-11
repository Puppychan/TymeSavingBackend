import { ObjectId } from "mongodb";
import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "src/config/connectMongoDB";
import SharedBudget from "src/models/sharedBudget/model";
import SharedBudgetParticipation from "src/models/sharedBudgetParticipation/model";
import User from "src/models/user/model";

// GET: Show basic information about this SharedBudget. Used by users before joining.
export const GET = async (req: NextRequest, { params }: { params: { sharedBudgetId: string }}) => {
  try {
    await connectMongoDB();      
    const sharedBudget = await SharedBudget.findById(params.sharedBudgetId)
    if (!sharedBudget) {
        return NextResponse.json({ response: 'Shared Budget not found' }, { status: 404 });
    }
    // show name, description, username of hostedBy, createdDate, number of participants
    const memberCount = await SharedBudgetParticipation.countDocuments({ sharedBudget: params.sharedBudgetId, role: 'Member' });
    const hostedByUser = await User.findById(new ObjectId(sharedBudget.hostedBy));
    if(!hostedByUser){
        console.log('Error with Shared Budget: Host not found', sharedBudget.hostedBy);
        return NextResponse.json({ response: 'Error with Shared Budget: Host not found' }, { status: 500 });
    }
    const result = {
        name: sharedBudget.name,
        description: sharedBudget.description,
        hostUsername: hostedByUser.username,
        memberCount: memberCount,
        createdDate: sharedBudget.createdDate
    };
      return NextResponse.json({ response: result }, { status: 200 });
  } catch (error: any) {
    console.log('Error getting member list:', error);
    return NextResponse.json({ response: 'Failed to get member list'}, { status: 500 });
  }
};

