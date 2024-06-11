import fs from 'fs';
import { parse } from 'csv-parse'

export const readCSV = async (filePath: string) => {
  const records = [];
  const parser = fs.createReadStream(filePath).pipe(parse({ columns: true }));
  for await (const record of parser) {
    records.push(record);
  }
  return records;
}