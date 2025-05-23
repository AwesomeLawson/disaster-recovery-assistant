import { Link, Outlet } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';

export default function Layout() {
    const { loginWithRedirect, logout, isAuthenticated, user, isLoading } = useAuth0();

    return (
        <div className="min-h-screen flex flex-col bg-gray-50 text-gray-900">
            {/* Header */}
            <header className="bg-white shadow w-full">
                <div className="w-full px-8 py-4 flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-blue-700">Faith Responders</h1>
                    <div>
                        {isLoading ? (
                            <span className="text-gray-500">Loading...</span>
                        ) : isAuthenticated ? (
                            <div className="flex items-center gap-4">
                                <span className="text-sm text-gray-700">Welcome, {user?.name}</span>
                                <button
                                    onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
                                    className="text-red-600 hover:text-red-800 text-sm"
                                >
                                    Log out
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() =>
                                    loginWithRedirect({
                                        appState: { returnTo: 'post-login' }
                                    })
                                }
                                className="text-blue-600 hover:text-blue-800 font-medium"
                            >
                                Login
                            </button>
                        )}
                    </div>
                </div>
            </header>

            {/* Main */}
            <main className="flex-grow w-full">
                <Outlet />
            </main>

            {/* Footer */}
            <footer className="bg-white w-full text-center text-sm text-gray-500 py-6">
                &copy; {new Date().getFullYear()} Faith Responders. All rights reserved.
            </footer>
        </div>
    );
}
