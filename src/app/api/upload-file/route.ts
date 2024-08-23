import { NextRequest, NextResponse } from "next/server";
import { uploadFile } from 'src/lib/firebase/storage';

// request body as form data
export const POST = async (req: NextRequest) => {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    let filename = file.name.split(' ').join('_')
    const fileRef = `${Date.now()}_${filename}`;

    const downloadUrl = await uploadFile(file, fileRef)

    return  NextResponse.json({ response: downloadUrl }, { status: 200 });
  } catch (error: any) {
    console.log("ERROR api/uploadFile/route.ts:21 : ", error)
    return NextResponse.json({ response: 'Failed to upload file: ' + error}, { status: 500 });
  }
};