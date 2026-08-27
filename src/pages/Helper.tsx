import { useState, useRef, useCallback, useEffect } from 'react'
import { useWebRTCHelper } from '../hooks/useWebRTC'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PhoneOff, MousePointer, ArrowRight, Trash2, Loader2 } from 'lucide-react'

type Tool = 'pointer' | 'arrow'

export default function Helper() {
  const [code, setCode] = useState('')
  const [tool, setTool] = useState<Tool>('pointer')
  const { state, remoteStream, connect, disconnect, sendPoint } = useWebRTCHelper()
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const isDrawing = useRef(false)

  // 원격 스트림을 비디오에 연결
  useEffect(() => {
    if (videoRef.current && remoteStream) {
      videoRef.current.srcObject = remoteStream
    }
  }, [remoteStream])

  // Canvas 그리기 핸들러
  const getRelativePos = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      const canvas = canvasRef.current
      if (!canvas) return { x: 0, y: 0 }
      const rect = canvas.getBoundingClientRect()
      let clientX, clientY
      if ('touches' in e) {
        clientX = e.touches[0].clientX
        clientY = e.touches[0].clientY
      } else {
        clientX = e.clientX
        clientY = e.clientY
      }
      return {
        x: (clientX - rect.left) / rect.width,
        y: (clientY - rect.top) / rect.height,
      }
    },
    []
  )

  const handleStart = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      isDrawing.current = true
      const pos = getRelativePos(e)
      sendPoint({ ...pos, type: tool === 'pointer' ? 'move' : 'arrow' })

      // Canvas에도 그리기
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      const x = pos.x * canvas.width
      const y = pos.y * canvas.height

      ctx.beginPath()
      if (tool === 'pointer') {
        ctx.arc(x, y, 20, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(255, 59, 48, 0.6)'
        ctx.fill()
        ctx.strokeStyle = '#ff3b30'
        ctx.lineWidth = 3
        ctx.stroke()
      } else {
        ctx.arc(x, y, 15, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(0, 122, 255, 0.8)'
        ctx.fill()
      }
    },
    [tool, getRelativePos, sendPoint]
  )

  const handleMove = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!isDrawing.current) return
      const pos = getRelativePos(e)
      sendPoint({ ...pos, type: tool === 'pointer' ? 'move' : 'arrow' })
    },
    [tool, getRelativePos, sendPoint]
  )

  const handleEnd = useCallback(() => {
    isDrawing.current = false
  }, [])

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    sendPoint({ x: 0, y: 0, type: 'clear' })
  }, [sendPoint])

  // Canvas 크기 조정
  useEffect(() => {
    const resize = () => {
      const canvas = canvasRef.current
      const container = containerRef.current
      if (!canvas || !container) return
      canvas.width = container.clientWidth
      canvas.height = container.clientHeight
    }
    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [state])

  if (state === 'idle' || state === 'error') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 p-6">
        <h1 className="text-3xl font-bold text-white mb-2">폰닥터 - 상담자</h1>
        <p className="text-gray-400 mb-8">시니어가 알려준 코드를 입력하세요</p>

        <div className="flex gap-2 w-full max-w-xs">
          <Input
            type="text"
            inputMode="numeric"
            maxLength={4}
            placeholder="4자리 코드"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
            className="text-center text-2xl h-14 bg-white"
          />
          <Button
            size="lg"
            className="h-14 px-6"
            disabled={code.length !== 4}
            onClick={() => connect(code)}
          >
            연결
          </Button>
        </div>

        {state === 'error' && (
          <p className="text-red-400 mt-4">코드를 다시 확인해주세요</p>
        )}
      </div>
    )
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-black">
      {/* 상단 툴바 */}
      <div className="flex items-center justify-between bg-gray-800 px-4 py-2 z-30">
        <div className="flex items-center gap-2">
          <div className="bg-green-500 text-white px-3 py-1 rounded text-sm font-bold flex items-center gap-2">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
            연결됨
          </div>
          <span className="text-gray-300 text-sm">코드: {code}</span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={tool === 'pointer' ? 'default' : 'outline'}
            onClick={() => setTool('pointer')}
            className="gap-1"
          >
            <MousePointer className="w-4 h-4" />
            포인터
          </Button>
          <Button
            size="sm"
            variant={tool === 'arrow' ? 'default' : 'outline'}
            onClick={() => setTool('arrow')}
            className="gap-1"
          >
            <ArrowRight className="w-4 h-4" />
            화살표
          </Button>
          <Button size="sm" variant="outline" onClick={clearCanvas} className="gap-1">
            <Trash2 className="w-4 h-4" />
            지우기
          </Button>
          <Button size="sm" variant="destructive" onClick={disconnect} className="gap-1">
            <PhoneOff className="w-4 h-4" />
            종료
          </Button>
        </div>
      </div>

      {/* 화면 표시 영역 */}
      <div ref={containerRef} className="relative flex-1 overflow-hidden">
        {state === 'connecting' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 z-20">
            <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
            <p className="text-white">연결 중...</p>
          </div>
        )}

        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="w-full h-full object-contain"
        />

        {/* 그리기 오버레이 Canvas */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 cursor-crosshair"
          onMouseDown={handleStart}
          onMouseMove={handleMove}
          onMouseUp={handleEnd}
          onMouseLeave={handleEnd}
          onTouchStart={handleStart}
          onTouchMove={handleMove}
          onTouchEnd={handleEnd}
        />
      </div>

      {/* 하단 안내 */}
      <div className="bg-gray-800 px-4 py-2 text-center text-gray-400 text-sm">
        🎤 음성은 카카오톡 영상통화로 진행하세요 • 화면을 클릭하면 {tool === 'pointer' ? '빨간 포인터' : '파란 화살표'}가 표시됩니다
      </div>
    </div>
  )
}
