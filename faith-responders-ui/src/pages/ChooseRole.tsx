import { useAuth0 } from '@auth0/auth0-react';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

export default function ChooseRole() {
  const { user, isAuthenticated } = useAuth0();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSelect = async (role: 'individual' | 'church') => {
    if (!user?.sub || !isAuthenticated) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('http://localhost:7071/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.sub,
          email: user.email,
          name: user.name,
          role,
        }),
      });
      
    if (res.ok) {
        navigate(`/dashboard/${role}`);
    } else {
        const msg = await res.text();
        setError(`Server error: ${msg}`);
    }
      
    } catch (err: any) {
      setError(err.message || 'Failed to save role');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-8 text-center">
      <h2 className="text-2xl font-bold mb-6">Tell us who you are</h2>
      <p className="text-gray-600 mb-8">So we can send you to the right place.</p>

      <div className="flex flex-col sm:flex-row justify-center gap-6">
        <button
          onClick={() => handleSelect('individual')}
          disabled={loading}
          className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-md text-lg shadow"
        >
          I'm an individual volunteer
        </button>
        <br/>
        <button
          onClick={() => handleSelect('church')}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-md text-lg shadow"
        >
          I'm organizating voluneers for a church
        </button>
      </div>

      {error && <p className="text-red-600 mt-6">{error}</p>}
    </div>
  );
}