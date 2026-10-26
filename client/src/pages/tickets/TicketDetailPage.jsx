import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { ticketApi } from '../../api/ticketApi';
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
  FileText
} from 'lucide-react';

export function TicketDetailPage() {
  const { id } = useParams();
  const location = useLocation();
  const { user } = useAuth();

  const [ticket, setTicket] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submittingReply, setSubmittingReply] = useState(false);
  const [replyMessage, setReplyMessage] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [notification, setNotification] = useState(location.state?.notification || '');
  const [errorMsg, setErrorMsg] = useState('');
  const [closingTicket, setClosingTicket] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  const isCustomer = user?.role === 'customer';
  const isStaff = user?.role === 'agent' || user?.role === 'admin';

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
    } catch (err) {
      setErrorMsg(err.message || 'Failed to load ticket details.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadTicketAndComments();
  }, [loadTicketAndComments]);

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

      // Append newly created comment directly to the state
      setComments((prev) => [...prev, res.comment]);
      setReplyMessage('');
      setIsInternalNote(false);
      setNotification(
        res.comment.isInternal
          ? 'Internal note added to thread.'
          : 'Reply posted to conversation.'
      );
    } catch (err) {
      setErrorMsg(err.message || 'Failed to post reply.');
    } finally {
      setSubmittingReply(false);
    }
  };

  /**
   * Customer action to close ticket if status is 'open' or 'resolved'.
   */
  const handleCustomerCloseTicket = async () => {
    setClosingTicket(true);
    setErrorMsg('');
    try {
      const res = await ticketApi.updateStatus(id, 'closed');
      setTicket(res.ticket);
      setShowCloseConfirm(false);
      setNotification('Ticket closed successfully.');
    } catch (err) {
      setErrorMsg(err.message || 'Failed to close ticket.');
    } finally {
      setClosingTicket(false);
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
      {/* Breadcrumb & Navigation */}
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
                onClick={handleCustomerCloseTicket}
                loading={closingTicket}
                style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem' }}
              >
                Yes, Close
              </Button>
              <Button
                variant="ghost"
                onClick={() => setShowCloseConfirm(false)}
                disabled={closingTicket}
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

      {notification && (
        <Alert type="info">
          {notification}
        </Alert>
      )}

      {errorMsg && <Alert type="error">{errorMsg}</Alert>}

      {/* Main Ticket Header Banner */}
      <div
        className="card"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
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
        </div>
      </div>

      {/* Two Column Layout: Main Conversation Thread (Left) & Ticket Meta (Right) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 340px', gap: '1.5rem', alignItems: 'start' }}>
        {/* Left Column: Original Issue + Comment Thread */}
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
                      Original Author
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

          {/* Conversation Thread Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0.5rem 0 0' }}>
            <MessageSquare size={18} color="var(--primary)" />
            <h3 style={{ fontSize: '1.15rem', margin: 0, fontWeight: 700 }}>
              Conversation History ({comments.length})
            </h3>
          </div>

          {/* Thread Comments List */}
          {comments.length === 0 ? (
            <div
              className="card"
              style={{
                textAlign: 'center',
                padding: '2rem',
                color: 'var(--text-muted)',
                fontSize: '0.9rem'
              }}
            >
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
                    {/* Comment Header */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '0.75rem'
                      }}
                    >
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
                          {comment.author?.name || 'Support Staff'}
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

                    {/* Comment Message Body */}
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

          {/* Add Reply Form */}
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
        </div>

        {/* Right Column: Ticket Meta & SLA Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Metadata Card */}
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

          {/* Internal Note Privacy Shield Card */}
          <div className="card" style={{ background: 'rgba(255, 255, 255, 0.02)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
              <Lock size={15} color="var(--primary)" />
              <strong style={{ fontSize: '0.85rem' }}>Privacy Guarantee</strong>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-subtle)', lineHeight: '1.5', margin: 0 }}>
              Internal notes are strictly filtered on the server. Customers can never read or inject internal staff notes through any client payload or query.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
