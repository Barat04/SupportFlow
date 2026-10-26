import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { ticketApi } from '../../api/ticketApi';
import { authApi } from '../../api/authApi';
import { Button } from '../../components/common/Button';
import { StatusBadge } from '../../components/common/StatusBadge';
import { PriorityBadge } from '../../components/common/PriorityBadge';
import { Spinner } from '../../components/common/Spinner';
import { Alert } from '../../components/common/Alert';
import {
  ArrowLeft,
  LifeBuoy,
  Send,
  Lock,
  MessageSquare,
  User,
  Shield,
  Clock,
  CheckCircle,
  AlertTriangle,
  History,
  UserCheck,
  UserX,
  ChevronDown,
  RefreshCw,
  GitCommit
} from 'lucide-react';

const VALID_TRANSITIONS = {
  open: ['in_progress', 'closed'],
  in_progress: ['resolved', 'open'],
  resolved: ['closed', 'in_progress'],
  closed: ['open']
};

const STATUS_DISPLAY_NAMES = {
  open: 'Open',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  closed: 'Closed'
};

export function TicketDetailPage() {
  const { id } = useParams();
  const location = useLocation();
  const { user } = useAuth();

  const [ticket, setTicket] = useState(null);
  const [comments, setComments] = useState([]);
  const [activities, setActivities] = useState([]);
  const [staffMembers, setStaffMembers] = useState([]);
  const [activeTab, setActiveTab] = useState('comments'); // 'comments' | 'activity'

  const [loading, setLoading] = useState(true);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [submittingReply, setSubmittingReply] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [updatingPriority, setUpdatingPriority] = useState(false);
  const [updatingAssignee, setUpdatingAssignee] = useState(false);

  const [replyMessage, setReplyMessage] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [notification, setNotification] = useState(location.state?.notification || '');
  const [errorMsg, setErrorMsg] = useState('');
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  const isCustomer = user?.role === 'customer';
  const isAgent = user?.role === 'agent';
  const isAdmin = user?.role === 'admin';
  const isStaff = isAgent || isAdmin;

  const currentUserId = user?.id;
  const ticketAssigneeId = ticket?.assignedTo?.id || ticket?.assignedTo?._id;
  const isAssignedToMe = isStaff && ticketAssigneeId && String(ticketAssigneeId) === String(currentUserId);
  const canStaffUpdateStatus = isAdmin || (isAgent && isAssignedToMe);

  const loadTicketAndComments = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const [ticketRes, commentsRes] = await Promise.all([
        ticketApi.getTicketById(id),
        ticketApi.getComments(id)
      ]);

      setTicket(ticketRes.ticket);
      setComments(commentsRes.comments || []);

      // If staff, load staff list for assignment controls
      if (user?.role === 'admin' || user?.role === 'agent') {
        try {
          const staffRes = await authApi.getStaff();
          setStaffMembers(staffRes.staff || []);
        } catch (e) {
          console.error('Could not load staff list:', e);
        }
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to load ticket details.');
    } finally {
      setLoading(false);
    }
  }, [id, user?.role]);

  useEffect(() => {
    loadTicketAndComments();
  }, [loadTicketAndComments]);

  // Lazy load activity trail when tab is clicked
  const handleTabChange = async (tab) => {
    setActiveTab(tab);
    if (tab === 'activity' && activities.length === 0) {
      setLoadingActivity(true);
      try {
        const res = await ticketApi.getActivity(id);
        setActivities(res.activity || []);
      } catch (err) {
        setErrorMsg(err.message || 'Failed to load activity logs.');
      } finally {
        setLoadingActivity(false);
      }
    }
  };

  const handlePostReply = async (e) => {
    e.preventDefault();
    if (!replyMessage.trim()) return;

    setSubmittingReply(true);
    setErrorMsg('');
    try {
      const res = await ticketApi.createComment(id, {
        message: replyMessage.trim(),
        isInternal: isStaff ? isInternalNote : false
      });

      setComments((prev) => [...prev, res.comment]);
      setReplyMessage('');
      setIsInternalNote(false);
      setNotification(
        res.comment.isInternal
          ? 'Internal staff note added.'
          : 'Reply posted to conversation.'
      );
    } catch (err) {
      setErrorMsg(err.message || 'Failed to post reply.');
    } finally {
      setSubmittingReply(false);
    }
  };

  /**
   * Status transition handler.
   */
  const handleStatusTransition = async (targetStatus) => {
    setUpdatingStatus(true);
    setErrorMsg('');
    try {
      const res = await ticketApi.updateStatus(id, targetStatus);
      setTicket(res.ticket);
      setShowCloseConfirm(false);
      setNotification(`Ticket status updated to '${STATUS_DISPLAY_NAMES[targetStatus] || targetStatus}'.`);
      // Invalidate activity cache so it re-fetches
      setActivities([]);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update ticket status.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  /**
   * Priority update handler.
   */
  const handlePriorityChange = async (newPriority) => {
    setUpdatingPriority(true);
    setErrorMsg('');
    try {
      const res = await ticketApi.updatePriority(id, newPriority);
      setTicket(res.ticket);
      setNotification(`Ticket priority updated to '${newPriority}'.`);
      setActivities([]);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update priority.');
    } finally {
      setUpdatingPriority(false);
    }
  };

  /**
   * Ticket assignment handler.
   */
  const handleAssignTicket = async (targetUserId) => {
    setUpdatingAssignee(true);
    setErrorMsg('');
    try {
      const res = await ticketApi.assignTicket(id, targetUserId);
      setTicket(res.ticket);
      setNotification(
        targetUserId
          ? 'Ticket assigned successfully.'
          : 'Ticket returned to unassigned queue.'
      );
      setActivities([]);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update assignment.');
    } finally {
      setUpdatingAssignee(false);
    }
  };

  const formatDate = (isoString) => {
    if (!isoString) return '—';
    const date = new Date(isoString);
    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const allowedTransitions = ticket ? (VALID_TRANSITIONS[ticket.status] || []) : [];
  // Admin only for closed -> open
  const availableNextStates = allowedTransitions.filter((s) => {
    if (ticket?.status === 'closed' && s === 'open') {
      return isAdmin;
    }
    return true;
  });

  const canCustomerClose = isCustomer && ticket && (ticket.status === 'open' || ticket.status === 'resolved');

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <Spinner size="lg" />
      </div>
    );
  }

  if (!ticket && !loading) {
    return (
      <div className="card" style={{ maxWidth: '600px', margin: '2rem auto', textAlign: 'center', padding: '3rem' }}>
        <AlertTriangle size={36} color="var(--danger)" style={{ margin: '0 auto 1rem' }} />
        <h2 style={{ marginBottom: '0.5rem' }}>Ticket Not Found</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
          {errorMsg || 'The requested ticket could not be found or you do not have permission to view it.'}
        </p>
        <Link to="/tickets">
          <Button variant="primary">Return to Ticket List</Button>
        </Link>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Breadcrumb Navigation & Customer Close Action */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Link
            to="/tickets"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              color: 'var(--text-muted)',
              textDecoration: 'none',
              fontSize: '0.875rem'
            }}
          >
            <ArrowLeft size={16} />
            <span>Tickets</span>
          </Link>
          <span style={{ color: 'var(--text-subtle)' }}>/</span>
          <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--primary)' }}>
            {ticket.ticketNumber}
          </span>
        </div>

        {canCustomerClose && (
          showCloseConfirm ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(239, 68, 68, 0.1)', padding: '0.35rem 0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(239, 68, 68, 0.25)' }}>
              <span style={{ fontSize: '0.85rem', color: '#fca5a5' }}>Close this ticket?</span>
              <Button
                variant="danger"
                onClick={() => handleStatusTransition('closed')}
                loading={updatingStatus}
                style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem' }}
              >
                Yes, Close
              </Button>
              <Button
                variant="ghost"
                onClick={() => setShowCloseConfirm(false)}
                disabled={updatingStatus}
                style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem' }}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <Button
              variant="secondary"
              onClick={() => setShowCloseConfirm(true)}
              icon={CheckCircle}
            >
              Mark Ticket as Closed
            </Button>
          )
        )}
      </div>

      {notification && <Alert type="info">{notification}</Alert>}
      {errorMsg && <Alert type="error">{errorMsg}</Alert>}

      {/* Main Ticket Banner */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
              <span
                style={{
                  fontFamily: 'monospace',
                  fontSize: '0.9rem',
                  fontWeight: 800,
                  padding: '0.2rem 0.6rem',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'rgba(99, 102, 241, 0.15)',
                  color: 'var(--primary)',
                  border: '1px solid rgba(99, 102, 241, 0.3)'
                }}
              >
                {ticket.ticketNumber}
              </span>
              <StatusBadge status={ticket.status} />
              <PriorityBadge priority={ticket.priority} />
              <span className="badge-category">{ticket.category}</span>
            </div>

            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>
              {ticket.title}
            </h1>
          </div>

          {/* Staff State Machine Transition Buttons */}
          {isStaff && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.4rem' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', fontWeight: 600, textTransform: 'uppercase' }}>
                Status Transitions
              </div>

              {canStaffUpdateStatus ? (
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {availableNextStates.map((target) => (
                    <Button
                      key={target}
                      variant="secondary"
                      onClick={() => handleStatusTransition(target)}
                      loading={updatingStatus}
                      style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                    >
                      <span>Move to {STATUS_DISPLAY_NAMES[target] || target}</span>
                    </Button>
                  ))}
                  {availableNextStates.length === 0 && (
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      No further status transitions
                    </span>
                  )}
                </div>
              ) : (
                <div style={{ fontSize: '0.8rem', color: 'var(--warning)', fontStyle: 'italic' }}>
                  Claim this ticket to change status
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Two Column Layout: Main Thread / Activity Tabs (Left) & Ticket Controls (Right) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 340px', gap: '1.5rem', alignItems: 'start' }}>
        {/* Left Column: Original Issue + Tabs for Comments & Activity */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Customer's Original Issue Description */}
          <div className="card" style={{ borderColor: 'rgba(99, 102, 241, 0.25)' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingBottom: '0.85rem',
                borderBottom: '1px solid var(--border-subtle)',
                marginBottom: '1rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(99, 102, 241, 0.2)',
                    color: 'var(--primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '0.85rem'
                  }}
                >
                  {ticket.customer?.name ? ticket.customer.name[0].toUpperCase() : 'C'}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                    {ticket.customer?.name}
                    <span
                      style={{
                        marginLeft: '0.5rem',
                        fontSize: '0.7rem',
                        padding: '0.15rem 0.45rem',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: 'rgba(255, 255, 255, 0.08)',
                        color: 'var(--text-muted)',
                        fontWeight: 600,
                        textTransform: 'uppercase'
                      }}
                    >
                      Author
                    </span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>
                    {ticket.customer?.email}
                  </div>
                </div>
              </div>

              <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Clock size={13} />
                <span>{formatDate(ticket.createdAt)}</span>
              </div>
            </div>

            <div
              style={{
                fontSize: '0.95rem',
                lineHeight: '1.7',
                color: 'var(--text-main)',
                whiteSpace: 'pre-wrap'
              }}
            >
              {ticket.description}
            </div>
          </div>

          {/* Navigation Tabs (Comments vs Activity Timeline) */}
          <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.25rem' }}>
            <button
              type="button"
              onClick={() => handleTabChange('comments')}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '0.6rem 1rem',
                fontSize: '0.9rem',
                fontWeight: 600,
                color: activeTab === 'comments' ? '#ffffff' : 'var(--text-muted)',
                borderBottom: activeTab === 'comments' ? '2px solid var(--primary)' : '2px solid transparent',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}
            >
              <MessageSquare size={16} />
              <span>Conversation ({comments.length})</span>
            </button>

            {isStaff && (
              <button
                type="button"
                onClick={() => handleTabChange('activity')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '0.6rem 1rem',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  color: activeTab === 'activity' ? '#ffffff' : 'var(--text-muted)',
                  borderBottom: activeTab === 'activity' ? '2px solid var(--primary)' : '2px solid transparent',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}
              >
                <History size={16} />
                <span>Audit Activity</span>
              </button>
            )}
          </div>

          {/* TAB 1: CONVERSATION HISTORY */}
          {activeTab === 'comments' && (
            <>
              {comments.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  No replies on this ticket yet. Add the first reply below.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {comments.map((comment) => {
                    const isInternal = comment.isInternal;
                    const authorRole = comment.author?.role || 'customer';

                    return (
                      <div
                        key={comment.id || comment._id}
                        className={`comment-card ${isInternal ? 'comment-card-internal' : ''}`}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            <div
                              style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '50%',
                                backgroundColor:
                                  authorRole === 'admin'
                                    ? 'rgba(239, 68, 68, 0.2)'
                                    : authorRole === 'agent'
                                    ? 'rgba(99, 102, 241, 0.2)'
                                    : 'rgba(52, 211, 153, 0.2)',
                                color:
                                  authorRole === 'admin'
                                    ? 'var(--danger)'
                                    : authorRole === 'agent'
                                    ? 'var(--primary)'
                                    : 'var(--status-resolved-text)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 700,
                                fontSize: '0.75rem'
                              }}
                            >
                              {comment.author?.name ? comment.author.name[0].toUpperCase() : 'U'}
                            </div>

                            <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                              {comment.author?.name || 'Staff Member'}
                            </span>

                            <span
                              style={{
                                fontSize: '0.7rem',
                                textTransform: 'uppercase',
                                fontWeight: 700,
                                padding: '0.1rem 0.45rem',
                                borderRadius: 'var(--radius-sm)',
                                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                color: 'var(--text-muted)'
                              }}
                            >
                              {authorRole}
                            </span>

                            {isInternal && (
                              <span
                                className="badge badge-internal"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                              >
                                <Lock size={12} />
                                <span>Internal Staff Note</span>
                              </span>
                            )}
                          </div>

                          <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>
                            {formatDate(comment.createdAt)}
                          </span>
                        </div>

                        <div
                          style={{
                            fontSize: '0.925rem',
                            lineHeight: '1.65',
                            color: isInternal ? '#fef3c7' : 'var(--text-main)',
                            whiteSpace: 'pre-wrap'
                          }}
                        >
                          {comment.message}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Reply Form */}
              {ticket.status === 'closed' && !isStaff ? (
                <div className="card" style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)' }}>
                  This ticket is closed. If you require further assistance on a related issue, please submit a new ticket.
                </div>
              ) : (
                <div className="card">
                  <h4 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 600 }}>
                    {isStaff ? 'Post Reply or Staff Note' : 'Add Reply to Support'}
                  </h4>

                  <form onSubmit={handlePostReply} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <textarea
                      className="form-textarea"
                      placeholder={
                        isInternalNote
                          ? 'Write a private internal note (visible only to support agents and admins)...'
                          : 'Type your message or update...'
                      }
                      rows={4}
                      value={replyMessage}
                      onChange={(e) => setReplyMessage(e.target.value)}
                      disabled={submittingReply}
                      maxLength={2000}
                      required
                    />

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                      {/* Internal Note Toggle for Staff */}
                      {isStaff ? (
                        <label
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            color: isInternalNote ? 'var(--internal-note-text)' : 'var(--text-muted)',
                            userSelect: 'none'
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isInternalNote}
                            onChange={(e) => setIsInternalNote(e.target.checked)}
                            style={{ cursor: 'pointer' }}
                          />
                          <Lock size={14} />
                          <strong>Private Internal Note</strong> (Hidden from customer)
                        </label>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>
                          Replies are visible to support agents assisting your ticket.
                        </span>
                      )}

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>
                          {replyMessage.length} / 2000
                        </span>
                        <Button
                          type="submit"
                          variant={isInternalNote ? 'secondary' : 'primary'}
                          loading={submittingReply}
                          icon={Send}
                        >
                          {isInternalNote ? 'Save Internal Note' : 'Send Reply'}
                        </Button>
                      </div>
                    </div>
                  </form>
                </div>
              )}
            </>
          )}

          {/* TAB 2: AUDIT ACTIVITY TIMELINE */}
          {activeTab === 'activity' && isStaff && (
            <div className="card">
              <h4 style={{ margin: '0 0 1.25rem', fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <History size={18} color="var(--primary)" />
                <span>Ticket Lifecycle Audit Trail</span>
              </h4>

              {loadingActivity ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
                  <Spinner size="md" />
                </div>
              ) : activities.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                  No audit activity recorded yet.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {activities.map((act) => (
                    <div
                      key={act.id || act._id}
                      style={{
                        padding: '0.85rem 1rem',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid var(--border-subtle)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.35rem'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <GitCommit size={15} color="var(--primary)" />
                          <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                            {act.performedBy?.name || 'System User'}
                          </span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-subtle)', textTransform: 'uppercase' }}>
                            ({act.performedBy?.role || 'user'})
                          </span>
                        </div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>
                          {formatDate(act.createdAt)}
                        </span>
                      </div>

                      <div style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>
                        <strong>Action:</strong> <code style={{ color: 'var(--primary)' }}>{act.action}</code>
                        {act.fieldChanged && (
                          <span> — changed <code>{act.fieldChanged}</code> from <code>{String(act.oldValue)}</code> to <code>{String(act.newValue)}</code></span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Ticket Controls & Metadata Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Staff Assignment & Priority Controls */}
          {isStaff && (
            <div className="card" style={{ borderColor: 'rgba(99, 102, 241, 0.3)' }}>
              <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-subtle)', fontWeight: 700, marginBottom: '1rem' }}>
                Staff Controls
              </h4>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Agent Claim / Unclaim Action */}
                {isAgent && (
                  <div>
                    <label className="form-label">Ticket Ownership</label>
                    {!ticketAssigneeId ? (
                      <Button
                        variant="primary"
                        onClick={() => handleAssignTicket(user?.id)}
                        loading={updatingAssignee}
                        icon={UserCheck}
                        style={{ width: '100%', fontSize: '0.85rem' }}
                      >
                        Claim Ticket for Myself
                      </Button>
                    ) : isAssignedToMe ? (
                      <Button
                        variant="secondary"
                        onClick={() => handleAssignTicket(null)}
                        loading={updatingAssignee}
                        icon={UserX}
                        style={{ width: '100%', fontSize: '0.85rem' }}
                      >
                        Unclaim (Return to Queue)
                      </Button>
                    ) : (
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        Assigned to: <strong>{ticket.assignedTo?.name}</strong>
                      </div>
                    )}
                  </div>
                )}

                {/* Admin Assignment Selector */}
                {isAdmin && (
                  <div>
                    <label className="form-label" htmlFor="admin-assignee">
                      Assignee (Admin Override)
                    </label>
                    <select
                      id="admin-assignee"
                      className="form-select"
                      value={ticketAssigneeId || ''}
                      onChange={(e) => handleAssignTicket(e.target.value || null)}
                      disabled={updatingAssignee}
                    >
                      <option value="">Unassigned (In Queue)</option>
                      {staffMembers.map((s) => (
                        <option key={s.id || s._id} value={s.id || s._id}>
                          {s.name} ({s.role})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Priority Selector for Staff */}
                {(isAdmin || (isAgent && isAssignedToMe)) && (
                  <div>
                    <label className="form-label" htmlFor="ticket-priority-selector">
                      Update Priority
                    </label>
                    <select
                      id="ticket-priority-selector"
                      className="form-select"
                      value={ticket.priority}
                      onChange={(e) => handlePriorityChange(e.target.value)}
                      disabled={updatingPriority}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Ticket Information Card */}
          <div className="card">
            <h4
              style={{
                fontSize: '0.85rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'var(--text-subtle)',
                fontWeight: 700,
                marginBottom: '1rem'
              }}
            >
              Ticket Information
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', marginBottom: '0.2rem' }}>
                  Status
                </div>
                <StatusBadge status={ticket.status} />
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', marginBottom: '0.2rem' }}>
                  Priority
                </div>
                <PriorityBadge priority={ticket.priority} />
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', marginBottom: '0.2rem' }}>
                  Category
                </div>
                <span className="badge-category">{ticket.category}</span>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', marginBottom: '0.2rem' }}>
                  Assigned Support Agent
                </div>
                {ticket.assignedTo ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, fontSize: '0.875rem' }}>
                    <Shield size={14} color="var(--primary)" />
                    <span>{ticket.assignedTo.name}</span>
                  </div>
                ) : (
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    Unassigned (In Triage Queue)
                  </span>
                )}
              </div>

              <div style={{ paddingTop: '0.5rem', borderTop: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', marginBottom: '0.2rem' }}>
                  Reported By
                </div>
                <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{ticket.customer?.name}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>{ticket.customer?.email}</div>
              </div>

              <div style={{ paddingTop: '0.5rem', borderTop: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', marginBottom: '0.2rem' }}>
                  Created At
                </div>
                <div style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>{formatDate(ticket.createdAt)}</div>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', marginBottom: '0.2rem' }}>
                  Last Updated
                </div>
                <div style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>{formatDate(ticket.updatedAt)}</div>
              </div>
            </div>
          </div>

          {/* Privacy Notice Card */}
          <div className="card" style={{ background: 'rgba(255, 255, 255, 0.02)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
              <Lock size={15} color="var(--primary)" />
              <strong style={{ fontSize: '0.85rem' }}>Privacy Guarantee</strong>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-subtle)', lineHeight: '1.5', margin: 0 }}>
              Internal notes and staff activity logs are strictly filtered on the server. Customers can never read or submit internal staff notes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
