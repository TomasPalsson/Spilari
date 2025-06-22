import { useState, useEffect } from 'react'
import { S3Client, ListObjectsCommand, type ListObjectsCommandInput } from "@aws-sdk/client-s3"
import './App.css'
import FileCard from './components/FileCard'
import SettingsModal from './components/SettingsModal'
import VideoPlayer, { type StreamMeta, type BandwidthSample } from './components/VideoPlayer'
import BandwidthChart from './components/BandwidthChart'

function App() {
  const [search, setSearch] = useState("")
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [meta, setMeta] = useState<StreamMeta | null>(null)
  const [samples, setSamples] = useState<BandwidthSample[]>([])

  // Load settings from localStorage
  const getStoredSettings = () => {
    const storedSettings = localStorage.getItem('s3Settings')
    return storedSettings ? JSON.parse(storedSettings) : {
      bucket: '',
      accessKeyId: '',
      secretAccessKey: ''
    }
  }

  const [settings, setSettings] = useState(getStoredSettings())
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false)
  const [settingsConfigured, setSettingsConfigured] = useState(false)

  const [items, setItems] = useState<any[]>([])
  const [client, setClient] = useState<S3Client | null>(null)

  // Check if settings are configured
  useEffect(() => {
    const { bucket, accessKeyId, secretAccessKey } = settings
    const configured = !!bucket && !!accessKeyId && !!secretAccessKey

    setSettingsConfigured(configured)

    if (configured) {
      setClient(new S3Client({
        region: "eu-west-1",
        credentials: { accessKeyId, secretAccessKey }
      }))
    } else {
      setIsSettingsModalOpen(true)
    }
  }, [settings])

  // Save settings to localStorage
  const saveSettings = (newSettings: { bucket: string; accessKeyId: string; secretAccessKey: string }) => {
    localStorage.setItem('s3Settings', JSON.stringify(newSettings))
    setSettings(newSettings)
    setIsSettingsModalOpen(false)
  }

  const ListBuckets = async () => {
    if (!client || !settingsConfigured) {
      setIsSettingsModalOpen(true)
      return
    }

    try {
      const input = {
        Bucket: settings.bucket,
        prefix: search,
      } as ListObjectsCommandInput

      const data = await client.send(new ListObjectsCommand(input))
      const filteredItems = (data.Contents || [])
        .filter(item =>
          (item.Key ?? '').toLowerCase().includes('master') &&
          (item.Key ?? '').toLowerCase().includes(search.toLowerCase())
        )
        .map(item => ({
          ...item,
          publicUrl: `https://${settings.bucket}.s3.eu-west-1.amazonaws.com/${item.Key}`
        }))

      setItems(filteredItems)
    } catch (err) {
      console.error(err)
    }
  }

  const handleVideoPlay = (url: string) => {
    setVideoUrl(url)
    setMeta(null)
    setSamples([])
  }

  return (
    <div className="min-h-screen flex flex-row">
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
        <>
          <div className="w-1/2 bg-zinc-900 flex flex-col items-start justify-start p-6 m-4 rounded-lg shadow-xl border border-gray-700 relative">
            <button
              onClick={() => setVideoUrl(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-200 text-2xl font-bold"
              aria-label="Close video player"
            >
              ×
            </button>

            <VideoPlayer
              src={videoUrl}
              onMeta={setMeta}
              onMetrics={setSamples} />

            {meta && (
              <div className="mt-6 w-full text-gray-300">
                <h3 className="text-xl font-semibold mb-4">Stream Metadata</h3>
                <p><strong>Duration:</strong> {meta.duration.toFixed(1)} s</p>
                <p><strong>Audio Codec:</strong> {meta.audioCodec}</p>
                <p><strong>Video Codec:</strong> {meta.videoCodec}</p>
                <p><strong>Total Renditions:</strong> {meta.levelCount}</p>
              </div>
            )}

            <div className="mt-6 w-full text-gray-300">
              <h3 className="text-xl font-semibold mb-4">Bandwidth Samples</h3>
              <p><strong>Samples Collected:</strong> {samples.length}</p>
              <p><strong>Average Bandwidth:</strong> {samples.reduce((acc, s) => acc + s.kbps, 0) / samples.length || 0} kbps</p>
              <p><strong>Last Sample:</strong> {samples.length > 0 ? new Date(samples[samples.length - 1].time).toLocaleTimeString() : 'N/A'}</p>
              <p><strong>Total Duration:</strong> {samples.length > 0 ? ((samples[samples.length - 1].time - samples[0].time) / 1000).toFixed(1) : 'N/A'} seconds</p>
              {samples.length > 0 && <BandwidthChart data={samples} />}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default App
