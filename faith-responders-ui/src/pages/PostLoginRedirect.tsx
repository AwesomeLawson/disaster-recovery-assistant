import { useEffect, useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useNavigate } from 'react-router-dom';

export default function PostLoginRedirect() {
    const { user, isAuthenticated, isLoading } = useAuth0();
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    console.log('PostLoginRedirect mounted', {
        isAuthenticated,
        isLoading,
        user,
    });


    useEffect(() => {
        console.log("PostLoginRedirect useEffect triggered", {
            isAuthenticated,
            isLoading,
            user,
        });

        if (!isAuthenticated || isLoading || !user?.sub) return;

        console.log("Sending POST to /api/users");


        const loadUser = async () => {
            try {
                const body = JSON.stringify({
                    userId: user.sub,
                    email: user.email,
                    name: user.name,
                });
                console.log('body', body);
                const res = await fetch('http://localhost:7071/api/users', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: body,
                });

                const data = await res.json();
                console.log('data', data);
                if ((res.status === 200 || res.status === 201) && data.role) {
                    console.log('Redirecting to:', data.role ? `/dashboard/${data.role}` : '/choose-role');

                    navigate(`/dashboard/${data.role}`);
                } else {
                    console.log('Redirecting to:', data.role ? `/dashboard/${data.role}` : '/choose-role');

                    navigate('/choose-role'); // New user or missing role
                }
            } catch (err: any) {
                console.error('Error during post-login fetch:', err);
                setError(err.message || 'Unknown error');
            }
        };

        loadUser();

    }, [isAuthenticated, isLoading, user, navigate]);

    if (isLoading) return <p className="p-8">Authenticating...</p>;
    if (error) return <p className="p-8 text-red-600">Error: {error}</p>;

    return null;
}