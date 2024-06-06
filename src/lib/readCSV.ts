import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB, disconnectDB } from "src/config/connectMongoDB";
import User from "src/models/user/model";
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse'

async function readCSV(filePath: string): Promise<any[]> {
    const records = [];
    const parser = fs.createReadStream(filePath).pipe(parse({ columns: true }));
    for await (const record of parser) {
      records.push(record);
    }
    return records;
  }

export const csvToDB = async (filePath: string) => {
    await connectMongoDB();
    try {
      const data = await readCSV(filePath);
      await User.insertMany(data);
      console.log('Data inserted successfully');
    } catch (error) {
      console.error('Error inserting data:', error);
    } finally {
      await disconnectDB();
    }
  }
