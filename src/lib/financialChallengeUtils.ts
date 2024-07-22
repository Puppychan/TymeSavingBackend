
import mongoose, { ObjectId } from "mongoose";
import { IFinancialChallenge } from "src/models/financialChallenge/interface";

export async function verifyMember(userId: ObjectId, financialChallenge: IFinancialChallenge) : Promise<boolean> {
  return new Promise(async (resolve, reject) => {
    try {
      let isMember = financialChallenge.members.includes(userId)
      resolve(isMember)
    }
    catch (error) {
      console.log(error)
      reject(error)
    }
  })
}