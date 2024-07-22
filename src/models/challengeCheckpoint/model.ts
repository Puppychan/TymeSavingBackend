import mongoose, {Schema} from 'mongoose';
import { IChallengeCheckpoint } from './interface';
import { start } from 'repl';
import { endOfDay } from 'date-fns';

const challengeCheckpointSchema: Schema = new Schema({
  name: {type: String, required: true},
  description: {type: String},
  checkpoint: {type: Number, required: true},
  reward: {
    type: mongoose.Types.ObjectId,
    ref: 'Reward',
  },
  startDate: {type: Date},
  endDate: {type: Date},
});
const ChallengeCheckpoint = mongoose.models.ChallengeCheckpoint || mongoose.model<IChallengeCheckpoint>('ChallengeCheckpoint', challengeCheckpointSchema);

export default ChallengeCheckpoint;
