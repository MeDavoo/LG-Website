import { useState, useEffect } from 'react';

interface AdminPasswordModalProps {
  isOpen: boolean;
  onSubmit: (password: string) => boolean | void;
  onCancel: () => void;
}

export function AdminPasswordModal({ isOpen, onSubmit, onCancel }: AdminPasswordModalProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setError('');
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError('Password is required');
      return;
    }
    const result = onSubmit(password);
    // If onSubmit returns false, it means the password was incorrect
    if (result === false) {
      setError('Incorrect password');
    }
  };

  const handleCancel = () => {
    setPassword('');
    setError('');
    onCancel();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-96 mx-4 animate-slide-in">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">🔒</div>
          <h2 className="text-white text-xl font-bold">Admin Access Required</h2>
          <p className="text-gray-300 text-sm mt-2">Enter admin password to continue</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError('');
              }}
              placeholder="Enter admin password"
              className="w-full px-4 py-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
              autoFocus
            />
            {error && (
              <p className="text-red-400 text-sm mt-2">{error}</p>
            )}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleCancel}
              className="flex-1 px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-semibold"
            >
              Verify
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}