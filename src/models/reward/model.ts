import mongoose, {Schema} from 'mongoose';
import { IReward, RewardCategory } from './interface';

// Define the schema for the user
const rewardChema: Schema = new Schema({
  name: {type: String, required: true},
  category: {
    type: String, 
    enum: Object.values(RewardCategory),
  },
  value: {type: Schema.Types.Mixed, required: true},
  financialChallenge: {
    type: Schema.Types.ObjectId,
    ref: 'Financial Challenge',
    required: true
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
});

const reward = mongoose.models.Reward || mongoose.model<IReward>('Reward', rewardChema);

export default reward;
