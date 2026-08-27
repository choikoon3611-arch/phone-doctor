import { useEffect, useRef, useCallback } from 'react'
import { useWebRTCSenior } from '../hooks/useWebRTC'
import { Button } from '@/components/ui/button'
import { Phone, PhoneOff, Loader2 } from 'lucide-react'

export default function Senior() {
  const { state, code, remotePoints, startHelp, stopHelp } = useWebRTCSenior()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // 상담자 포인터 그리기
  const drawPointer = useCallback(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Canvas 크기를 화면에 맞춤
    canvas.width = container.clientWidth
    canvas.height = container.clientHeight
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    remotePoints.forEach((point) => {
      if (point.type === 'clear') {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        return
      }
      if (point.type === 'move') {
        ctx.beginPath()
        ctx.arc(point.x * canvas.width, point.y * canvas.height, 20, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(255, 59, 48, 0.6)'
        ctx.fill()
        ctx.strokeStyle = '#ff3b30'
        ctx.lineWidth = 3
        ctx.stroke()
      } else if (point.type === 'arrow') {
        // 화살표는 누적되지 않고 최신 것만 표시하거나, 직선으로 연결
        // 간단하게 점으로 표시
        ctx.beginPath()
        ctx.arc(point.x * canvas.width, point.y * canvas.height, 15, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(0, 122, 255, 0.8)'
        ctx.fill()
      }
    })

    // 최근 50개만 유지 (메모리 관리)
    if (remotePoints.length > 50) {
      // useWebRTCSenior 내부에서 관리해야 하지만 여기서는 간단히 무시
    }
  }, [remotePoints])

  useEffect(() => {
    drawPointer()
  }, [drawPointer])

  // 화면 크기 변경 시 Canvas 리사이즈
  useEffect(() => {
    const handleResize = () => drawPointer()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [drawPointer])

  return (
    <div ref={containerRef} className="fixed inset-0 flex flex-col items-center justify-center bg-black">
      {/* 오버레이 Canvas - 상담자 포인터 표시 */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none z-20"
        style={{ width: '100%', height: '100%' }}
      />

      {state === 'idle' && (
        <div className="flex flex-col items-center gap-8 z-10">
          <h2 className="text-white text-2xl font-bold">도움이 필요하신가요?</h2>
          <Button
            size="lg"
            className="h-32 w-64 text-2xl gap-4 bg-green-500 hover:bg-green-600 rounded-3xl shadow-2xl"
            onClick={startHelp}
          >
            <Phone className="w-10 h-10" />
            도움 요청
          </Button>
          <p className="text-gray-400 text-sm mt-4">
            버튼을 누르면 상담자에게 화면이 공유됩니다
          </p>
        </div>
      )}

      {state === 'creating' && (
        <div className="flex flex-col items-center gap-4 z-10">
          <Loader2 className="w-16 h-16 text-green-500 animate-spin" />
          <p className="text-white text-xl">연결 준비 중...</p>
        </div>
      )}

      {state === 'waiting' && (
        <div className="flex flex-col items-center gap-6 z-10">
          <p className="text-white text-xl">아래 코드를 상담자에게 알려주세요</p>
          <div className="bg-white rounded-2xl px-12 py-6">
            <p className="text-6xl font-bold text-gray-900 tracking-widest">{code}</p>
          </div>
          <p className="text-gray-400 text-sm">카카오톡 영상통화도 함께 연결해주세요</p>
          <Button
            variant="destructive"
            size="lg"
            className="mt-8"
            onClick={stopHelp}
          >
            <PhoneOff className="w-5 h-5 mr-2" />
            취소
          </Button>
        </div>
      )}

      {state === 'connecting' && (
        <div className="flex flex-col items-center gap-4 z-10">
          <Loader2 className="w-16 h-16 text-blue-500 animate-spin" />
          <p className="text-white text-xl">상담자와 연결 중...</p>
        </div>
      )}

      {state === 'connected' && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-4">
          <div className="bg-green-500 text-white px-6 py-3 rounded-full text-lg font-bold flex items-center gap-2">
            <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
            상담자와 연결됨
          </div>
          <Button variant="destructive" size="lg" onClick={stopHelp}>
            <PhoneOff className="w-5 h-5 mr-2" />
            연결 종료
          </Button>
        </div>
      )}

      {state === 'error' && (
        <div className="flex flex-col items-center gap-4 z-10">
          <p className="text-red-400 text-xl">연결에 실패했습니다</p>
          <Button size="lg" onClick={startHelp}>
            다시 시도
          </Button>
        </div>
      )}
    </div>
  )
}
