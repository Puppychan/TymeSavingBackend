import { readCSV } from "src/lib/readCSV";
import { connectMongoDB, disconnectDB } from "src/config/connectMongoDB";
import User from "src/models/user/model";
import { hashPassword } from "src/lib/authentication";

export const addUsers = async () => {
    await connectMongoDB();
    const filePath = 'data/NI Data - User.csv';
    try {
        const data = await readCSV(filePath);
        const hashedData = await Promise.all(data.map(async (user) => {
            if (user.password) {
                user.password = await hashPassword(user.password);
            }
            return user;
        }));
        await User.insertMany(hashedData);
        console.log('Users inserted successfully');
    } catch (error){
        console.log("Users read error: " + error)
    }
}

addUsers();