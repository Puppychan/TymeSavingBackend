import { readCSV } from "src/lib/readCSV";
import { connectMongoDB, disconnectDB } from "src/config/connectMongoDB";
import UserInvitation from "src/models/userInvitation/model";
import { UserInvitationStatus } from "src/models/userInvitation/interface";

export const addUserInvitations = async () => {
    await connectMongoDB();
    const filePath = 'data/NI Data - UserInvitation.csv';
    try {
        var data = await readCSV(filePath);
        await UserInvitation.insertMany(data);
        console.log('UserInvitations inserted successfully');
    } catch (error){
        console.log("UserInvitations read error: " + error)
    }
}

addUserInvitations();