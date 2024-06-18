import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "src/config/connectMongoDB";
import Invitation from "src/models/invitation/model";
import {InvitationType} from "src/models/invitation/interface"

/*
    POST: CREATE a new invitation
*/

// Create a code. Then scour the database to make sure that the code is UNIQUE!
const newCode = (length: number) => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}

export const POST = async(req: NextRequest) => {
    try{
        await connectMongoDB();
        const payload = await req.json()
        // Invitation.id will be auto assigned by MongoDB
        // Invitation.code will be generated here
        const length = 6; // Adjust length as needed
        let uniqueCodeFound = false;
        let generatedCode = '';
        // Export all the codes in the document
        const existingInvitations = await Invitation.find({}, 'code').exec();
        const existingCodes = existingInvitations.map(invitation => invitation.code);
        while (!uniqueCodeFound) {
            generatedCode = newCode(length);
            // Check if the code exists in the Invitation collection: NO -> STOP
            if(!existingCodes.includes(generatedCode)){
                uniqueCodeFound = true;
            }
        }
        // Read information from request
        var { description,type,groupId,users,cancelledUsers } = payload;
        let newType = InvitationType.GroupSaving;
        if (type == "SharedBudget"){
            newType = InvitationType.SharedBudget;
        }
        // Parse users and cancelledUsers: from u1;u2;u3 to [u1, u2, u3]
        let usersList = [];
        let cancelledUsersList = [];
        if(users){
            usersList = users.split(';').map(link => link.trim());
        }
        if(cancelledUsers){
            cancelledUsersList = cancelledUsers.split(';').map(link => link.trim());
        }
        const newInvitation = new Invitation({
            code: generatedCode,
            description: description,
            type: newType,
            groupId: groupId,
            users: usersList,
            cancelledUsers: cancelledUsersList
        });
        await newInvitation.save();
        return NextResponse.json({response: newInvitation, status: 200});
    }
    catch (error: any) {
        return NextResponse.json({ response: error.message}, { status: 500 });
    }
}