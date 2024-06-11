import { csvToDB } from "src/lib/readCSV";

let filePath = 'data/NI Data - User.csv';
csvToDB(filePath, "User");