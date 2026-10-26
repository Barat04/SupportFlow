import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ticketApi } from '../../api/ticketApi';
import { Button } from '../../components/common/Button';
import { Alert } from '../../components/common/Alert';
import { PlusCircle, ArrowLeft, LifeBuoy, Info } from 'lucide-react';

export function NewTicketPage() {
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('technical');
  const [priority, setPriority] = useState('medium');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (title.trim().length < 3 || title.trim().length > 120) {
      setErrorMsg('Ticket title must be between 3 and 120 characters.');
      return;
    }

    if (description.trim().length < 10) {
      setErrorMsg('Description must be at least 10 characters long to provide sufficient detail.');
      return;
    }

    setLoading(true);
    try {
      const response = await ticketApi.createTicket({
        title: title.trim(),
        category,
        priority,
        description: description.trim()
      });

      const created = response.ticket;
      navigate(`/tickets/${created.id || created._id}`, {
        state: { notification: `Ticket ${created.ticketNumber} created successfully!` }
      });
    } catch (err) {
      setErrorMsg(err.message || 'Failed to create ticket. Please check the inputs.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Navigation Breadcrumb */}
      <div>
        <Link
          to="/tickets"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            color: 'var(--text-muted)',
            textDecoration: 'none',
            fontSize: '0.875rem',
            marginBottom: '0.75rem'
          }}
        >
          <ArrowLeft size={16} />
          <span>Back to Tickets</span>
        </Link>

        <h1 style={{ fontSize: '1.875rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '0.35rem' }}>
          Submit Support Ticket
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
          Describe the problem or request in detail and our support engineers will review it.
        </p>
      </div>

      {errorMsg && <Alert type="error">{errorMsg}</Alert>}

      <div className="card">
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.35rem' }}>
          {/* Ticket Title */}
          <div>
            <label className="form-label" htmlFor="ticket-title">
              Ticket Title <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <input
              id="ticket-title"
              type="text"
              className="form-input"
              placeholder="e.g. Cannot download monthly invoice PDF"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={loading}
              maxLength={120}
              required
            />
            <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', marginTop: '0.25rem' }}>
              Brief summary of your issue (3 to 120 characters)
            </div>
          </div>

          {/* Category & Priority Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
            <div>
              <label className="form-label" htmlFor="ticket-category">
                Category <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <select
                id="ticket-category"
                className="form-select"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                disabled={loading}
              >
                <option value="technical">Technical Support</option>
                <option value="billing">Billing & Invoicing</option>
                <option value="account">Account Access</option>
                <option value="general">General Inquiry</option>
              </select>
            </div>

            <div>
              <label className="form-label" htmlFor="ticket-priority">
                Urgency / Priority
              </label>
              <select
                id="ticket-priority"
                className="form-select"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                disabled={loading}
              >
                <option value="low">Low — General inquiry or non-blocking</option>
                <option value="medium">Medium — Normal operational impact</option>
                <option value="high">High — Significant issue affecting work</option>
                <option value="urgent">Urgent — Critical system blocker</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="form-label" htmlFor="ticket-desc">
                Detailed Description <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <span style={{ fontSize: '0.75rem', color: description.length > 4500 ? 'var(--warning)' : 'var(--text-subtle)' }}>
                {description.length} / 5000
              </span>
            </div>
            <textarea
              id="ticket-desc"
              className="form-textarea"
              placeholder="Please provide steps to reproduce, error codes, expected behavior, and any relevant context..."
              rows={6}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={loading}
              maxLength={5000}
              required
            />
          </div>

          {/* Form Actions */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '0.75rem',
              paddingTop: '1rem',
              borderTop: '1px solid var(--border-subtle)'
            }}
          >
            <Link to="/tickets" style={{ textDecoration: 'none' }}>
              <Button variant="ghost" type="button" disabled={loading}>
                Cancel
              </Button>
            </Link>
            <Button variant="primary" type="submit" loading={loading} icon={PlusCircle}>
              Submit Ticket
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
