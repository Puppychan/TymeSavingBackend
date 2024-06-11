import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB, disconnectDB } from "src/config/connectMongoDB";
import User from "src/models/user/model";
import Transaction from "src/models/transaction/model";
import fs from "fs";
import { parse } from "csv-parse";
import { ObjectId } from "mongodb";
import { hashPassword } from "./authentication";
import dotenv from "dotenv";

dotenv.config();

async function readCSV(filePath: string): Promise<any[]> {
  const records = [];
  const parser = fs.createReadStream(filePath).pipe(parse({ columns: true }));
  for await (const record of parser) {
    records.push(record);
  }
  return records;
}

export const csvToDB = async (filePath: string, collection: string) => {
  await connectMongoDB();
  try {
    const data = await readCSV(filePath);
    if (collection === "User") {
      // await User.insertMany(data);
      for (const user of data) {
        // extract
        const { _id, username, password, ...rest } = user;
        // hashing password
        const hashPw = await hashPassword(password);
        // update or add if not exist
        await User.updateOne(
          { username: username },
          {
            $setOnInsert: {
              _id: ObjectId.createFromHexString(_id),
              username,
              password: hashPw,
              ...rest,
            },
          },
          { upsert: true }
        );
      }
      console.log("Data inserted successfully");
    } else if (collection === "Transaction") {
      // await Transaction.insertMany(data);
      for (const transaction of data) {
        // extract
        const { _id, ...rest } = transaction;
        await Transaction.updateOne(
          { _id: _id },
          { $setOnInsert: {
            _id: ObjectId.createFromHexString(_id),
            ...rest,
          } },
          { upsert: true }
        );
      }
      console.log("Data inserted successfully");
    }
  } catch (error) {
    console.error("Error inserting data:", error);
    throw error;
  } finally {
    await disconnectDB();
  }
};
