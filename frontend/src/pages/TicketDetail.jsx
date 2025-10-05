import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';

const TicketDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [ticket, setTicket] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newComment, setNewComment] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  const [updateData, setUpdateData] = useState({
    status: '',
    priority: '',
    assigned_to: ''
  });
  const [updateLoading, setUpdateLoading] = useState(false);

  useEffect(() => {
    fetchTicket();
  }, [id]);

  const fetchTicket = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/tickets/${id}`);
      setTicket(response.data.ticket);
      setComments(response.data.comments);
      setUpdateData({
        status: response.data.ticket.status,
        priority: response.data.ticket.priority,
        assigned_to: response.data.ticket.assigned_to?._id || ''
      });
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to fetch ticket');
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      setCommentLoading(true);
      const response = await api.post(`/tickets/${id}/comments`, {
        text: newComment
      });
      setComments(prev => [...prev, response.data.comment]);
      setNewComment('');
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to add comment');
    } finally {
      setCommentLoading(false);
    }
  };

  const handleUpdateTicket = async (e) => {
    e.preventDefault();
    
    try {
      setUpdateLoading(true);
      const updatePayload = {
        ...updateData,
        version: ticket.version,
        assigned_to: updateData.assigned_to || null
      };
      
      const response = await api.patch(`/tickets/${id}`, updatePayload);
      setTicket(response.data.ticket);
      setError(null);
    } catch (err) {
      if (err.response?.status === 409) {
        setError('Ticket has been modified by another user. Please refresh the page.');
        fetchTicket(); // Refresh to get latest version
      } else {
        setError(err.response?.data?.error?.message || 'Failed to update ticket');
      }
    } finally {
      setUpdateLoading(false);
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

  const canUpdateTicket = user?.role === 'agent' || user?.role === 'admin';

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </div>
    );
  }

  if (error && !ticket) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-3xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="text-sm text-red-600">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-6xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Back Button */}
          <button
            onClick={() => navigate('/tickets')}
            className="mb-4 text-primary-600 hover:text-primary-500 text-sm font-medium"
          >
            ← Back to Tickets
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2">
              {/* Ticket Details */}
              <div className="bg-white shadow rounded-lg mb-6">
                <div className="px-6 py-4 border-b border-gray-200">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h1 className="text-xl font-semibold text-gray-900 mb-2">
                        {ticket?.title}
                      </h1>
                      <div className="flex space-x-2">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(ticket?.status)}`}>
                          {ticket?.status?.replace('_', ' ')}
                        </span>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(ticket?.priority)}`}>
                          {ticket?.priority}
                        </span>
                        {ticket?.is_sla_breached && (
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                            SLA Breached
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="px-6 py-4">
                  <div className="mb-4">
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Description</h3>
                    <p className="text-gray-900 whitespace-pre-wrap">{ticket?.description}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm text-gray-500">
                    <div>
                      <span className="font-medium">Created by:</span> {ticket?.created_by?.username}
                    </div>
                    <div>
                      <span className="font-medium">Created:</span> {ticket?.created_at && format(new Date(ticket.created_at), 'MMM d, yyyy HH:mm')}
                    </div>
                    <div>
                      <span className="font-medium">Assigned to:</span> {ticket?.assigned_to?.username || 'Unassigned'}
                    </div>
                    <div>
                      <span className="font-medium">Due:</span> {ticket?.due_at && format(new Date(ticket.due_at), 'MMM d, yyyy HH:mm')}
                    </div>
                  </div>
                </div>
              </div>

              {/* Comments */}
              <div className="bg-white shadow rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-medium text-gray-900">Comments</h2>
                </div>
                
                <div className="px-6 py-4 space-y-4">
                  {comments.map((comment) => (
                    <div key={comment._id} className="border-l-4 border-gray-200 pl-4">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-sm text-gray-900">
                          {comment.user_id?.username}
                        </span>
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          comment.user_id?.role === 'agent' ? 'bg-blue-100 text-blue-800' :
                          comment.user_id?.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {comment.user_id?.role}
                        </span>
                        <span className="text-xs text-gray-500">
                          {format(new Date(comment.created_at), 'MMM d, yyyy HH:mm')}
                        </span>
                      </div>
                      <p className="mt-1 text-gray-700 whitespace-pre-wrap">{comment.text}</p>
                    </div>
                  ))}
                  
                  {comments.length === 0 && (
                    <p className="text-gray-500 text-center py-4">No comments yet.</p>
                  )}
                </div>

                {/* Add Comment Form */}
                <div className="px-6 py-4 border-t border-gray-200">
                  <form onSubmit={handleAddComment}>
                    <textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Add a comment..."
                      rows={3}
                      maxLength={1000}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    />
                    <div className="mt-2 flex justify-between items-center">
                      <span className="text-sm text-gray-500">
                        {newComment.length}/1000 characters
                      </span>
                      <button
                        type="submit"
                        disabled={commentLoading || !newComment.trim()}
                        className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {commentLoading ? 'Adding...' : 'Add Comment'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            {canUpdateTicket && (
              <div className="lg:col-span-1">
                <div className="bg-white shadow rounded-lg">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-medium text-gray-900">Update Ticket</h2>
                  </div>
                  
                  <form onSubmit={handleUpdateTicket} className="px-6 py-4 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Status</label>
                      <select
                        value={updateData.status}
                        onChange={(e) => setUpdateData(prev => ({...prev, status: e.target.value}))}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                      >
                        <option value="open">Open</option>
                        <option value="in_progress">In Progress</option>
                        <option value="resolved">Resolved</option>
                        <option value="closed">Closed</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Priority</label>
                      <select
                        value={updateData.priority}
                        onChange={(e) => setUpdateData(prev => ({...prev, priority: e.target.value}))}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Assign to</label>
                      <input
                        type="text"
                        value={updateData.assigned_to}
                        onChange={(e) => setUpdateData(prev => ({...prev, assigned_to: e.target.value}))}
                        placeholder="User ID (leave empty to unassign)"
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={updateLoading}
                      className="w-full px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {updateLoading ? 'Updating...' : 'Update Ticket'}
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-md p-4">
              <div className="text-sm text-red-600">{error}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TicketDetail;