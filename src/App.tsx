import { useState, useEffect } from 'react'
import { S3Client, ListObjectsCommand, type ListObjectsCommandInput } from "@aws-sdk/client-s3"
import { AiOutlineMacCommand } from 'react-icons/ai'
import './App.css'
import FileCard from './components/FileCard'
import SettingsModal from './components/SettingsModal'
import VideoPlayer, { type StreamMeta, type BandwidthSample, type FrameInfo } from './components/VideoPlayer'
import BandwidthChart from './components/BandwidthChart'

function App() {
  const [search, setSearch] = useState("")
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [videoTitle, setVideoTitle] = useState<string>("")
  const [meta, setMeta] = useState<StreamMeta | null>(null)
  const [samples, setSamples] = useState<BandwidthSample[]>([])
  const [keyFrames, setKeyFrames] = useState<FrameInfo[]>([])
  const [activeTab, setActiveTab] = useState<'videos' | 'player'>('videos')

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
  const [allItems, setAllItems] = useState<any[]>([]) // Store all items
  const [client, setClient] = useState<S3Client | null>(null)

  // Keyboard event handler for Command+K
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check for Command+K (Mac) or Ctrl+K (Windows/Linux)
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        
        // Only trigger if we're on the player tab and have a video
        if (activeTab === 'player' && videoUrl) {
          // Trigger frame capture by calling the exposed function
          const captureFrame = (window as any).captureFrame
          if (typeof captureFrame === 'function') {
            const frame = captureFrame()
            if (frame) {
              handleFrameCapture(frame)
            }
          }
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [activeTab, videoUrl])

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

  // Auto-load videos when client is ready
  useEffect(() => {
    if (client && settingsConfigured) {
      ListBuckets()
    }
  }, [client, settingsConfigured])

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
      } as ListObjectsCommandInput

      const data = await client.send(new ListObjectsCommand(input))
      const allMasterFiles = (data.Contents || [])
        .filter(item =>
          (item.Key ?? '').toLowerCase().includes('master')
        )
        .map(item => ({
          ...item,
          publicUrl: `https://${settings.bucket}.s3.eu-west-1.amazonaws.com/${item.Key}`
        }))

      setAllItems(allMasterFiles)
      setItems(allMasterFiles) // Initially show all items
    } catch (err) {
      console.error(err)
    }
  }

  // Filter items based on search
  const filterItems = (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setItems(allItems)
    } else {
      const filtered = allItems.filter(item =>
        (item.Key ?? '').toLowerCase().includes(searchTerm.toLowerCase())
      )
      setItems(filtered)
    }
  }

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearch(value)
    filterItems(value)
  }

  const handleVideoPlay = (url: string) => {
    setVideoUrl(url)
    setVideoTitle(url.split('/').pop()?.replace('.m3u8', '') || 'Unknown Video')
    setMeta(null)
    setSamples([])
    setActiveTab('player')
  }

  const handleFrameCapture = (frame: FrameInfo) => {
    setKeyFrames(prev => [frame, ...prev])
  }

  const handleFrameDelete = (frameId: string) => {
    setKeyFrames(prev => prev.filter(f => f.id !== frameId))
  }

  return (
    <div className="min-h-screen flex flex-col">
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => settingsConfigured && setIsSettingsModalOpen(false)}
        onSave={saveSettings}
        initialSettings={settings}
      />

      {/* Header */}
      <div className="bg-zinc-800 border-b border-zinc-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <p className="text-white text-2xl font-semibold">Spilarinn</p>
            <button
              onClick={() => setIsSettingsModalOpen(true)}
              className="px-3 py-1 rounded-md bg-zinc-700 text-gray-300 text-sm hover:bg-zinc-600 transition-colors"
            >
              Settings
            </button>
          </div>
          
          {/* Tab Navigation */}
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('videos')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'videos'
                  ? 'bg-blue-600 text-white'
                  : 'bg-zinc-700 text-gray-300 hover:bg-zinc-600'
              }`}
            >
              Videos ({items.length})
            </button>
            {videoUrl && (
              <button
                onClick={() => setActiveTab('player')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === 'player'
                    ? 'bg-blue-600 text-white'
                    : 'bg-zinc-700 text-gray-300 hover:bg-zinc-600'
                }`}
              >
                Player ({keyFrames.filter(f => f.videoUrl === videoUrl).length} frames)
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1">
        {/* Videos Section */}
        {activeTab === 'videos' && (
          <div className="flex flex-col items-center justify-start p-6">
            <input
              type="text"
              value={search}
              onChange={handleSearchChange}
              placeholder="Search for a file"
              className="my-4 px-3 py-2 rounded-md border border-zinc-700 bg-zinc-800 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-80"
            />
            <button
              onClick={ListBuckets}
              className="mb-8 px-6 py-2 rounded-md bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
            >
              List Items
            </button>
            <ul className="flex flex-col items-stretch p-0 w-full max-w-4xl">
              {items.map((item, index) => (
                <li key={index} className="w-full list-none">
                  <FileCard file={item} bucket={settings.bucket} onVideoPlay={handleVideoPlay} />
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Player Section */}
        {activeTab === 'player' && videoUrl && (
          <div className="p-6">
            <div className="max-w-7xl mx-auto">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Video Player */}
                <div className="space-y-6">
                  <VideoPlayer
                    src={videoUrl}
                    videoTitle={videoTitle}
                    onMeta={setMeta}
                    onMetrics={setSamples}
                    onFrameCapture={handleFrameCapture}
                  />

                  {keyFrames.filter(f => f.videoUrl === videoUrl).length > 0 && (
                    <div className="bg-zinc-900 p-6 rounded-lg border border-zinc-700 shadow-xl">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                          🎬 Key Frames
                          <span className="text-lg text-gray-400">
                            ({keyFrames.filter(f => f.videoUrl === videoUrl).length})
                          </span>
                        </h3>
                        <div className="text-sm text-gray-300 bg-zinc-800 px-3 py-1 rounded-full">
                          Click to jump to time
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {keyFrames
                          .filter(f => f.videoUrl === videoUrl)
                          .sort((a, b) => a.currentTime - b.currentTime)
                          .map((frame) => (
                            <div
                              key={frame.id}
                              className="relative group cursor-pointer rounded-lg overflow-hidden border border-zinc-600 hover:border-zinc-400 transition-all duration-200 hover:scale-105 shadow-lg bg-zinc-800"
                              onClick={() => {
                                // Jump to this time in the video
                                const video = document.querySelector('video') as HTMLVideoElement
                                if (video) {
                                  video.currentTime = frame.currentTime
                                }
                              }}
                            >
                              <div className="aspect-video relative">
                                <img
                                  src={frame.dataUrl}
                                  alt={`Frame at ${frame.currentTime.toFixed(1)}s`}
                                  className="w-full h-full object-cover"
                                />
                                <div className="absolute bottom-2 left-2 right-2 text-center">
                                  <div className="text-sm font-bold text-white bg-black bg-opacity-80 rounded px-2 py-1">
                                    {frame.currentTime.toFixed(1)}s
                                  </div>
                                </div>
                                <div className="absolute top-2 right-2">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleFrameDelete(frame.id)
                                    }}
                                    className="w-6 h-6 bg-red-500 text-white rounded-full text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 flex items-center justify-center"
                                  >
                                    ×
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))
                        }
                      </div>
                    </div>
                  )}
                </div>

                {/* Metadata and Charts */}
                <div className="space-y-6">
                  {meta && (
                    <div className="bg-zinc-900 p-6 rounded-lg border border-gray-700">
                      <h3 className="text-xl font-semibold mb-4 text-white">Stream Metadata</h3>
                      <div className="space-y-2 text-gray-300">
                        <p><strong>Duration:</strong> {Math.floor(meta.duration / 60)} min {Math.round(meta.duration % 60)} sec</p>
                        <p><strong>Audio Codec:</strong> {meta.audioCodec}</p>
                        <p><strong>Video Codec:</strong> {meta.videoCodec}</p>
                        <p><strong>Total Renditions:</strong> {meta.levelCount}</p>
                        <p><strong>Resolution:</strong> {meta.levels[0].height}p</p>
                        <p><strong>Bitrate:</strong> {meta.levels[0].bitrate} bps</p>
                      </div>
                    </div>
                  )}

                  <div className="bg-zinc-900 p-6 rounded-lg border border-gray-700">
                    <h3 className="text-xl font-semibold mb-4 text-white">Bandwidth Samples</h3>
                    <div className="space-y-2 text-gray-300">
                      <p><strong>Samples Collected:</strong> {samples.length}</p>
                      <p><strong>Average Bandwidth:</strong> {samples.length > 0 ? (samples.reduce((acc, s) => acc + s.kbps, 0) / samples.length).toFixed(2) : '0'} kbps</p>
                      <p><strong>Last Sample:</strong> {samples.length > 0 ? new Date(samples[samples.length - 1].time).toLocaleTimeString() : 'N/A'}</p>
                      <p><strong>Total Duration:</strong> {samples.length > 0 ? ((samples[samples.length - 1].time - samples[0].time) / 1000).toFixed(1) : 'N/A'} seconds</p>
                    </div>
                    {samples.length > 0 && (
                      <div className="mt-4">
                        <BandwidthChart data={samples} />
                      </div>
                    )}
                  </div>

                  {/* All Key Frames from All Videos */}
                  {keyFrames.length > 0 && (
                    <div className="bg-zinc-900 p-6 rounded-lg border border-gray-700">
                      <h3 className="text-xl font-semibold mb-4 text-white flex items-center gap-2">
                         All Captured Frames
                        <span className="text-sm text-gray-400 font-normal">({keyFrames.length} total)</span>
                      </h3>
                      <div className="space-y-4 max-h-96 overflow-y-auto">
                        {Object.entries(
                          keyFrames.reduce((acc, frame) => {
                            if (!acc[frame.videoTitle]) acc[frame.videoTitle] = []
                            acc[frame.videoTitle].push(frame)
                            return acc
                          }, {} as Record<string, FrameInfo[]>)
                        ).map(([videoTitle, frames]) => (
                          <div key={videoTitle} className="border-l-2 border-gray-600 pl-4">
                            <h4 className="text-sm font-semibold text-gray-300 mb-2 flex items-center gap-2">
                              {videoTitle === videoTitle ? '▶' : '📽️'} {videoTitle}
                              <span className="text-xs text-gray-500">({frames.length})</span>
                            </h4>
                            <div className="grid grid-cols-6 gap-2">
                              {frames
                                .sort((a, b) => a.currentTime - b.currentTime)
                                .map((frame) => (
                                  <div
                                    key={frame.id}
                                    className="relative group cursor-pointer rounded overflow-hidden border border-zinc-600 hover:border-zinc-400 transition-colors"
                                    onClick={() => {
                                      if (frame.videoUrl !== videoUrl) {
                                        setVideoUrl(frame.videoUrl)
                                        setVideoTitle(frame.videoTitle)
                                      }
                                      setTimeout(() => {
                                        const video = document.querySelector('video') as HTMLVideoElement
                                        if (video) {
                                          video.currentTime = frame.currentTime
                                        }
                                      }, 100)
                                    }}
                                  >
                                    <div className="aspect-video">
                                      <img
                                        src={frame.dataUrl}
                                        alt={`${frame.currentTime.toFixed(1)}s`}
                                        className="w-full h-full object-cover"
                                      />
                                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-1">
                                        <div className="text-xs text-white text-center">
                                          {frame.currentTime.toFixed(1)}s
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))
                              }
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
