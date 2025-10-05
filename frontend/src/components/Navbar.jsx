import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getRoleColor = (role) => {
    const colors = {
      user: 'bg-green-100 text-green-800',
      agent: 'bg-blue-100 text-blue-800',
      admin: 'bg-purple-100 text-purple-800'
    };
    return colors[role] || 'bg-gray-100 text-gray-800';
  };

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/tickets" className="flex-shrink-0">
              <h1 className="text-xl font-bold text-primary-600">HelpDesk Mini</h1>
            </Link>
            <div className="hidden md:ml-8 md:flex md:space-x-8">
              <Link
                to="/tickets"
                className="text-gray-500 hover:text-gray-700 px-3 py-2 text-sm font-medium"
              >
                Tickets
              </Link>
              <Link
                to="/tickets/new"
                className="text-gray-500 hover:text-gray-700 px-3 py-2 text-sm font-medium"
              >
                New Ticket
              </Link>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-700">
                {user?.username}
              </span>
              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(user?.role)}`}>
                {user?.role}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;