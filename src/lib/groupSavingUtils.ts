import { GroupRole } from "src/models/groupSavingParticipation/interface"
import GroupSavingParticipation from "src/models/groupSavingParticipation/model"
import GroupSaving from "src/models/groupSaving/model"
import Transaction from "src/models/transaction/model"

export async function checkDeletableGroupSaving(groupSavingId) : Promise<boolean> {
  return new Promise(async (resolve, reject) => {
    try {
      const associated = await Transaction.aggregate([
        { $match: { savingGroupId: groupSavingId } },
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

export async function verifyMember(userId, groupSavingId) : Promise<boolean> {
  return new Promise(async (resolve, reject) => {
    try {
      const exist = await GroupSavingParticipation.findOne({ user: userId, groupSaving: groupSavingId})
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
export async function joinGroupSaving(userId, groupSavingId) {
  return new Promise(async (resolve, reject) => {
    try {
      const exist = await verifyMember(userId, groupSavingId)
      if (exist) {
        throw ("This user is already a member of the group saving")
      }

      const groupSaving = await GroupSaving.findById(groupSavingId)
      if (!groupSaving) {
        throw ("Group Saving not found")
      }

      const newParticipation = new GroupSavingParticipation({
        user: userId,
        groupSaving: groupSavingId,
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