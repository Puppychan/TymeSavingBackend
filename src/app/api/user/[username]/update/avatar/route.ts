import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "src/config/connectMongoDB";
import { verifyUser } from "src/lib/authentication";
import { uploadFile } from "src/lib/firebase/storage";
import User from "src/models/user/model";
import { startSession } from "mongoose";

// PUT: update user avatar
export const PUT = async (req: NextRequest, { params }: { params: { username: string }}) => {
  await connectMongoDB();
  const dbSession = await startSession();
  dbSession.startTransaction();
  try {
      const formData = await req.formData();
      const file = formData.get("file") as File;

      const verification = await verifyUser(req.headers, params.username)
      if (verification.status !== 200) {
        return NextResponse.json({ response: verification.response }, { status: verification.status });
      }

      const user = await User.findOne({ 'username': params.username });
      if (!user) {
        return NextResponse.json({ response: 'User not found' }, { status: 404 });
      }

      let avatarUrl = null
      if (file) {
        let filename = file.name.split(' ').join('_')
        const fileRef = `${Date.now()}_${filename}`;
        avatarUrl = await uploadFile(file, fileRef)
      }

      const updatedUser = await User.findOneAndUpdate(
          { username: params.username },
          { $set: { avatar: avatarUrl} },
          {
              new: true,
              runValidators: true,
          }
      );
      console.log('updatedUser:', updatedUser);
      let returnUser = updatedUser.toObject();
      delete returnUser.password;
      delete returnUser.pin;
      
      await dbSession.commitTransaction();  // Commit the transaction
      await dbSession.endSession();  // End the session
      return NextResponse.json({ response: returnUser }, { status: 200 });
  } catch (error: any) {
    await dbSession.abortTransaction();  // Abort the transaction
    await dbSession.endSession();  // End the session
    console.log('Error updating user avatar:', error);
    return NextResponse.json({ response: 'Cannot update user avatar: ' + error.message }, { status: 500 });
  }
};
