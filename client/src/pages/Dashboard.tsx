import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AdminDashboard } from './AdminDashboard';
import { AssessorDashboard } from './AssessorDashboard';
import { WorkGroupLeadDashboard } from './WorkGroupLeadDashboard';
import { WorkerDashboard } from './WorkerDashboard';
import { LoadingSpinner } from '../components/LoadingSpinner';

export const Dashboard: React.FC = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      // Redirect to sign legal release if not signed
      if (!user.legalReleaseSigned) {
        navigate('/sign-legal-release');
      }
    }
  }, [user, loading, navigate]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return null;
  }

  // Show dashboard based on primary role
  if (user.roles.includes('administrator')) {
    return <AdminDashboard />;
  } else if (user.roles.includes('assessor')) {
    return <AssessorDashboard />;
  } else if (user.roles.includes('workGroupLead')) {
    return <WorkGroupLeadDashboard />;
  } else if (user.roles.includes('worker')) {
    return <WorkerDashboard />;
  }

  return (
    <div>
      <h1>Dashboard</h1>
      <p>Welcome! Your account is being set up.</p>
    </div>
  );
};
