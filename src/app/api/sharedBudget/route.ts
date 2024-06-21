'use client'
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "src/config/connectMongoDB";
import SharedBudget from "src/models/sharedBudget/model";
import SharedBudgetParticipation from "src/models/sharedBudgetParticipation/model";
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

    const newParticipation = new SharedBudgetParticipation({
      user: user._id,
      sharedBudget: newSharedBudget._id,
      isHost: true
    })

    await newParticipation.save()

    return  NextResponse.json({ response: newSharedBudget }, { status: 200 });
  } catch (error: any) {
    console.log(error)
    return NextResponse.json({ response: 'Failed to create shared budget'}, { status: 500 });
  }
};