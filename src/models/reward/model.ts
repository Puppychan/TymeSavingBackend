import mongoose, {Schema} from 'mongoose';
import { IReward, RewardCategory } from './interface';

const rewardPrizeSchema: Schema = new Schema({
  category: {
    type: String,
    enum: Object.values(RewardCategory),
    required: true
  },
  value: {type: Schema.Types.Mixed, required: true}
}, { _id : false });


// Define the schema for the user
const rewardChema: Schema = new Schema({
  name: {type: String, required: true},
  description: {type: String},
  prize: {
    type: [rewardPrizeSchema], 
    required: true
  },
  createdBy: {type: Schema.Types.ObjectId, ref: 'User'}
});

export const RewardPrize = mongoose.models.RewardPrize || mongoose.model('RewardPrize', rewardPrizeSchema);
const Reward = mongoose.models.Reward || mongoose.model<IReward>('Reward', rewardChema);

export default Reward;
