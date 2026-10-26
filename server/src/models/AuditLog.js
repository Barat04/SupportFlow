const mongoose = require('mongoose');

const AUDIT_ACTIONS = Object.freeze({
  CREATED: 'CREATED',
  STATUS_UPDATED: 'STATUS_UPDATED',
  ASSIGNED: 'ASSIGNED',
  PRIORITY_UPDATED: 'PRIORITY_UPDATED',
  COMMENT_ADDED: 'COMMENT_ADDED'
});

const auditLogSchema = new mongoose.Schema(
  {
    ticket: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ticket',
      required: true,
      index: true
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    action: {
      type: String,
      enum: Object.values(AUDIT_ACTIONS),
      required: true,
      index: true
    },
    fieldChanged: {
      type: String,
      default: null
    },
    oldValue: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    newValue: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    isInternal: {
      type: Boolean,
      default: false,
      index: true
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false }
  }
);

// Compound indexes for timeline queries
auditLogSchema.index({ ticket: 1, createdAt: 1 });
auditLogSchema.index({ ticket: 1, isInternal: 1, createdAt: 1 });

auditLogSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret.__v;
    return ret;
  }
});

auditLogSchema.set('toObject', {
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret.__v;
    return ret;
  }
});

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

module.exports = {
  AuditLog,
  AUDIT_ACTIONS
};
