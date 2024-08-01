import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "src/config/connectMongoDB";
import { IInvitation } from "src/models/invitation/interface";
import Invitation from "src/models/invitation/model";
import { startSession } from "mongoose";
// IMPORTANT: invitationId here is the invitation's assigned MongoDB ID

/*
    GET: Read one invitation details
    PUT: Update invitation details
    DELETE: Delete invitation
*/

// READ the invitation details
export const GET = async(req: NextRequest, { params }: { params: { invitationId: string } }) => {
    try{
        await connectMongoDB();
        const invitation = await Invitation.findById({ _id: params.invitationId });
        if (!invitation) {
            return NextResponse.json({ response: "Invitation not found" }, { status: 404 });
        }

        return NextResponse.json({ response: invitation }, { status: 200 });
    }
    catch (error: any) {
        return NextResponse.json({ response: error.message }, { status: 500 });
    }
}

// UPDATE invitation details
// Discuss: Do we pass in users and cancelledUsers as "u1;u2", or [u1, u2]?
// Using [u1, u2] currently
export const PUT = async(req: NextRequest, { params }: { params: {invitationId: string} }) => {
    await connectMongoDB();
    const dbSession = await startSession();
    dbSession.startTransaction();
    try {  
        const payload = await req.json() as Partial<IInvitation> //payload = newInvitation
        const invitation = await Invitation.findOne({ _id: params.invitationId });
        if (!invitation) {
          return NextResponse.json({ response: 'Invitation not found' }, { status: 404 });
        }
  
        const updateQuery: any = {};
        Object.keys(payload).forEach(key => {
            updateQuery[`${key}`] = payload[key as keyof IInvitation];
        });

        // Use this code instead if users and cancelledUsers are in "u1;u2" format
        // let usersList = [];
        // let cancelledUsersList = [];
        // if(updateQuery["users"]){
        //     usersList = updateQuery["users"].split(';').map(link => link.trim());
        // }
        // if(updateQuery["cancelledUsers"]){
        //     cancelledUsersList = updateQuery["cancelledUsers"].split(';').map(link => link.trim());
        // }
        // updateQuery["users"] = usersList;
        // updateQuery["cancelledUsers"] = cancelledUsersList;
        
        // Update the invitation
        const updatedInvitation = await Invitation.findOneAndUpdate(
            { _id: params.invitationId },
            { 
                $set: updateQuery
            },
            {
                new: true,
                runValidators: true,
            }
        );
        
        await dbSession.commitTransaction();  // Commit the transaction
        await dbSession.endSession();  // End the session
        return NextResponse.json({ response: updatedInvitation }, { status: 200 });
    } catch (error: any) {
        await dbSession.abortTransaction();  // Abort the transaction
        await dbSession.endSession();  // End the session
        console.log('Error updating user:', error);
        return NextResponse.json({ response: 'Cannot update invitation with id ' + params.invitationId }, { status: 500 });
    }
}

// DELETE invitation
export const DELETE = async(req: NextRequest, { params }: { params: { invitationId: string } }) => {
    const invitationId = params.invitationId;
    await connectMongoDB();
    const dbSession = await startSession();
    dbSession.startTransaction();
    try {
        const query_invitation = await Invitation.findOne({ _id: invitationId });
        if (query_invitation) {
            await Invitation.deleteOne({ _id: invitationId });
            return NextResponse.json(
                { response: "Invitation deleted successfully." },
                { status: 200 }
            );
        } else {
            return NextResponse.json({ response: "No such invitation." }, { status: 400 });
        }
    } catch (error) {
        await dbSession.abortTransaction();  // Abort the transaction
        await dbSession.endSession();  // End the session
        console.log(error);
        return NextResponse.json(
        { response: "Invitation with id " + invitationId + " could not be deleted." },
        { status: 500 }
        );
    }
}