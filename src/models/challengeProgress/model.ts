import mongoose, {Schema} from 'mongoose';
import { IChallengeProgress } from './interface';

const checkpointPassSchema: Schema = new Schema({
  checkpointId: {
    type: Schema.Types.ObjectId,
    ref: 'ChallengeCheckpoint',
  },
  date: Date
});

const challengeProgressSchema: Schema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  challenge: {
    type: mongoose.Types.ObjectId,
    ref: 'FinancialChallenge',
    required: true
  },
  currentProgress: {type: Number, default: 0},
  lastUpdate: {type: Date, default: Date.now()},
  checkpointPassed: {
    type: [checkpointPassSchema],
    default: []
  }

});

const ChallengeProgress = mongoose.models.ChallengeProgress || mongoose.model<IChallengeProgress>('ChallengeProgress', challengeProgressSchema);

export default ChallengeProgress;
