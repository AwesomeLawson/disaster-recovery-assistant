import { useEffect, useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useNavigate } from 'react-router-dom';

type UserRole = 'church' | 'individual' | null;

export function useUserRole(): {
  role: UserRole;
  loading: boolean;
  error: string | null;
} {
  const { user, isAuthenticated, isLoading, getAccessTokenSilently } = useAuth0();
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated || isLoading || !user?.sub) return;

    const fetchUserRole = async () => {
      try {
        const res = await fetch('/api/users', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: user.sub,
            email: user.email,
            name: user.name,
            // Role is omitted here — we just want to get the record if it exists
          }),
        });

        const data = await res.json();

        if (res.status === 200 || res.status === 201) {
          if (data.role) {
            setRole(data.role);
            navigate(`/dashboard/${data.role}`);
          } else {
            navigate('/choose-role'); // No role set yet
          }
        } else {
          throw new Error(data);
        }
      } catch (err: any) {
        console.error('Error checking user role:', err);
        setError(err.message || 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchUserRole();
  }, [user, isAuthenticated, isLoading, navigate]);

  return { role, loading, error };
}