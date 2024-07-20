import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "src/config/connectMongoDB";
import { verifyAuth } from "src/lib/authentication";
import { IGroupSaving } from "src/models/groupSaving/interface";
import GroupSaving from "src/models/groupSaving/model";

// PUT: edit challenge information (available only for the Host)
export const PUT = async (req: NextRequest, { params }: { params: { challengeId: string }}) => {
  try {
      await connectMongoDB();

      const verification = await verifyAuth(req.headers)
      if (verification.status !== 200) {
        return NextResponse.json({ response: verification.response }, { status: verification.status });
      }

      const authUser = verification.response;

      const payload = await req.json() as Partial<IGroupSaving>

      const challenge = await GroupSaving.findById(params.challengeId)
      if (!challenge) {
        return NextResponse.json({ response: 'Group Saving not found' }, { status: 404 });
      }

      const updateQuery: any = {};
      Object.keys(payload).forEach(key => {
          updateQuery[`${key}`] = payload[key as keyof IGroupSaving];
      });

      const updated = await GroupSaving.findOneAndUpdate(
          { _id: params.challengeId },
          { $set: updateQuery },
          {
              new: true,
              runValidators: true,
          }
      );

      return NextResponse.json({ response: updated }, { status: 200 });
  } catch (error: any) {
    console.log('Error updating financial challenge info:', error);
    return NextResponse.json({ response: 'Failed to update financial challenge info'}, { status: 500 });
  }
};