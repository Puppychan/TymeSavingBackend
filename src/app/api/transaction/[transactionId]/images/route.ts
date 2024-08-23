import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "src/config/connectMongoDB";
import { verifyAuth } from "src/lib/authentication";
import { uploadFile } from "src/lib/firebase/storage";
import { startSession } from "mongoose";
import Transaction from "src/models/transaction/model";

// PUT: update transaction images
export const PUT = async (req: NextRequest, { params }: { params: { transactionId: string }}) => {
  await connectMongoDB();
  const dbSession = await startSession();
  dbSession.startTransaction();
  try {
      // const verification = await verifyAuth(req.headers)
      // if (verification.status !== 200) {
      //   return NextResponse.json({ response: verification.response }, { status: verification.status });
      // }    
      // const user = verification.response;

      const formData = await req.formData();
      const newImages = formData.getAll("newImage") as File[];
      const oldImages = formData.getAll("oldImage") as string[];

      let imageUrls = oldImages ?? []
      if (newImages) {
          for (let i = 0; i < newImages.length; i++) {
              let filename = newImages[i].name.split(' ').join('_')
              const fileRef = `${Date.now()}_${filename}`;
              let imageUrl = await uploadFile(newImages[i], fileRef)
              imageUrls.push(imageUrl)
          }
        }

      const updated = await Transaction.findOneAndUpdate(
          { _id: params.transactionId },
          { $set: { transactionImages: imageUrls} },
          {
              new: true,
              runValidators: true,
              session: dbSession
          }
      );
      
      await dbSession.commitTransaction();  // Commit the transaction
      await dbSession.endSession();  // End the session
      return NextResponse.json({ response: updated }, { status: 200 });
  } catch (error: any) {
    await dbSession.abortTransaction();  // Abort the transaction
    await dbSession.endSession();  // End the session
    console.log('Error updating transaction images:', error);
    return NextResponse.json({ response: 'Cannot update transaction images: ' + error }, { status: 500 });
  }
};
