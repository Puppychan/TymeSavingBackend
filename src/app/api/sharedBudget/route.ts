import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "src/config/connectMongoDB";
import SharedBudget from "src/models/sharedBudget/model";
import User from "src/models/user/model";

export const POST = async (req: NextRequest) => {
  try {
    await connectMongoDB();
    const payload = await req.json()
    const { hostedBy, name, description, amount , endDate } = payload
    const user = await User.findOne({ _id: hostedBy });
    if (!user) {
      return NextResponse.json({ response: "Host User not found" }, { status: 404 });
    }
    
    // Create a new shared budget document
    const newSharedBudget = new SharedBudget({
      hostedBy: hostedBy,
      name: name,
      description: description,
      amount: amount,
      concurrentAmount: 0,  
      endDate: endDate
    });

    await newSharedBudget.save(); // Save the new shared budget to the database
    return  NextResponse.json({ response: newSharedBudget }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ response: error.message}, { status: 500 });
  }
};
