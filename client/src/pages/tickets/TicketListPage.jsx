import React, { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { ticketApi } from '../../api/ticketApi';
import { Button } from '../../components/common/Button';
import { StatusBadge } from '../../components/common/StatusBadge';
import { PriorityBadge } from '../../components/common/PriorityBadge';
import { Spinner } from '../../components/common/Spinner';
import { Alert } from '../../components/common/Alert';
import {
  Ticket,
  PlusCircle,
  Search,
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Inbox
} from 'lucide-react';

export function TicketListPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [tickets, setTickets] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // Extract filter parameters from URL query string
  const search = searchParams.get('search') || '';
  const status = searchParams.get('status') || '';
  const priority = searchParams.get('priority') || '';
  const category = searchParams.get('category') || '';
  const sortBy = searchParams.get('sortBy') || '-createdAt';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const assignedTo = searchParams.get('assignedTo') || '';

  const isCustomer = user?.role === 'customer';

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const query = {
        page,
        limit: 10,
        search: search || undefined,
        status: status || undefined,
        priority: priority || undefined,
        category: category || undefined,
        sortBy: sortBy || undefined,
        assignedTo: assignedTo === 'me' ? user?.id : (assignedTo || undefined)
      };

      const res = await ticketApi.getTickets(query);
      setTickets(res.tickets || []);
      setPagination(res.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 });
    } catch (err) {
      setErrorMsg(err.message || 'Failed to load tickets.');
    } finally {
      setLoading(false);
    }
  }, [page, search, status, priority, category, sortBy, assignedTo, user?.id]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const updateFilters = (newParams) => {
    const updated = new URLSearchParams(searchParams);
    Object.entries(newParams).forEach(([k, v]) => {
      if (v) {
        updated.set(k, v);
      } else {
        updated.delete(k);
      }
    });
    // Reset to page 1 on filter changes unless changing page directly
    if (!('page' in newParams)) {
      updated.set('page', '1');
    }
    setSearchParams(updated);
  };

  const handleResetFilters = () => {
    setSearchParams({});
  };

  const hasActiveFilters = Boolean(search || status || priority || category || assignedTo);

  const formatDate = (isoString) => {
    if (!isoString) return '—';
    const date = new Date(isoString);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <Ticket size={24} color="var(--primary)" />
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>
              {isCustomer ? 'My Support Tickets' : 'Support Ticket Queue'}
            </h1>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
            {isCustomer
              ? 'Track, review, and participate in your submitted support tickets.'
              : 'Browse customer inquiries, triage priority issues, and update ticket states.'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <Button
            variant="ghost"
            onClick={fetchTickets}
            disabled={loading}
            icon={RefreshCw}
            title="Refresh List"
          >
            Refresh
          </Button>

          {isCustomer && (
            <Link to="/tickets/new" style={{ textDecoration: 'none' }}>
              <Button variant="primary" icon={PlusCircle}>
                New Ticket
              </Button>
            </Link>
          )}
        </div>
      </div>

      {errorMsg && <Alert type="error">{errorMsg}</Alert>}

      {/* Filters and Search Bar */}
      <div className="card" style={{ padding: '1rem 1.25rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', alignItems: 'center' }}>
          {/* Keyword Search */}
          <div style={{ position: 'relative', gridColumn: 'span 2' }}>
            <Search
              size={16}
              style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }}
            />
            <input
              type="text"
              className="form-input"
              placeholder="Search by ID, title, or keywords..."
              value={search}
              onChange={(e) => updateFilters({ search: e.target.value })}
              style={{ paddingLeft: '2.25rem' }}
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              className="form-select"
              value={status}
              onChange={(e) => updateFilters({ status: e.target.value })}
            >
              <option value="">All Statuses</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div>
            <select
              className="form-select"
              value={priority}
              onChange={(e) => updateFilters({ priority: e.target.value })}
            >
              <option value="">All Priorities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <select
              className="form-select"
              value={category}
              onChange={(e) => updateFilters({ category: e.target.value })}
            >
              <option value="">All Categories</option>
              <option value="technical">Technical</option>
              <option value="billing">Billing</option>
              <option value="account">Account</option>
              <option value="general">General</option>
            </select>
          </div>

          {/* Sort By Filter */}
          <div>
            <select
              className="form-select"
              value={sortBy}
              onChange={(e) => updateFilters({ sortBy: e.target.value })}
            >
              <option value="-createdAt">Newest First</option>
              <option value="createdAt">Oldest First</option>
              <option value="-priority">Highest Priority</option>
              <option value="status">Status</option>
            </select>
          </div>

          {/* Reset button */}
          {hasActiveFilters && (
            <div>
              <Button variant="ghost" onClick={handleResetFilters} style={{ width: '100%', fontSize: '0.8rem' }}>
                Reset Filters
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Tickets Table */}
      {loading ? (
        <div className="card" style={{ display: 'flex', justifyContent: 'center', padding: '3.5rem' }}>
          <Spinner size="lg" />
        </div>
      ) : tickets.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3.5rem 1.5rem' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: 'rgba(99, 102, 241, 0.1)',
              color: 'var(--primary)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1rem'
            }}
          >
            <Inbox size={28} />
          </div>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>No Support Tickets Found</h3>
          <p style={{ color: 'var(--text-muted)', maxWidth: '420px', margin: '0 auto 1.5rem', fontSize: '0.9rem' }}>
            {hasActiveFilters
              ? 'No tickets matched your current search filters. Try clearing filters or using different keywords.'
              : isCustomer
              ? "You haven't submitted any support requests yet. If you have an inquiry, submit a ticket to get started."
              : 'The support queue currently has no tickets.'}
          </p>
          {hasActiveFilters ? (
            <Button variant="secondary" onClick={handleResetFilters}>
              Clear All Filters
            </Button>
          ) : isCustomer ? (
            <Link to="/tickets/new" style={{ textDecoration: 'none' }}>
              <Button variant="primary" icon={PlusCircle}>
                Create Your First Ticket
              </Button>
            </Link>
          ) : null}
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: '120px' }}>Ticket #</th>
                <th>Title & Category</th>
                <th style={{ width: '130px' }}>Status</th>
                <th style={{ width: '110px' }}>Priority</th>
                {!isCustomer && <th>Customer</th>}
                <th>Assignee</th>
                <th style={{ width: '120px' }}>Created</th>
                <th style={{ width: '90px', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((t) => (
                <tr key={t.id || t._id}>
                  {/* Ticket Key */}
                  <td>
                    <Link
                      to={`/tickets/${t.id || t._id}`}
                      style={{
                        fontFamily: 'monospace',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        color: 'var(--primary)',
                        textDecoration: 'none'
                      }}
                    >
                      {t.ticketNumber}
                    </Link>
                  </td>

                  {/* Title & Category */}
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                      <Link
                        to={`/tickets/${t.id || t._id}`}
                        style={{
                          fontWeight: 600,
                          color: 'var(--text-main)',
                          textDecoration: 'none'
                        }}
                      >
                        {t.title}
                      </Link>
                      <div>
                        <span className="badge-category">{t.category}</span>
                      </div>
                    </div>
                  </td>

                  {/* Status Badge */}
                  <td>
                    <StatusBadge status={t.status} />
                  </td>

                  {/* Priority Badge */}
                  <td>
                    <PriorityBadge priority={t.priority} />
                  </td>

                  {/* Customer Column (for Agents/Admins) */}
                  {!isCustomer && (
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: 500, fontSize: '0.85rem' }}>{t.customer?.name || '—'}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>{t.customer?.email}</span>
                      </div>
                    </td>
                  )}

                  {/* Assignee */}
                  <td>
                    {t.assignedTo ? (
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: 500 }}>
                        {t.assignedTo.name}
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-subtle)', fontStyle: 'italic' }}>
                        Unassigned
                      </span>
                    )}
                  </td>

                  {/* Created Date */}
                  <td style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>
                    {formatDate(t.createdAt)}
                  </td>

                  {/* Action */}
                  <td style={{ textAlign: 'right' }}>
                    <Link to={`/tickets/${t.id || t._id}`} style={{ textDecoration: 'none' }}>
                      <Button variant="ghost" style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem' }}>
                        View
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination Bar */}
      {pagination.totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Showing <strong>{tickets.length}</strong> of <strong>{pagination.total}</strong> tickets (Page {pagination.page} of {pagination.totalPages})
          </span>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Button
              variant="secondary"
              disabled={pagination.page <= 1 || loading}
              onClick={() => updateFilters({ page: String(pagination.page - 1) })}
              icon={ChevronLeft}
              style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              disabled={pagination.page >= pagination.totalPages || loading}
              onClick={() => updateFilters({ page: String(pagination.page + 1) })}
              style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}
            >
              <span>Next</span>
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
