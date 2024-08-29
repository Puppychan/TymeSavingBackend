import { NextRequest, NextResponse } from "next/server";
import UserInvitation from "src/models/userInvitation/model";
import Invitation from "src/models/invitation/model";
import User from "src/models/user/model"
import mongoose from "mongoose";
import { connectMongoDB } from "src/config/connectMongoDB";
import { invitationData } from "src/lib/invitationUtils";

/* 
    Sort: 
        sortGroupId
        sortGroupType
        sortStatus
    Match: 
        getUserFullName
        getGroupId
        getGroupType
        getCode
        getStatus  : Accepted, Cancelled, Pending
    Handle user:
        User: fromUser
*/

export const GET = async (req: NextRequest,{ params }: { params: { userId: string } }) => {
    try {
        await connectMongoDB();
        const userId = params.userId;
        let urlSearchParams = req.nextUrl.searchParams;
        let vnpParams: { [key: string]: string } = {};
        urlSearchParams.forEach((value, key) => {
            vnpParams[key] = value;
        });
        const result = await invitationData(userId, vnpParams);
        return NextResponse.json({ response: result.response }, { status: result.status });
    } catch (error) {
        console.log(error);
        return NextResponse.json({ response: error }, { status: 500 });
    }
}