import { useState, useCallback, useRef, useEffect } from 'react'
import {
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  updateDoc,
  deleteDoc,
  collection,
  addDoc,
} from 'firebase/firestore'
import { db } from '../firebase'

const ICE_SERVERS = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
}

export type ConnectionState =
  | 'idle'
  | 'creating'
  | 'waiting'
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'error'

type Point = { x: number; y: number; type: 'move' | 'draw' | 'arrow' | 'clear' }

export function useWebRTCSenior() {
  const [state, setState] = useState<ConnectionState>('idle')
  const [code, setCode] = useState('')
  const [remotePoints, setRemotePoints] = useState<Point[]>([])
  const pcRef = useRef<RTCPeerConnection | null>(null)
  const dcRef = useRef<RTCDataChannel | null>(null)
  const roomRef = useRef<string>('')
  const unsubRef = useRef<(() => void) | null>(null)

  const startHelp = useCallback(async () => {
    try {
      setState('creating')

      // 4자리 코드 생성
      const newCode = Math.floor(1000 + Math.random() * 9000).toString()
      setCode(newCode)
      roomRef.current = newCode

      // 화면 스트림 획득
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      })

      // RTCPeerConnection 생성
      const pc = new RTCPeerConnection(ICE_SERVERS)
      pcRef.current = pc

      // 화면 트랙 추가
      stream.getTracks().forEach((track) => pc.addTrack(track, stream))

      // DataChannel 생성 (좌표 수신용)
      const dc = pc.createDataChannel('pointer', { ordered: true })
      dcRef.current = dc
      dc.onmessage = (e) => {
        const data = JSON.parse(e.data) as Point
        setRemotePoints((prev) => [...prev, data])
      }

      // Offer 생성 및 Firestore 저장
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)

      const roomDoc = doc(db, 'rooms', newCode)
      await setDoc(roomDoc, {
        offer: { type: offer.type, sdp: offer.sdp },
        createdAt: Date.now(),
      })

      // ICE candidate 수집 후 Firestore에 저장
      const candidatesCollection = collection(db, 'rooms', newCode, 'callerCandidates')
      pc.onicecandidate = async (event) => {
        if (event.candidate) {
          await addDoc(candidatesCollection, event.candidate.toJSON())
        }
      }

      // Answer 대기
      setState('waiting')
      unsubRef.current = onSnapshot(roomDoc, async (snapshot) => {
        const data = snapshot.data()
        if (data?.answer && pc.signalingState !== 'stable') {
          setState('connecting')
          await pc.setRemoteDescription(new RTCSessionDescription(data.answer))
        }
      })

      // 상담자의 ICE candidate 수신
      const calleeCandidatesCollection = collection(db, 'rooms', newCode, 'calleeCandidates')
      onSnapshot(calleeCandidatesCollection, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            pc.addIceCandidate(new RTCIceCandidate(change.doc.data()))
          }
        })
      })

      // 연결 상태 모니터링
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'connected') {
          setState('connected')
        } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
          setState('disconnected')
        }
      }
    } catch (err) {
      console.error('Start help error:', err)
      setState('error')
    }
  }, [])

  const stopHelp = useCallback(async () => {
    if (pcRef.current) {
      pcRef.current.close()
      pcRef.current = null
    }
    if (unsubRef.current) {
      unsubRef.current()
    }
    if (roomRef.current) {
      await deleteDoc(doc(db, 'rooms', roomRef.current))
    }
    setState('idle')
    setCode('')
    setRemotePoints([])
  }, [])

  useEffect(() => {
    return () => {
      stopHelp()
    }
  }, [stopHelp])

  return { state, code, remotePoints, startHelp, stopHelp }
}

export function useWebRTCHelper() {
  const [state, setState] = useState<ConnectionState>('idle')
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)
  const pcRef = useRef<RTCPeerConnection | null>(null)
  const dcRef = useRef<RTCDataChannel | null>(null)
  const unsubRef = useRef<(() => void) | null>(null)

  const connect = useCallback(async (inputCode: string) => {
    try {
      setState('connecting')

      const roomDoc = doc(db, 'rooms', inputCode)
      const roomSnapshot = await getDoc(roomDoc)
      if (!roomSnapshot.exists()) {
        setState('error')
        return
      }

      const roomData = roomSnapshot.data()

      // RTCPeerConnection 생성
      const pc = new RTCPeerConnection(ICE_SERVERS)
      pcRef.current = pc

      // 원격 스트림 수신 설정
      const remoteStream = new MediaStream()
      setRemoteStream(remoteStream)
      pc.ontrack = (event) => {
        event.streams[0].getTracks().forEach((track) => remoteStream.addTrack(track))
      }

      // DataChannel 수신 설정
      pc.ondatachannel = (event) => {
        const dc = event.channel
        dcRef.current = dc
      }

      // Offer 설정
      await pc.setRemoteDescription(new RTCSessionDescription(roomData.offer))

      // Answer 생성 및 저장
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)
      await updateDoc(roomDoc, {
        answer: { type: answer.type, sdp: answer.sdp },
      })

      // ICE candidate 수집
      const calleeCandidatesCollection = collection(db, 'rooms', inputCode, 'calleeCandidates')
      pc.onicecandidate = async (event) => {
        if (event.candidate) {
          await addDoc(calleeCandidatesCollection, event.candidate.toJSON())
        }
      }

      // 시니어의 ICE candidate 수신
      const callerCandidatesCollection = collection(db, 'rooms', inputCode, 'callerCandidates')
      unsubRef.current = onSnapshot(callerCandidatesCollection, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            pc.addIceCandidate(new RTCIceCandidate(change.doc.data()))
          }
        })
      })

      // 연결 상태 모니터링
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'connected') {
          setState('connected')
        } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
          setState('disconnected')
        }
      }
    } catch (err) {
      console.error('Connect error:', err)
      setState('error')
    }
  }, [])

  const sendPoint = useCallback((point: Point) => {
    if (dcRef.current?.readyState === 'open') {
      dcRef.current.send(JSON.stringify(point))
    }
  }, [])

  const disconnect = useCallback(() => {
    if (pcRef.current) {
      pcRef.current.close()
      pcRef.current = null
    }
    if (unsubRef.current) {
      unsubRef.current()
    }
    setState('idle')
    setRemoteStream(null)
  }, [])

  useEffect(() => {
    return () => {
      disconnect()
    }
  }, [disconnect])

  return { state, remoteStream, connect, disconnect, sendPoint }
}
