import { GroupRole, IGroupSavingParticipation } from "src/models/groupSavingParticipation/interface"
import GroupSavingParticipation from "src/models/groupSavingParticipation/model"
import GroupSaving from "src/models/groupSaving/model"
import Transaction from "src/models/transaction/model"
import { TransactionType } from "src/models/transaction/interface"
import { ObjectId } from "mongoose"

export async function checkDeletableGroupSaving(groupSavingId) : Promise<boolean> {
  return new Promise(async (resolve, reject) => {
    try {
      const associated = await Transaction.aggregate([
        { $match: { savingGroupId: groupSavingId } },
      ])
      
      if (associated.length > 0) resolve(false)
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

export async function changeSavingGroupBalance(transactionId) {
  return new Promise(async (resolve, reject) => {
    try {
      const transaction = await Transaction.findById(transactionId)
      if (!transaction) {
        throw ("Transaction not found")
      }

      if (transaction.type !== TransactionType.Income) {
        throw ("Transaction to a Group Saving must have type Income")
      }
      const group = await GroupSaving.findById(transaction.savingGroupId)
      if (!group) {
        throw ("Group Saving not found")
      }

      group.concurrentAmount += transaction.amount
      group.save()
      resolve(group)
    }
    catch (error) {
      console.log(error)
      reject(error)
    }
  })
}

export async function getMemberListSavingGroup(groupId) : Promise<ObjectId[]> {
  return new Promise(async (resolve, reject) => {
    try {
      let group = await GroupSaving.findById(groupId);
      if (!group) {
        throw("Group Saving not found")
      }

      let members : IGroupSavingParticipation[] = await GroupSavingParticipation.find({ groupSaving: groupId });
      let memberList : ObjectId[] = []
      if (members.length > 0) memberList = members.map(member => member.user)
      resolve(memberList)
    }
    catch (error) {
      console.log(error)
      reject(error)
    }
  })
}

export async function removeTransactionFromGroupSaving(transactionId) {
  return new Promise(async (resolve, reject) => {
    try {
      const transaction = await Transaction.findById(transactionId)
      if (!transaction) {
        throw ("Transaction not found")
      }

      const group = await GroupSaving.findById(transaction.savingGroupId)
      if (!group) {
        throw ("Group Saving not found")
      }

      group.concurrentAmount -= transaction.amount;

      group.save()
      resolve(group)
    }
    catch (error) {
      console.log(error)
      reject(error)
    }
  })
}
