import { readCSV } from "src/lib/readCSV";
import { connectMongoDB, disconnectDB } from "src/config/connectMongoDB";
import Invitation from "src/models/invitation/model";
import mongoose from "mongoose";

export const addInvitations = async () => {
    await connectMongoDB();
    const filePath = 'data/NI Data - Invitation.csv';
    try {
        let data = await readCSV(filePath);
        data = data.map(invitation => {
            if (invitation.users) {
                invitation.users = invitation.users.split(';').map(link => link.trim());
            }
            if (invitation.cancelledUsers) {
                invitation.cancelledUsers = invitation.cancelledUsers.split(';').map(link => link.trim());
            }
            return invitation;
        });
        await Invitation.insertMany(data);
        console.log('Invitations inserted successfully');
    } catch (error){
        console.log("Invitations read error: " + error)
    }
}

addInvitations();