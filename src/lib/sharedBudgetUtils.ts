import SharedBudget from "src/models/sharedBudget/model"
import { GroupRole } from "src/models/sharedBudgetParticipation/interface"
import SharedBudgetParticipation from "src/models/sharedBudgetParticipation/model"
import Transaction from "src/models/transaction/model"

export async function checkDeletableSharedBudget(sharedBudgetId) : Promise<boolean> {
  return new Promise(async (resolve, reject) => {
    try {
      const associated = await Transaction.aggregate([
        { $match: { budgetGroupId: sharedBudgetId } },
      ])
      
      if (associated.length >= 0) resolve(false)
      resolve(true)
    }
    catch (error) {
      console.log(error)
      reject(error)
    }
  })
}

export async function verifyMember(userId, sharedBudgetId) : Promise<boolean> {
  return new Promise(async (resolve, reject) => {
    try {
      const exist = await SharedBudgetParticipation.findOne({ user: userId, sharedBudget: sharedBudgetId})
      if (!exist) resolve(false)
      resolve(true)
    }
    catch (error) {
      console.log(error)
      reject(error)
    }
  })
}

// Pre-requisite: userId exists
export async function joinSharedBudget(userId, sharedBudgetId) {
  return new Promise(async (resolve, reject) => {
    try {
      const exist = await verifyMember(userId, sharedBudgetId)
      if (exist) {
        throw ("This user is already a member of the shared budget")
      }

      const sharedBudget = await SharedBudget.findById(sharedBudgetId)
      if (!sharedBudget) {
        throw ("Shared Budget not found")
      }

      const newParticipation = new SharedBudgetParticipation({
        user: userId,
        sharedBudget: sharedBudgetId,
        role: GroupRole.Member,
      })
  
      await newParticipation.save()
      resolve(newParticipation)
    }
    catch (error) {
      console.log(error)
      reject(error)
    }
  })
}