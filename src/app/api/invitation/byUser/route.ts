import { NextRequest, NextResponse } from "next/server";
import UserInvitation from "src/models/userInvitation/model";
import User from "src/models/user/model"
import mongoose from "mongoose";
import { connectMongoDB } from "src/config/connectMongoDB";

// Params: userId
// Return the list of invitations that the user has accepted and cancelled
// Use UserInvitation instead of Invitations
export const GET = async (req: NextRequest) => {
    try {
        await connectMongoDB();
        let urlSearchParams = req.nextUrl.searchParams;
        let vnpParams: { [key: string]: string } = {};
        urlSearchParams.forEach((value, key) => {
            vnpParams[key] = value;
        });
        try{
            if(vnpParams["username"]){
                const userId = await User.findOne({username: vnpParams["username"]});
                if (userId){
                    const pending = await UserInvitation.find({ userId: userId, status: "Pending"});
                    const accepted = await UserInvitation.find({ userId: userId, status: "Accepted" });
                    const cancelled = await UserInvitation.find({ userId: userId, status: "Cancelled" });
                    return NextResponse.json({ response: 
                        {"Pending": pending,"Accepted": accepted, "Cancelled": cancelled}
                    }, { status: 200 });
                }
                else{
                    return NextResponse.json({ response: "No such user with this username"}, {status: 404});
                }
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