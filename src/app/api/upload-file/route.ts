import { NextRequest, NextResponse } from "next/server";
import { getDownloadUrl, uploadFile } from 'src/lib/firebase/storage';

// request body as form data
export const POST = async (req: NextRequest) => {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    let filename = file.name
    let filename_clean = filename.split(' ').join('_')
    const fileRef = `${Date.now()}_${filename_clean}`;
    console.log(fileRef)
    
    await uploadFile(file, fileRef)
    const downloadUrl = await getDownloadUrl(fileRef)

    return  NextResponse.json({ response: downloadUrl }, { status: 200 });
  } catch (error: any) {
    console.log("ERROR api/uploadFile/route.ts:21 : ", error)
    return NextResponse.json({ response: error.message}, { status: 500 });
  }
};