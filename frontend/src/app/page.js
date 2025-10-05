'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { storage } from '../utils/storage';

export default function Home() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const router = useRouter();

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === 'text/csv') {
      setFile(selectedFile);
      setError(null);
    } else {
      setError('Only CSV files are supported.');
      setFile(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setProgress(0);

    try {
      await storage.init();
      const chunkSize = 1024 * 1024 * 10; // 10MB
      const chunks = [];
      let offset = 0;

      while (offset < file.size) {
        const chunk = file.slice(offset, offset + chunkSize);
        const text = await chunk.text();
        chunks.push(text);
        offset += chunkSize;
        setProgress(Math.min(90, (offset / file.size) * 90));
      }

      // Store the file object in IndexedDB for later use
      await storage.saveData('csvData', 'originalFile', file);

      await storage.saveData('csvData', 'metadata', {
        fileName: file.name,
        fileSize: file.size,
        chunksCount: chunks.length,
      });

      for (let i = 0; i < chunks.length; i++) {
        await storage.saveData('csvData', `chunk_${i}`, chunks[i]);
      }

      setProgress(100);
      setTimeout(() => router.push('/editor'), 700);
    } catch (err) {
      console.error(err);
      setError('Something went wrong while uploading. Try again.');
      setUploading(false);
      setProgress(0);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center px-6 overflow-hidden bg-gradient-to-br from-black via-[#0b0217] to-black text-white">
      {/* background glowing blobs */}
      <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-purple-600/30 blur-[180px] animate-pulse" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-fuchsia-600/20 blur-[150px] animate-pulse delay-700" />

      <div className="relative w-full max-w-2xl rounded-2xl bg-gradient-to-br from-[#1a1a2e] via-[#13111c] to-[#0d0b13] p-10 shadow-2xl border border-white/10 backdrop-blur-xl">
        <h1 className="text-4xl font-bold text-center bg-gradient-to-r from-purple-400 to-fuchsia-600 bg-clip-text text-transparent">
          Upload Your CSV
        </h1>
        <p className="text-center text-gray-400 mt-3 mb-8">
          Securely upload and process large CSV files. We'll split it into chunks for smooth editing.
        </p>

        {error && (
          <div className="mb-6 p-3 rounded-lg bg-red-900/40 border border-red-500/40 text-red-300 text-sm">
            {error}
          </div>
        )}

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Select CSV File
          </label>
          <input
            type="file"
            accept=".csv"
            onChange={handleFileSelect}
            disabled={uploading}
            className="w-full cursor-pointer rounded-lg border border-purple-500/40 bg-purple-500/40 p-3 text-sm text-gray-300 shadow-inner focus:outline-none focus:ring-2 focus:ring-purple-600 transition"
          />
        </div>

        {file && (
          <div className="mb-6 rounded-lg border border-purple-600/30 bg-black/40 p-4">
            <p className="text-xs text-gray-400">Selected file:</p>
            <p className="font-semibold text-purple-300">{file.name}</p>
            <p className="text-xs text-gray-500">
              Size: {(file.size / 1024 / 1024).toFixed(2)} MB
            </p>
          </div>
        )}

        {uploading && (
          <div className="mb-6">
            <div className="flex items-center justify-between text-sm text-gray-400 mb-2">
              <span>Processing...</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-gray-800 overflow-hidden">
              <div
                className="h-2 bg-gradient-to-r from-purple-500 to-fuchsia-500 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        <button
          onClick={handleUpload}
          disabled={!file || uploading}
          className={`w-full py-3 px-6 rounded-xl font-semibold transition-all duration-300 shadow-lg ${file && !uploading
            ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white hover:from-purple-500 hover:to-fuchsia-500 focus:ring-2 focus:ring-purple-500'
            : 'bg-gray-700 text-gray-500 cursor-not-allowed'
            }`}
        >
          {uploading ? 'Processing...' : 'Upload and Continue'}
        </button>
      </div>
    </div>
  );
}
