import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { dashboardApi } from '../../api/dashboardApi';
import { ticketApi } from '../../api/ticketApi';
import { Button } from '../../components/common/Button';
import { StatusBadge } from '../../components/common/StatusBadge';
import { PriorityBadge } from '../../components/common/PriorityBadge';
import { Spinner } from '../../components/common/Spinner';
import { Alert } from '../../components/common/Alert';
import {
  LifeBuoy,
  Ticket,
  PlusCircle,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Shield,
  Inbox,
  Activity,
  Layers,
  Sparkles,
  BarChart3
} from 'lucide-react';

export function DashboardPage() {
  const { user } = useAuth();

  const [metrics, setMetrics] = useState(null);
  const [recentTickets, setRecentTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const role = user?.role || 'customer';
  const isAdmin = role === 'admin';
  const isAgent = role === 'agent';
  const isCustomer = role === 'customer';

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const [metricsRes, ticketsRes] = await Promise.all([
        dashboardApi.getMetrics(),
        ticketApi.getTickets({ limit: 5, sortBy: '-createdAt' })
      ]);

      setMetrics(metricsRes.metrics);
      setRecentTickets(ticketsRes.tickets || []);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to load dashboard metrics.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const formatDate = (isoString) => {
    if (!isoString) return '—';
    const date = new Date(isoString);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Welcome Banner */}
      <div
        className="card"
        style={{
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 27, 75, 0.8) 100%)',
          borderColor: 'rgba(99, 102, 241, 0.3)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1.25rem'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
            <span
              style={{
                textTransform: 'uppercase',
                fontWeight: 800,
                fontSize: '0.75rem',
                padding: '0.2rem 0.65rem',
                borderRadius: 'var(--radius-sm)',
                backgroundColor:
                  isAdmin
                    ? 'rgba(239, 68, 68, 0.2)'
                    : isAgent
                    ? 'rgba(99, 102, 241, 0.2)'
                    : 'rgba(52, 211, 153, 0.2)',
                color:
                  isAdmin
                    ? 'var(--danger)'
                    : isAgent
                    ? 'var(--primary)'
                    : 'var(--status-resolved-text)',
                border: '1px solid currentColor'
              }}
            >
              {role} Workspace
            </span>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Live SupportFlow Service Hub
            </span>
          </div>

          <h1 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 0.35rem' }}>
            Welcome back, {user?.name}!
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', margin: 0, maxWidth: '640px' }}>
            {isAdmin
              ? 'Complete operational oversight: monitor ticket triage, agent assignments, and customer resolutions.'
              : isAgent
              ? 'Support Queue Operator: review incoming inquiries, triage priority blockers, and progress assigned tickets.'
              : 'Support Portal: review active support requests, view engineering replies, or submit a new inquiry.'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          {(isCustomer || isAdmin) && (
            <Link to="/tickets/new" style={{ textDecoration: 'none' }}>
              <Button variant="primary" icon={PlusCircle}>
                New Ticket
              </Button>
            </Link>
          )}
          <Link to="/tickets" style={{ textDecoration: 'none' }}>
            <Button variant="secondary" icon={Ticket}>
              {isCustomer ? 'My Tickets' : 'View Queue'}
            </Button>
          </Link>
        </div>
      </div>

      {errorMsg && <Alert type="error">{errorMsg}</Alert>}

      {loading ? (
        <div className="card" style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
          <Spinner size="lg" />
        </div>
      ) : (
        <>
          {/* Metrics Grid */}
          {/* 1. ADMIN METRICS */}
          {isAdmin && metrics?.overview && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
                {/* Total */}
                <div className="card" style={{ padding: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>Total Tickets</span>
                    <Ticket size={18} color="var(--primary)" />
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: '#fff' }}>
                    {metrics.overview.total}
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>System-wide volume</span>
                </div>

                {/* Open */}
                <div className="card" style={{ padding: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>Open</span>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--status-open-text)' }} />
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--status-open-text)' }}>
                    {metrics.overview.open}
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>Awaiting action</span>
                </div>

                {/* In Progress */}
                <div className="card" style={{ padding: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>In Progress</span>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--status-progress-text)' }} />
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--status-progress-text)' }}>
                    {metrics.overview.inProgress}
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>Active investigations</span>
                </div>

                {/* Resolved */}
                <div className="card" style={{ padding: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>Resolved</span>
                    <CheckCircle2 size={18} color="var(--status-resolved-text)" />
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--status-resolved-text)' }}>
                    {metrics.overview.resolved}
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>Pending closure</span>
                </div>
              </div>

              {/* Actionable Highlights Strip for Admin */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
                <Link to="/tickets?assignedTo=unassigned" style={{ textDecoration: 'none' }}>
                  <div
                    className="card"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderColor: metrics.overview.unassigned > 0 ? 'rgba(245, 158, 11, 0.4)' : 'var(--border-subtle)',
                      background: metrics.overview.unassigned > 0 ? 'rgba(245, 158, 11, 0.04)' : 'var(--bg-card)'
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                        Unassigned Tickets
                      </div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 800, color: metrics.overview.unassigned > 0 ? 'var(--warning)' : '#fff' }}>
                        {metrics.overview.unassigned}
                      </div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>Needs agent triage</span>
                    </div>
                    <ArrowRight size={20} color="var(--text-muted)" />
                  </div>
                </Link>

                <Link to="/tickets?priority=urgent" style={{ textDecoration: 'none' }}>
                  <div
                    className="card"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderColor: metrics.overview.needsAttention > 0 ? 'rgba(239, 68, 68, 0.4)' : 'var(--border-subtle)',
                      background: metrics.overview.needsAttention > 0 ? 'rgba(239, 68, 68, 0.04)' : 'var(--bg-card)'
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                        High & Urgent Attention
                      </div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 800, color: metrics.overview.needsAttention > 0 ? 'var(--danger)' : '#fff' }}>
                        {metrics.overview.needsAttention}
                      </div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>Critical active issues</span>
                    </div>
                    <ArrowRight size={20} color="var(--text-muted)" />
                  </div>
                </Link>
              </div>
            </div>
          )}

          {/* 2. AGENT METRICS */}
          {isAgent && metrics?.assignedToMe && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
                <div className="card" style={{ padding: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>Assigned to Me</span>
                    <Shield size={18} color="var(--primary)" />
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: '#fff' }}>
                    {metrics.assignedToMe.total}
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>Your current workload</span>
                </div>

                <div className="card" style={{ padding: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>My In Progress</span>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--status-progress-text)' }} />
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--status-progress-text)' }}>
                    {metrics.assignedToMe.inProgress}
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>Under active handling</span>
                </div>

                <div className="card" style={{ padding: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>Unassigned in Queue</span>
                    <Inbox size={18} color="var(--warning)" />
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--warning)' }}>
                    {metrics.globalQueue?.unassigned || 0}
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>Available to claim</span>
                </div>

                <div className="card" style={{ padding: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>My Priority Attention</span>
                    <AlertTriangle size={18} color="var(--danger)" />
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--danger)' }}>
                    {metrics.assignedToMe.needsAttention}
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>High & Urgent priority</span>
                </div>
              </div>
            </div>
          )}

          {/* 3. CUSTOMER METRICS */}
          {isCustomer && metrics?.myTickets && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
              <div className="card" style={{ padding: '1.25rem' }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                  Total Requests
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: '#fff' }}>
                  {metrics.myTickets.total}
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>All tickets submitted</span>
              </div>

              <div className="card" style={{ padding: '1.25rem' }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                  Open Tickets
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--status-open-text)' }}>
                  {metrics.myTickets.open}
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>Awaiting review</span>
              </div>

              <div className="card" style={{ padding: '1.25rem' }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                  In Progress
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--status-progress-text)' }}>
                  {metrics.myTickets.inProgress}
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>Engineer investigating</span>
              </div>

              <div className="card" style={{ padding: '1.25rem' }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                  Resolved / Closed
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--status-resolved-text)' }}>
                  {metrics.myTickets.resolved + metrics.myTickets.closed}
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>Completed requests</span>
              </div>
            </div>
          )}

          {/* Recent Tickets Activity Section */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 0.25rem' }}>
                  Recent Tickets
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                  Latest ticket updates and activity
                </p>
              </div>

              <Link to="/tickets" style={{ textDecoration: 'none' }}>
                <Button variant="ghost" style={{ fontSize: '0.825rem' }}>
                  <span>View All</span>
                  <ArrowRight size={14} />
                </Button>
              </Link>
            </div>

            {recentTickets.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                No recent tickets found.
              </div>
            ) : (
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th style={{ width: '120px' }}>Ticket #</th>
                      <th>Title</th>
                      <th style={{ width: '130px' }}>Status</th>
                      <th style={{ width: '110px' }}>Priority</th>
                      <th style={{ width: '110px' }}>Created</th>
                      <th style={{ width: '80px', textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentTickets.map((t) => (
                      <tr key={t.id || t._id}>
                        <td>
                          <Link
                            to={`/tickets/${t.id || t._id}`}
                            style={{
                              fontFamily: 'monospace',
                              fontWeight: 700,
                              color: 'var(--primary)',
                              textDecoration: 'none'
                            }}
                          >
                            {t.ticketNumber}
                          </Link>
                        </td>
                        <td>
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
                        </td>
                        <td>
                          <StatusBadge status={t.status} />
                        </td>
                        <td>
                          <PriorityBadge priority={t.priority} />
                        </td>
                        <td style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>
                          {formatDate(t.createdAt)}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <Link to={`/tickets/${t.id || t._id}`} style={{ textDecoration: 'none' }}>
                            <Button variant="ghost" style={{ padding: '0.3rem 0.6rem', fontSize: '0.78rem' }}>
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
          </div>
        </>
      )}
    </div>
  );
}
