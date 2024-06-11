import { csvToDB } from "../lib/readCSV";

let filePath = 'data/NI Data - User.csv';
csvToDB(filePath, "User");