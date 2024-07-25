import mongoose, {Schema} from 'mongoose';
import { IChallengeCheckpoint } from './interface';

const challengeCheckpointSchema: Schema = new Schema({
  challengeId: {
    type: mongoose.Types.ObjectId,
    ref: 'FinancialChallenge',
    required: true
  },
  name: {type: String, required: true},
  description: {type: String},
  checkpointValue: {type: Number, required: true},
  reward: {
    type: mongoose.Types.ObjectId,
    ref: 'Reward',
  },
  startDate: {type: Date},
  endDate: {type: Date},
  createdBy: {type: Schema.Types.ObjectId, ref: 'User'}
});
const ChallengeCheckpoint = mongoose.models.ChallengeCheckpoint || mongoose.model<IChallengeCheckpoint>('ChallengeCheckpoint', challengeCheckpointSchema);

export default ChallengeCheckpoint;
