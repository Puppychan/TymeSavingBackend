import mongoose, {Schema} from 'mongoose';
import { IChallengeProgress, ICheckpointPass } from './interface';

export const checkpointPassSchema: Schema = new Schema({
  checkpointId: {
    type: Schema.Types.ObjectId,
    ref: 'ChallengeCheckpoint',
  },
  date: Date
}, {_id: false});

const challengeProgressSchema: Schema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  challengeId: {
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
export const CheckpointPass = mongoose.models.CheckpointPass || mongoose.model<ICheckpointPass>('CheckpointPass', checkpointPassSchema);

export default ChallengeProgress;
