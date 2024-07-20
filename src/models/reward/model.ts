import mongoose, {Schema} from 'mongoose';
import { IReward, RewardCategory } from './interface';

const rewardPriceSchema: Schema = new Schema({
  category: {
    type: String,
    enum: Object.values(RewardCategory),
    required: true
  },
  value: {type: Schema.Types.Mixed, required: true}
});


// Define the schema for the user
const rewardChema: Schema = new Schema({
  name: {type: String, required: true},
  description: {type: String},
  price: {
    type: [rewardPriceSchema], 
    required: true
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
});

// const prize = mongoose.models.Prize || mongoose.model('Prize', prizeSchema);
const Reward = mongoose.models.Reward || mongoose.model<IReward>('Reward', rewardChema);

export default Reward;
