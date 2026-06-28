import Link from 'next/link';

export default function Unauthorized() {
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <div className="bg-white p-8 rounded-lg shadow-md text-center max-w-md w-full">
        <div className="text-6xl mb-4">🔒</div>
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Access Denied</h1>
        <p className="text-gray-600 mb-6">
          You don't have permission to access this page. Please contact support if you believe this is an error.
        </p>
        <Link 
          href="/" 
          className="inline-block bg-black text-white px-6 py-2 rounded-lg hover:bg-black/80 transition-colors"
        >
          Return to Home
        </Link>
      </div>
    </div>
  );
}
