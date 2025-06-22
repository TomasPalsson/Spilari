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

interface Props {
  src: string
  onMeta: (m: StreamMeta) => void
  onMetrics: (s: BandwidthSample[]) => void
}

export default function VideoPlayer({ src, onMeta, onMetrics }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const samplesRef = useRef<BandwidthSample[]>([])

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
          codecs: l.attrs?.CODECS
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
        () =>
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
          }),
        { once: true }
      )
    }

    return () => hls?.destroy()
  }, [src, onMeta, onMetrics])

  return <video ref={videoRef} controls className="w-full h-72 rounded-lg" />
}
