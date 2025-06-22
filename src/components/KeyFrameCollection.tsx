import { type FrameInfo } from './VideoPlayer'

interface Props {
  frames: FrameInfo[]
  currentVideoUrl?: string
  onFrameClick?: (frame: FrameInfo) => void
  onFrameDelete?: (frameId: string) => void
}

export default function KeyFrameCollection({ frames, currentVideoUrl, onFrameClick, onFrameDelete }: Props) {
  console.log('KeyFrameCollection render:', { 
    frameCount: frames.length, 
    currentVideoUrl,
    frameIds: frames.map(f => f.id)
  })

  if (frames.length === 0) {
    return (
      <div className="text-center text-gray-400 py-8">
        <p>No key frames captured yet</p>
        <p className="text-sm mt-2">Play a video and click "📸 Add to Collection" to capture frames</p>
      </div>
    )
  }

  // Group frames by video
  const framesByVideo = frames.reduce((acc, frame) => {
    const videoKey = frame.videoUrl
    if (!acc[videoKey]) {
      acc[videoKey] = []
    }
    acc[videoKey].push(frame)
    return acc
  }, {} as Record<string, FrameInfo[]>)

  console.log('framesByVideo:', framesByVideo)
  console.log('videoKeys:', Object.keys(framesByVideo))
  console.log('currentVideoUrl:', currentVideoUrl)

  // Sort frames within each video by timestamp
  Object.keys(framesByVideo).forEach(videoKey => {
    framesByVideo[videoKey].sort((a, b) => a.currentTime - b.currentTime)
  })

  // Get current video frames first, then other videos
  const videoKeys = Object.keys(framesByVideo)
  const sortedVideoKeys = currentVideoUrl 
    ? [
        ...videoKeys.filter(key => key === currentVideoUrl),
        ...videoKeys.filter(key => key !== currentVideoUrl)
      ]
    : videoKeys

  console.log('sortedVideoKeys:', sortedVideoKeys)

  return (
    <div className="space-y-6">
      {/* Debug Info */}
      <div className="bg-zinc-800 p-4 rounded-lg">
        <h4 className="text-white font-semibold mb-2">Debug Info</h4>
        <p className="text-gray-300 text-sm">Total Frames: {frames.length}</p>
        <p className="text-gray-300 text-sm">Current Video: {currentVideoUrl || 'None'}</p>
        <div className="text-xs text-gray-400 mt-2">
          Frame IDs: {frames.map(f => f.id.substring(6, 12)).join(', ')}
        </div>
      </div>

      {sortedVideoKeys.map((videoUrl) => {
        const videoFrames = framesByVideo[videoUrl]
        const isCurrentVideo = videoUrl === currentVideoUrl
        
        console.log('Rendering video section:', {
          videoUrl,
          frameCount: videoFrames.length,
          isCurrentVideo,
          frameIds: videoFrames.map(f => f.id)
        })
        
        return (
          <div key={videoUrl} className={`${isCurrentVideo ? 'border-2 border-blue-500 rounded-lg p-4' : ''}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-lg font-semibold ${isCurrentVideo ? 'text-blue-400' : 'text-white'} flex items-center gap-2`}>
                {isCurrentVideo && <span className="text-blue-400">▶</span>}
                {videoFrames[0].videoTitle}
                <span className="text-sm text-gray-400 font-normal">
                  ({videoFrames.length} frame{videoFrames.length !== 1 ? 's' : ''})
                </span>
              </h3>
              {isCurrentVideo && (
                <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded">
                  Currently Playing
                </span>
              )}
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              {videoFrames.map((frame) => (
                <div
                  key={frame.id}
                  className="relative group bg-zinc-800 rounded-lg overflow-hidden border border-zinc-700 hover:border-zinc-500 transition-colors cursor-pointer"
                  onClick={() => onFrameClick?.(frame)}
                >
                  <div className="aspect-video relative bg-red-200">
                    <img
                      src={frame.dataUrl}
                      alt={`Frame at ${frame.currentTime.toFixed(2)}s`}
                      className="w-full h-full object-cover border-2 border-green-500"
                      style={{ backgroundColor: 'yellow' }}
                      onLoad={(e) => {
                        console.log('Frame image loaded successfully for frame:', frame.id)
                        console.log('Image dimensions:', e.currentTarget.naturalWidth, 'x', e.currentTarget.naturalHeight)
                        console.log('Image src length:', e.currentTarget.src.length)
                      }}
                      onError={(e) => {
                        console.error('Image failed to load for frame:', frame.id)
                        console.error('DataUrl prefix:', frame.dataUrl.substring(0, 100))
                        console.error('DataUrl length:', frame.dataUrl.length)
                        
                        // Replace with a placeholder
                        const target = e.currentTarget as HTMLImageElement
                        target.style.display = 'none'
                        
                        // Create a placeholder div
                        const placeholder = document.createElement('div')
                        placeholder.className = 'w-full h-full bg-zinc-700 flex items-center justify-center text-gray-400 text-xs'
                        placeholder.innerHTML = `
                          <div class="text-center">
                            <div>🎬</div>
                            <div>Frame Error</div>
                            <div>${frame.currentTime.toFixed(1)}s</div>
                          </div>
                        `
                        target.parentNode?.appendChild(placeholder)
                      }}
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200" />
                    
                    {/* Time overlay */}
                    <div className="absolute bottom-1 left-1 bg-black bg-opacity-70 text-white text-xs px-1 py-0.5 rounded">
                      {frame.currentTime.toFixed(1)}s
                    </div>
                  </div>
                  
                  <div className="p-2">
                    <div className="text-xs text-gray-400 text-center">
                      {frame.width}×{frame.height}
                    </div>
                    <div className="text-xs text-gray-500 text-center mt-1">
                      {new Date(frame.timestamp).toLocaleTimeString()}
                    </div>
                  </div>

                  {onFrameDelete && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onFrameDelete(frame.id)
                      }}
                      className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 flex items-center justify-center"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
