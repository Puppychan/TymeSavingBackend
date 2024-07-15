import { NextRequest, NextResponse } from "next/server";
import { sendNotificationToDevice } from "src/config/firebase";

export const POST = async (req: NextRequest) => {
  try {
    const payload = await req.json();
    const { token, title, body } = payload;
    if (!token || !title || !body) {
        console.log("Missing token, title, or body", payload);
      return NextResponse.json(
        { response: "Missing token, title, or body" },
        { status: 400 }
      );
    }

    await sendNotificationToDevice(token, title, body);
    return NextResponse.json(
      { response: "Notification sent!" },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json({ response: error.message }, { status: 500 });
  }
};
