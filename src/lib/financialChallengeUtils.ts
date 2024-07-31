
import { ObjectId } from "mongoose";
import FinancialChallenge from "src/models/financialChallenge/model";

export async function verifyMember(userId: ObjectId, challengeId: string) : Promise<boolean> {
  return new Promise(async (resolve, reject) => {
    try {
      let isMember = await FinancialChallenge.find({ _id: challengeId, members: {$in : [userId]} })
      if (isMember) {
        return resolve(true)
      }
      resolve(false)
    }
    catch (error) {
      console.log(error)
      reject(error)
    }
  })
}