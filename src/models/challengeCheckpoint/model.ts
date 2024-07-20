import mongoose, {Schema} from 'mongoose';
import { IChallengeCheckpoint } from './interface';

const challengeCheckpointSchema: Schema = new Schema({
  name: {type: String, required: true},
  description: {type: String},
  checkpoint: {type: Number, required: true},
  reward: {
    type: mongoose.Types.ObjectId,
    ref: 'Reward',
  },
  punishment: {
    type: mongoose.Types.ObjectId,
    ref: 'Punishment',
  }
});
const ChallengeCheckpoint = mongoose.models.ChallengeCheckpoint || mongoose.model<IChallengeCheckpoint>('ChallengeCheckpoint', challengeCheckpointSchema);

export default ChallengeCheckpoint;
