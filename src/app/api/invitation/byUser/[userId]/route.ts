import { NextRequest, NextResponse } from "next/server";
import UserInvitation from "src/models/userInvitation/model";
import Invitation from "src/models/invitation/model";
import User from "src/models/user/model"
import mongoose from "mongoose";
import { connectMongoDB } from "src/config/connectMongoDB";

// Params: userId
// Return the list of invitations that the user has accepted and cancelled
// Use UserInvitation instead of Invitations

export const GET = async (req: NextRequest,{ params }: { params: { userId: string } }) => {
    try {
        await connectMongoDB();
        const userId = params.userId;
        let urlSearchParams = req.nextUrl.searchParams;
        let vnpParams: { [key: string]: string } = {};
        urlSearchParams.forEach((value, key) => {
            vnpParams[key] = value;
        });
        try{
            // No params -> Default: Show pending+accepted+cancelled invitations
            if(urlSearchParams.size == 0){

            }
        } catch (error) {
            console.log("Inner try: " + error);
            return NextResponse.json({ response: "Inner try: " + error }, { status: 500 });
        }
    } catch (error) {
        console.log("Outer try: " +error);
        return NextResponse.json({ response: "Outer try: " + error }, { status: 500 });
    }
}