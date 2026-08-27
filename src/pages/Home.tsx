import { useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { Smartphone, Headset } from 'lucide-react'

export default function Home() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6">
      <h1 className="text-4xl font-bold text-gray-900 mb-2">폰닥터</h1>
      <p className="text-gray-500 mb-12 text-lg">시니어 원격 지원 서비스</p>

      <div className="flex flex-col gap-6 w-full max-w-sm">
        <Button
          size="lg"
          className="h-24 text-xl gap-3 bg-green-600 hover:bg-green-700"
          onClick={() => navigate('/senior')}
        >
          <Smartphone className="w-8 h-8" />
          시니어용 (도움 요청)
        </Button>

        <Button
          size="lg"
          variant="outline"
          className="h-24 text-xl gap-3 border-2"
          onClick={() => navigate('/helper')}
        >
          <Headset className="w-8 h-8" />
          상담자용 (지원하기)
        </Button>
      </div>
    </div>
  )
}
