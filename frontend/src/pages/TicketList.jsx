import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';

const TicketList = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [hasMore, setHasMore] = useState(false);
  const [nextOffset, setNextOffset] = useState(null);
  const { user } = useAuth();

  const fetchTickets = async (searchQuery = '', offset = 0, reset = false) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        limit: '10',
        offset: offset.toString(),
      });
      
      if (searchQuery) {
        params.append('q', searchQuery);
      }

      const response = await api.get(`/tickets?${params}`);
      const { items, next_offset } = response.data;

      if (reset) {
        setTickets(items);
      } else {
        setTickets(prev => [...prev, ...items]);
      }
      
      setHasMore(next_offset !== null);
      setNextOffset(next_offset);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to fetch tickets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets('', 0, true);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchTickets(search, 0, true);
  };

  const loadMore = () => {
    if (hasMore && nextOffset !== null) {
      fetchTickets(search, nextOffset, false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      open: 'bg-red-100 text-red-800',
      in_progress: 'bg-yellow-100 text-yellow-800',
      resolved: 'bg-green-100 text-green-800',
      closed: 'bg-gray-100 text-gray-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityColor = (priority) => {
    const colors = {
      low: 'bg-blue-100 text-blue-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-orange-100 text-orange-800',
      urgent: 'bg-red-100 text-red-800'
    };
    return colors[priority] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Support Tickets</h1>
            <Link
              to="/tickets/new"
              className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              New Ticket
            </Link>
          </div>

          {/* Search */}
          <div className="mb-6">
            <form onSubmit={handleSearch} className="flex gap-2">
              <input
                type="text"
                placeholder="Search tickets..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
              >
                Search
              </button>
            </form>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-4">
              <div className="text-sm text-red-600">{error}</div>
            </div>
          )}

          {/* Tickets List */}
          {loading && tickets.length === 0 ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : (
            <>
              <div className="bg-white shadow overflow-hidden sm:rounded-md">
                <ul className="divide-y divide-gray-200">
                  {tickets.map((ticket) => (
                    <li key={ticket._id}>
                      <Link
                        to={`/tickets/${ticket._id}`}
                        className="block hover:bg-gray-50 px-4 py-4 sm:px-6"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium text-primary-600 truncate">
                                {ticket.title}
                              </p>
                              <div className="flex space-x-2 ml-2">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(ticket.priority)}`}>
                                  {ticket.priority}
                                </span>
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(ticket.status)}`}>
                                  {ticket.status.replace('_', ' ')}
                                </span>
                                {ticket.is_sla_breached && (
                                  <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                                    SLA Breached
                                  </span>
                                )}
                              </div>
                            </div>
                            <p className="mt-1 text-sm text-gray-500 truncate">
                              {ticket.description}
                            </p>
                            <div className="mt-2 flex items-center text-xs text-gray-500">
                              <span>
                                Created by {ticket.created_by?.username} on{' '}
                                {format(new Date(ticket.created_at), 'MMM d, yyyy')}
                              </span>
                              {ticket.assigned_to && (
                                <span className="ml-4">
                                  Assigned to {ticket.assigned_to.username}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Load More Button */}
              {hasMore && (
                <div className="mt-6 text-center">
                  <button
                    onClick={loadMore}
                    disabled={loading}
                    className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2 rounded-md text-sm font-medium disabled:opacity-50"
                  >
                    {loading ? 'Loading...' : 'Load More'}
                  </button>
                </div>
              )}

              {/* No Tickets Message */}
              {tickets.length === 0 && !loading && (
                <div className="text-center py-8">
                  <p className="text-gray-500">No tickets found.</p>
                  <Link
                    to="/tickets/new"
                    className="mt-2 inline-block text-primary-600 hover:text-primary-500"
                  >
                    Create your first ticket
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default TicketList;