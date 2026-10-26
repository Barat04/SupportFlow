const mongoose = require('mongoose');
const { TICKET_STATUS, ALL_TICKET_STATUSES } = require('../constants/ticketStatus');
const { TICKET_PRIORITY, ALL_TICKET_PRIORITIES } = require('../constants/ticketPriority');
const { ALL_TICKET_CATEGORIES } = require('../constants/ticketCategory');

const ticketSchema = new mongoose.Schema(
  {
    ticketNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      index: true
    },
    title: {
      type: String,
      required: [true, 'Ticket title is required'],
      trim: true,
      minlength: [3, 'Title must be at least 3 characters long'],
      maxlength: [120, 'Title cannot exceed 120 characters']
    },
    description: {
      type: String,
      required: [true, 'Ticket description is required'],
      trim: true,
      minlength: [10, 'Description must be at least 10 characters long'],
      maxlength: [5000, 'Description cannot exceed 5000 characters']
    },
    category: {
      type: String,
      enum: {
        values: ALL_TICKET_CATEGORIES,
        message: 'Invalid ticket category'
      },
      required: [true, 'Category is required'],
      index: true
    },
    priority: {
      type: String,
      enum: {
        values: ALL_TICKET_PRIORITIES,
        message: 'Invalid ticket priority'
      },
      default: TICKET_PRIORITY.MEDIUM,
      index: true
    },
    status: {
      type: String,
      enum: {
        values: ALL_TICKET_STATUSES,
        message: 'Invalid ticket status'
      },
      default: TICKET_STATUS.OPEN,
      index: true
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Customer reference is required'],
      index: true
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true
    }
  },
  {
    timestamps: true
  }
);

// Compound Indexes for query optimization
// 1. Speeds up customer queries filtering by status
ticketSchema.index({ customer: 1, status: 1 });

// 2. Speeds up agent queues (e.g. "Assigned to me and open/in-progress")
ticketSchema.index({ assignedTo: 1, status: 1 });

// 3. Speeds up global queue triage, priority ordering, and creation date sorting
ticketSchema.index({ status: 1, priority: 1, createdAt: -1 });

// Clean serialization transforms
ticketSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret.__v;
    return ret;
  }
});

ticketSchema.set('toObject', {
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret.__v;
    return ret;
  }
});

const Ticket = mongoose.model('Ticket', ticketSchema);

module.exports = Ticket;
