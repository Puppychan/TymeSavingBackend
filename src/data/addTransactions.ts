import { csvToDB } from "src/lib/readCSV";

let filePath = 'data/NI Data - Transaction.csv';
csvToDB(filePath, "Transaction");