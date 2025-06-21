import { useState, useEffect } from 'react'
import { S3Client, ListObjectsCommand, type ListObjectsCommandInput} from "@aws-sdk/client-s3";
import './App.css'
import FileCard from './components/FileCard';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import SettingsModal from './components/SettingsModal';

function App() {
  const [search, setSearch] = useState("")
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [item, setItem] = useState<any>(null);
  
  // Load settings from localStorage
  const getStoredSettings = () => {
    const storedSettings = localStorage.getItem('s3Settings');
    return storedSettings ? JSON.parse(storedSettings) : {
      bucket: '',
      accessKeyId: '',
      secretAccessKey: ''
    };
  };

  const [settings, setSettings] = useState(getStoredSettings());
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [settingsConfigured, setSettingsConfigured] = useState(false);
  
  const [items, setItems] = useState<any[]>([]);
  const [client, setClient] = useState<S3Client | null>(null);

  // Check if settings are configured
  useEffect(() => {
    const { bucket, accessKeyId, secretAccessKey } = settings;
    const configured = !!bucket && !!accessKeyId && !!secretAccessKey;
    
    setSettingsConfigured(configured);
    
    if (configured) {
      // Initialize S3 client when settings are available
      setClient(new S3Client({
        region: "eu-west-1",
        credentials: {
          accessKeyId,
          secretAccessKey
        }
      }));
    } else {
      // Open settings modal if not configured
      setIsSettingsModalOpen(true);
    }
  }, [settings]);

  // Save settings to localStorage
  const saveSettings = (newSettings: { bucket: string; accessKeyId: string; secretAccessKey: string }) => {
    localStorage.setItem('s3Settings', JSON.stringify(newSettings));
    setSettings(newSettings);
    setIsSettingsModalOpen(false);
  };

  const ListBuckets = async () => {
    if (!client || !settingsConfigured) {
      setIsSettingsModalOpen(true);
      return;
    }

    try {
      const input = {
        Bucket: settings.bucket,
        prefix: search,
      } as ListObjectsCommandInput;

      const data = await client.send(new ListObjectsCommand(input));
      console.log("Success", data.Contents);

      const filteredItems = await Promise.all(
        (data.Contents || []).filter(item =>
          (item.Key ?? '').toLowerCase().includes(search.toLowerCase())
        ).map(async item => {
          const signedUrl = await getSignedUrl(client, new GetObjectCommand({
            Bucket: settings.bucket,
            Key: item.Key
          }), { expiresIn: 3600 });
          return { ...item, signedUrl };
        })
      );

      setItems(filteredItems);
    } catch (err) {
      console.log("Error", err);
    }
  }

  const handleVideoPlay = (url: string, item: any) => {
    setVideoUrl(url);
    setItem(item);
  };

  return (
    <div className="min-h-screen flex flex-row">
      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => settingsConfigured && setIsSettingsModalOpen(false)}
        onSave={saveSettings}
        initialSettings={settings}
      />

      <div className={`flex flex-col items-center justify-start ${videoUrl ? 'w-1/2' : 'w-full'}`}>
        <div className="flex items-center mt-8 gap-4">
          <p className="text-white text-2xl font-semibold">Spilarinn</p>
          <button
            onClick={() => setIsSettingsModalOpen(true)}
            className="px-3 py-1 rounded-md bg-zinc-700 text-gray-300 text-sm hover:bg-zinc-600 transition-colors"
          >
            Settings
          </button>
        </div>
        
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search for a file"
          className="my-4 px-3 py-2 rounded-md border border-zinc-700 bg-zinc-800 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-80"
        />
        <button
          onClick={ListBuckets}
          className="mb-8 px-6 py-2 rounded-md bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
        >
          List Items
        </button>
        <ul className="flex flex-col items-stretch p-0">
          {items.map((item, index) => (
            <li key={index} className="w-full list-none">
              <FileCard file={item} bucket={settings.bucket} onVideoPlay={handleVideoPlay} />
            </li>
          ))}
        </ul>
      </div>
      {videoUrl && (
        <div className="w-1/2 bg-zinc-800 flex flex-col items-center justify-start p-4 m-4 rounded-lg shadow-lg border border-gray-700 relative">
          <button
            onClick={() => setVideoUrl(null)}
            className="absolute top-2 right-2 text-gray-400 hover:text-gray-200 text-xl font-bold"
            aria-label="Close video player"
          >
            ×
          </button>
          <video
            src={videoUrl}
            controls
            autoPlay
            className="w-full h-72 rounded-lg mb-4"
          >
            Your browser does not support the video tag.
          </video>
          <div className="text-gray-300 text-sm text-left w-full">
            <p className="mb-2 font-semibold">Bucket: <span className="font-normal">{settings.bucket}</span></p>
            <p className="mb-2 font-semibold">Key: <span className="font-normal break-all">{item?.Key}</span></p>
            {item?.LastModified && (
              <p className="mb-2 font-semibold">Last Modified: <span className="font-normal">{new Date(item.LastModified).toLocaleString()}</span></p>
            )}
            {item?.Size && (
              <p className="mb-2 font-semibold">Size: <span className="font-normal">{(item.Size / (1024 * 1024)).toFixed(2)} MB</span></p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default App
