import { readCSV } from "src/lib/readCSV";
import { connectMongoDB, disconnectDB } from "src/config/connectMongoDB";
import Transaction from "src/models/transaction/model";
import { hashPassword } from "src/lib/authentication";

export const addTransactions = async () => {
    await connectMongoDB();
    const filePath = 'data/NI Data - Transaction.csv';
    try {
        const data = await readCSV(filePath);
        await Transaction.insertMany(data);
        console.log('Transactions inserted successfully');
    } catch (error){
        console.log("Transactions read error: " + error)
    }
}

addTransactions();