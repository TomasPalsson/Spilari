// components/VideoPlayer.tsx
import { useEffect, useRef } from 'react'
import Hls from 'hls.js'

export interface LevelInfo {
  width: number
  height: number
  bitrate: number
  codecs?: string
}

export interface StreamMeta {
  levels: LevelInfo[]
  duration: number
  audioCodec?: string
  videoCodec?: string
  levelCount: number
}

export interface BandwidthSample {
  time: number
  kbps: number
}

export interface FrameInfo {
  id: string
  timestamp: number
  currentTime: number
  width: number
  height: number
  dataUrl: string
  videoUrl: string
  videoTitle: string
}

interface Props {
  src: string
  videoTitle?: string
  onMeta: (m: StreamMeta) => void
  onMetrics: (s: BandwidthSample[]) => void
  onFrameCapture?: (frame: FrameInfo) => void
}

export default function VideoPlayer({ src, videoTitle, onMeta, onMetrics, onFrameCapture }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const samplesRef = useRef<BandwidthSample[]>([])

  // Function to capture current frame
  const captureCurrentFrame = (): FrameInfo | null => {
    const video = videoRef.current
    if (!video) {
      console.error('Video element not found')
      return null
    }
    
    if (video.readyState < 2) {
      console.error('Video not ready, readyState:', video.readyState)
      return null
    }

    if (video.videoWidth === 0 || video.videoHeight === 0) {
      console.error('Video dimensions are 0:', video.videoWidth, 'x', video.videoHeight)
      return null
    }

    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      console.error('Could not get canvas context')
      return null
    }

    // Set canvas size to match video
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    try {
      // Draw current video frame to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

      // Get image data
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8) // Use JPEG for better compatibility
      
      if (dataUrl === 'data:,' || dataUrl.length < 100) {
        console.error('Generated empty or invalid dataUrl:', dataUrl.substring(0, 50))
        return null
      }
      
      const frameInfo: FrameInfo = {
        id: `frame-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        currentTime: video.currentTime,
        width: video.videoWidth,
        height: video.videoHeight,
        dataUrl,
        videoUrl: src,
        videoTitle: videoTitle || 'Unknown Video'
      }

      return frameInfo
    } catch (error) {
      console.error('Error capturing frame:', error)
      return null
    }
  }

  // Expose capture function globally (for testing/debugging)
  useEffect(() => {
    ;(window as any).captureFrame = captureCurrentFrame
    return () => {
      delete (window as any).captureFrame
    }
  }, [])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    // Reset samples when source changes
    samplesRef.current = []

    let hls: Hls | null = null
    const isHls = src.endsWith('.m3u8')

    if (isHls && Hls.isSupported()) {
      hls = new Hls()
      hls.loadSource(src)
      hls.attachMedia(video)

      // Manifest → send static meta
      hls.on(Hls.Events.MANIFEST_PARSED, (_e, d: any) => {
        const levels = hls!.levels.map(l => ({
          width: l.width ?? 0,
          height: l.height ?? 0,
          bitrate: l.bitrate ?? 0,
          codecs: l.attrs?.CODECS,
        }))
        const [vCodec, aCodec] = (levels[0].codecs ?? '').split(',')
        
        onMeta({
          levels,
          duration: d.levels?.[0]?.details?.totalduration ?? 0,
          audioCodec: aCodec,
          videoCodec: vCodec,
          levelCount: levels.length
        })
        video.play().catch(() => {})
      })

      // Level loaded → send updated meta with duration from details
      hls.on(Hls.Events.LEVEL_LOADED, (_e, d: any) => {
        if (d.details?.totalduration && hls) {
          const levels = hls.levels.map(l => ({
            width: l.width ?? 0,
            height: l.height ?? 0,
            bitrate: l.bitrate ?? 0,
            codecs: l.attrs?.CODECS,
          }))
          const [vCodec, aCodec] = (levels[0].codecs ?? '').split(',')
          
          onMeta({
            levels,
            duration: d.details.totalduration,
            audioCodec: aCodec,
            videoCodec: vCodec,
            levelCount: levels.length
          })
        }
      })

      hls.on(Hls.Events.FRAG_LOADED, (_e, p: any) => {
        const { stats, frag } = p
        const bytes =
          stats?.total  ??
          stats?.length ??
          stats?.loaded ??
          frag?.stats?.total ?? 0

        let ms = 0
        if (stats?.tload && (stats.tfirst ?? stats.trequest)) {
          ms = stats.tload - (stats.tfirst ?? stats.trequest)
        }
        if (ms <= 0) ms = frag.duration * 1000 

        if (bytes && ms) {
          const kbps = (bytes * 8) / ms
          samplesRef.current = [...samplesRef.current.slice(-99), { time: Date.now(), kbps }]
          onMetrics(samplesRef.current)
        }
      })

      hls.on(Hls.Events.ERROR, (_e, err) => err.fatal && hls?.destroy())
    } else {
      video.src = src
      video.addEventListener(
        'loadedmetadata',
        () => {
          onMeta({
            levels: [
              {
                width: video.videoWidth,
                height: video.videoHeight,
                bitrate: 0
              }
            ],
            duration: video.duration,
            levelCount: 1
          })},
        { once: true }

      )
    }

    return () => hls?.destroy()
  }, [src, onMeta, onMetrics])

  return (
    <div className="relative">
      <video ref={videoRef} controls className="w-full h-72 rounded-lg" crossOrigin="anonymous" />
      <button
        onClick={() => {
          const frame = captureCurrentFrame()
          if (frame && onFrameCapture) {
            onFrameCapture(frame)
          }
        }}
        className="absolute top-2 right-2 bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600"
      >
        📸 Add to Collection
      </button>
    </div>
  )
}
