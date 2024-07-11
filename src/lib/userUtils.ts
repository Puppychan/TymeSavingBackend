import { IUser, TymeRewardLevel } from "src/models/user/interface"
import User from "src/models/user/model"

export function getTymeRewardLevel(userPoints): TymeRewardLevel  {
  if (userPoints >= 150) {
    return TymeRewardLevel.Platinum
  }
  if (userPoints >= 100) {
    return TymeRewardLevel.Gold
  }
  if (userPoints >= 50) {
    return TymeRewardLevel.Silver
  }  
  return TymeRewardLevel.Classic
}

export async function updateUserPoints(userId, points): Promise<IUser>{
  return new Promise(async (resolve, reject) => {
    try {
      const user = await User.findById(userId)
      if (!user) {
        throw ("User not found")
      }

      let userPoints = user.userPoints ?? 0
      userPoints += points
      user.userPoints += userPoints
      user.tymeReward = getTymeRewardLevel(user.userPoints)
      user.save()
      resolve(user)
    }
    catch (error) {
      console.log(error)
      reject(error)
    }
  })
}