import { csvToDB } from "../lib/readCSV";

let filePath = 'data/NI Data - Transaction.csv';
csvToDB(filePath, "Transaction");