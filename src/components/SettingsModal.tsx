import React, { useState } from 'react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (settings: { bucket: string; accessKeyId: string; secretAccessKey: string }) => void;
  initialSettings: {
    bucket: string;
    accessKeyId: string;
    secretAccessKey: string;
  };
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onSave, initialSettings }) => {
  const [bucket, setBucket] = useState(initialSettings.bucket);
  const [accessKeyId, setAccessKeyId] = useState(initialSettings.accessKeyId);
  const [secretAccessKey, setSecretAccessKey] = useState(initialSettings.secretAccessKey);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSave = () => {
    if (!bucket.trim()) {
      setError('Bucket name is required');
      return;
    }
    if (!accessKeyId.trim()) {
      setError('Access Key ID is required');
      return;
    }
    if (!secretAccessKey.trim()) {
      setError('Secret Access Key is required');
      return;
    }

    onSave({ bucket, accessKeyId, secretAccessKey });
    setError('');
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-zinc-800 rounded-lg shadow-xl p-6 w-96 border border-zinc-700">
        <h2 className="text-xl font-bold text-white mb-4">S3 Settings</h2>
        <p className="text-gray-400 mb-4">
          Please enter your S3 bucket name and access credentials to continue.
        </p>
        
        {error && (
          <div className="bg-red-900 text-white p-3 rounded-md mb-4">
            {error}
          </div>
        )}

        <div className="mb-4">
          <label htmlFor="bucket" className="block text-gray-300 mb-1">
            S3 Bucket Name
          </label>
          <input
            id="bucket"
            type="text"
            value={bucket}
            onChange={(e) => setBucket(e.target.value)}
            className="w-full px-3 py-2 rounded-md border border-zinc-700 bg-zinc-900 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="your-bucket-name"
          />
        </div>

        <div className="mb-4">
          <label htmlFor="accessKeyId" className="block text-gray-300 mb-1">
            Access Key ID
          </label>
          <input
            id="accessKeyId"
            type="text"
            value={accessKeyId}
            onChange={(e) => setAccessKeyId(e.target.value)}
            className="w-full px-3 py-2 rounded-md border border-zinc-700 bg-zinc-900 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="AKIAXXXXXXXXXXXXXXXX"
          />
        </div>

        <div className="mb-6">
          <label htmlFor="secretAccessKey" className="block text-gray-300 mb-1">
            Secret Access Key
          </label>
          <input
            id="secretAccessKey"
            type="password"
            value={secretAccessKey}
            onChange={(e) => setSecretAccessKey(e.target.value)}
            className="w-full px-3 py-2 rounded-md border border-zinc-700 bg-zinc-900 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="••••••••••••••••••••••••"
          />
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md text-gray-300 hover:bg-zinc-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 rounded-md bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
