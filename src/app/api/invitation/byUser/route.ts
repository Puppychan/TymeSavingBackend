export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import Invitation from "src/models/invitation/model";
import mongoose from "mongoose";

// Params: userId
// Return the list of invitations that the user has accepted and cancelled
// Use UserInvitation instead of Invitations
export const GET = async (req: NextRequest) => {
    try {
        let urlSearchParams = req.nextUrl.searchParams;
        let vnpParams: { [key: string]: string } = {};
        urlSearchParams.forEach((value, key) => {
            vnpParams[key] = value;
        });
        try{
            if(vnpParams["userId"]){
                const userId = vnpParams["userId"];
                const accepted = await Invitation.find({ users: {$elemMatch: userId} });
                const cancelled = await Invitation.find({ cancelledUsers: {$elemMatch: userId} });
            
                return NextResponse.json({ response: 
                    {"Accepted": accepted, "Cancelled": cancelled}
                }, { status: 200 });
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