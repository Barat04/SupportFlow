const mongoose = require('mongoose');

const counterSchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true
  },
  seq: {
    type: Number,
    default: 1000
  }
});

/**
 * Atomically increments and returns the next sequence number for a given counter key.
 * By default offsets by 1000 so initial IDs start at 1001 (e.g. SUP-1001, SUP-1002).
 * 
 * @param {string} counterName 
 * @param {number} [offset=1000]
 * @returns {Promise<number>}
 */
counterSchema.statics.getNextSequence = async function (counterName, offset = 1000) {
  const counter = await this.findByIdAndUpdate(
    counterName,
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return offset + counter.seq;
};

const Counter = mongoose.model('Counter', counterSchema);

module.exports = Counter;
