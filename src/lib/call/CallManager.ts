/**
 * WebRTC mesh voice call (max 3 people) with screen sharing, signaled through Firestore:
 *
 * groups/{gid}/calls/live                       → { active, startedBy, startedAt }
 * groups/{gid}/calls/live/participants/{uid}    → { name, photo, session, muted, sharing, lastSeen }
 * groups/{gid}/calls/live/signals/{id}          → { from, to, fromSession, toSession, type, sdp?, candidate?, ts }
 *
 * Uses the "perfect negotiation" pattern so both peers can (re)negotiate at any time — needed when a
 * screen-share track is added mid-call. The peer with the lower uid is "impolite".
 */
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  addDoc,
  type Unsubscribe,
} from 'firebase/firestore'
import { fs } from '../firebase'
import { uid as makeId } from '../utils'

export interface CallParticipant {
  uid: string
  name: string
  photo?: string | null
  muted: boolean
  sharing: boolean
  speaking: boolean
  level: number
  connection: RTCPeerConnectionState | 'self'
  stream?: MediaStream
  screen?: MediaStream
}

export interface CallSnapshot {
  status: 'idle' | 'joining' | 'in-call' | 'error'
  error?: string
  participants: CallParticipant[]
  muted: boolean
  sharing: boolean
  activeSpeaker?: string
}

interface Peer {
  pc: RTCPeerConnection
  session: string
  makingOffer: boolean
  ignoreOffer: boolean
  polite: boolean
  pendingCandidates: RTCIceCandidateInit[]
  audio?: HTMLAudioElement
  stream?: MediaStream
  screen?: MediaStream
  screenSender?: RTCRtpSender
  analyser?: AnalyserNode
}

interface RemoteInfo {
  uid: string
  name: string
  photo?: string | null
  session: string
  muted: boolean
  sharing: boolean
  lastSeen?: number
}

const STALE_MS = 45_000

export function iceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [{ urls: 'stun:stun.l.google.com:19302' }]
  const turn = import.meta.env.VITE_TURN_URLS as string | undefined
  if (turn) {
    servers.push({
      urls: turn.split(',').map((s) => s.trim()).filter(Boolean),
      username: import.meta.env.VITE_TURN_USERNAME,
      credential: import.meta.env.VITE_TURN_CREDENTIAL,
    })
  }
  return servers
}

export class CallManager {
  private session = makeId()
  private peers = new Map<string, Peer>()
  private remotes = new Map<string, RemoteInfo>()
  private unsubs: Unsubscribe[] = []
  private local?: MediaStream
  private screen?: MediaStream
  private audioCtx?: AudioContext
  private localAnalyser?: AnalyserNode
  private levels = new Map<string, number>()
  private heartbeat?: ReturnType<typeof setInterval>
  private meter?: ReturnType<typeof setInterval>
  private state: CallSnapshot = { status: 'idle', participants: [], muted: false, sharing: false }
  private listeners = new Set<(s: CallSnapshot) => void>()

  constructor(
    public readonly gid: string,
    private me: { uid: string; name: string; photo?: string | null },
  ) {}

  subscribe(fn: (s: CallSnapshot) => void) {
    this.listeners.add(fn)
    fn(this.state)
    return () => this.listeners.delete(fn)
  }

  get snapshot() {
    return this.state
  }

  private base = () => doc(fs(), 'groups', this.gid, 'calls', 'live')
  private participantsCol = () => collection(this.base(), 'participants')
  private signalsCol = () => collection(this.base(), 'signals')

  async join() {
    this.patch({ status: 'joining' })
    try {
      this.local = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } })
    } catch {
      this.patch({ status: 'error', error: 'Microphone access was blocked. Allow the mic and try again.' })
      throw new Error('mic')
    }
    this.audioCtx = new AudioContext()
    this.localAnalyser = this.analyse(this.local)

    await this.cleanupMySignals()
    await setDoc(this.base(), { active: true, startedBy: this.me.uid, startedAt: serverTimestamp() }, { merge: true })
    await this.writePresence()

    // Participants: create peers for new people, drop peers for people who left.
    this.unsubs.push(
      onSnapshot(this.participantsCol(), (snap) => {
        const seen = new Set<string>()
        for (const d of snap.docs) {
          const info = { uid: d.id, ...(d.data() as Omit<RemoteInfo, 'uid'>) }
          if (info.uid === this.me.uid) continue
          if (info.lastSeen && Date.now() - info.lastSeen > STALE_MS) {
            deleteDoc(d.ref).catch(() => {}) // tab crashed without cleanup
            continue
          }
          seen.add(info.uid)
          this.remotes.set(info.uid, info)
          const existing = this.peers.get(info.uid)
          if (existing && existing.session !== info.session) this.closePeer(info.uid)
          if (!this.peers.has(info.uid)) this.createPeer(info.uid, info.session)
        }
        for (const id of [...this.peers.keys()]) if (!seen.has(id)) this.closePeer(id)
        for (const id of [...this.remotes.keys()]) if (!seen.has(id)) this.remotes.delete(id)
        this.emit()
      }),
    )

    // Signals addressed to me (this session).
    this.unsubs.push(
      onSnapshot(query(this.signalsCol(), where('to', '==', this.me.uid)), (snap) => {
        const added = snap
          .docChanges()
          .filter((c) => c.type === 'added')
          .map((c) => ({ ref: c.doc.ref, ...(c.doc.data() as any) }))
          .sort((a, b) => a.ts - b.ts)
        for (const s of added) {
          deleteDoc(s.ref).catch(() => {})
          if (s.toSession !== this.session) continue
          this.handleSignal(s).catch((e) => console.warn('[call] signal error', e))
        }
      }),
    )

    this.heartbeat = setInterval(() => updateDoc(doc(this.participantsCol(), this.me.uid), { lastSeen: Date.now() }).catch(() => {}), 15_000)
    this.meter = setInterval(() => this.measure(), 150)
    this.patch({ status: 'in-call' })
    window.addEventListener('beforeunload', this.onUnload)
  }

  private onUnload = () => {
    this.leave()
  }

  private async writePresence() {
    await setDoc(doc(this.participantsCol(), this.me.uid), {
      name: this.me.name,
      photo: this.me.photo ?? null,
      session: this.session,
      muted: this.state.muted,
      sharing: this.state.sharing,
      lastSeen: Date.now(),
    })
  }

  private async cleanupMySignals() {
    const [from, to] = await Promise.all([
      getDocs(query(this.signalsCol(), where('from', '==', this.me.uid))),
      getDocs(query(this.signalsCol(), where('to', '==', this.me.uid))),
    ])
    const batch = writeBatch(fs())
    ;[...from.docs, ...to.docs].forEach((d) => batch.delete(d.ref))
    await batch.commit().catch(() => {})
  }

  private send(to: string, data: Record<string, unknown>) {
    const remote = this.remotes.get(to)
    if (!remote) return
    return addDoc(this.signalsCol(), {
      from: this.me.uid,
      to,
      fromSession: this.session,
      toSession: remote.session,
      ts: Date.now() + Math.random() / 1000,
      ...data,
    })
  }

  private createPeer(remoteUid: string, session: string) {
    const pc = new RTCPeerConnection({ iceServers: iceServers() })
    const peer: Peer = { pc, session, makingOffer: false, ignoreOffer: false, polite: this.me.uid > remoteUid, pendingCandidates: [] }
    this.peers.set(remoteUid, peer)

    this.local?.getTracks().forEach((t) => pc.addTrack(t, this.local!))
    if (this.screen) peer.screenSender = pc.addTrack(this.screen.getVideoTracks()[0], this.screen)

    pc.onnegotiationneeded = async () => {
      try {
        peer.makingOffer = true
        await pc.setLocalDescription()
        await this.send(remoteUid, { type: 'description', sdp: JSON.stringify(pc.localDescription) })
      } catch (e) {
        console.warn('[call] negotiation failed', e)
      } finally {
        peer.makingOffer = false
      }
    }
    pc.onicecandidate = ({ candidate }) => {
      if (candidate) this.send(remoteUid, { type: 'candidate', candidate: JSON.stringify(candidate.toJSON()) })
    }
    pc.ontrack = ({ track, streams }) => {
      const stream = streams[0] ?? new MediaStream([track])
      if (track.kind === 'audio') {
        peer.stream = stream
        if (!peer.audio) {
          peer.audio = new Audio()
          peer.audio.autoplay = true
        }
        peer.audio.srcObject = stream
        peer.audio.play().catch(() => {})
        peer.analyser = this.analyse(stream)
      } else {
        peer.screen = stream
        track.onended = () => {
          peer.screen = undefined
          this.emit()
        }
        stream.onremovetrack = () => {
          peer.screen = undefined
          this.emit()
        }
      }
      this.emit()
    }
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed') pc.restartIce()
      this.emit()
    }
  }

  private async handleSignal(s: { from: string; fromSession: string; type: string; sdp?: string; candidate?: string }) {
    let peer = this.peers.get(s.from)
    if (!peer || peer.session !== s.fromSession) {
      // The participant snapshot may not have arrived yet.
      const remote = this.remotes.get(s.from)
      if (!remote || remote.session !== s.fromSession) this.remotes.set(s.from, { uid: s.from, name: remote?.name ?? 'Friend', session: s.fromSession, muted: false, sharing: false })
      if (peer) this.closePeer(s.from)
      this.createPeer(s.from, s.fromSession)
      peer = this.peers.get(s.from)!
    }
    const { pc } = peer
    if (s.type === 'description' && s.sdp) {
      const description = JSON.parse(s.sdp) as RTCSessionDescriptionInit
      const collision = description.type === 'offer' && (peer.makingOffer || pc.signalingState !== 'stable')
      peer.ignoreOffer = !peer.polite && collision
      if (peer.ignoreOffer) return
      await pc.setRemoteDescription(description)
      for (const c of peer.pendingCandidates.splice(0)) await pc.addIceCandidate(c).catch(() => {})
      if (description.type === 'offer') {
        await pc.setLocalDescription()
        await this.send(s.from, { type: 'description', sdp: JSON.stringify(pc.localDescription) })
      }
    } else if (s.type === 'candidate' && s.candidate) {
      const c = JSON.parse(s.candidate) as RTCIceCandidateInit
      if (!pc.remoteDescription) peer.pendingCandidates.push(c)
      else
        await pc.addIceCandidate(c).catch((e) => {
          if (!peer!.ignoreOffer) console.warn('[call] ICE error', e)
        })
    }
  }

  private closePeer(remoteUid: string) {
    const p = this.peers.get(remoteUid)
    if (!p) return
    p.pc.close()
    if (p.audio) p.audio.srcObject = null
    this.peers.delete(remoteUid)
    this.levels.delete(remoteUid)
  }

  private analyse(stream: MediaStream) {
    if (!this.audioCtx) return undefined
    try {
      const src = this.audioCtx.createMediaStreamSource(stream)
      const an = this.audioCtx.createAnalyser()
      an.fftSize = 512
      src.connect(an)
      return an
    } catch {
      return undefined
    }
  }

  private level(an?: AnalyserNode) {
    if (!an) return 0
    const buf = new Uint8Array(an.fftSize)
    an.getByteTimeDomainData(buf)
    let sum = 0
    for (const v of buf) sum += ((v - 128) / 128) ** 2
    return Math.sqrt(sum / buf.length)
  }

  private measure() {
    if (this.audioCtx?.state === 'suspended') this.audioCtx.resume().catch(() => {})
    const smooth = (id: string, v: number) => this.levels.set(id, (this.levels.get(id) ?? 0) * 0.6 + v * 0.4)
    smooth(this.me.uid, this.state.muted ? 0 : this.level(this.localAnalyser))
    for (const [id, p] of this.peers) smooth(id, this.level(p.analyser))
    this.emit()
  }

  toggleMute() {
    const muted = !this.state.muted
    this.local?.getAudioTracks().forEach((t) => (t.enabled = !muted))
    this.patch({ muted })
    updateDoc(doc(this.participantsCol(), this.me.uid), { muted }).catch(() => {})
  }

  async startShare() {
    if (this.screen) return
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 15 }, audio: false })
    } catch {
      return // user cancelled
    }
    this.screen = stream
    const track = stream.getVideoTracks()[0]
    track.onended = () => this.stopShare()
    for (const p of this.peers.values()) {
      if (p.screenSender) await p.screenSender.replaceTrack(track)
      else p.screenSender = p.pc.addTrack(track, stream) // triggers renegotiation
    }
    this.patch({ sharing: true })
    updateDoc(doc(this.participantsCol(), this.me.uid), { sharing: true }).catch(() => {})
  }

  stopShare() {
    if (!this.screen) return
    this.screen.getTracks().forEach((t) => t.stop())
    this.screen = undefined
    for (const p of this.peers.values()) {
      if (p.screenSender) {
        try {
          p.pc.removeTrack(p.screenSender)
        } catch {
          /* already closed */
        }
        p.screenSender = undefined
      }
    }
    this.patch({ sharing: false })
    updateDoc(doc(this.participantsCol(), this.me.uid), { sharing: false }).catch(() => {})
  }

  get localScreen() {
    return this.screen
  }

  async leave() {
    window.removeEventListener('beforeunload', this.onUnload)
    clearInterval(this.heartbeat)
    clearInterval(this.meter)
    this.unsubs.forEach((u) => u())
    this.unsubs = []
    for (const id of [...this.peers.keys()]) this.closePeer(id)
    this.local?.getTracks().forEach((t) => t.stop())
    this.screen?.getTracks().forEach((t) => t.stop())
    this.screen = undefined
    this.audioCtx?.close().catch(() => {})
    this.patch({ status: 'idle', participants: [], sharing: false })
    try {
      await deleteDoc(doc(this.participantsCol(), this.me.uid))
      await this.cleanupMySignals()
      const left = await getDocs(this.participantsCol())
      if (left.empty) {
        // last one out cleans up the whole call
        const sig = await getDocs(this.signalsCol())
        const batch = writeBatch(fs())
        sig.docs.forEach((d) => batch.delete(d.ref))
        batch.delete(this.base())
        await batch.commit()
      }
    } catch (e) {
      console.warn('[call] cleanup failed', e)
    }
  }

  private patch(p: Partial<CallSnapshot>) {
    this.state = { ...this.state, ...p }
    this.emit()
  }

  private emit() {
    const THRESH = 0.02
    const participants: CallParticipant[] = []
    const myLevel = this.levels.get(this.me.uid) ?? 0
    if (this.state.status === 'in-call') {
      participants.push({
        uid: this.me.uid,
        name: this.me.name,
        photo: this.me.photo,
        muted: this.state.muted,
        sharing: this.state.sharing,
        speaking: myLevel > THRESH,
        level: myLevel,
        connection: 'self',
        screen: this.screen,
      })
    }
    for (const [id, p] of this.peers) {
      const r = this.remotes.get(id)
      const lvl = this.levels.get(id) ?? 0
      participants.push({
        uid: id,
        name: r?.name ?? 'Friend',
        photo: r?.photo,
        muted: r?.muted ?? false,
        sharing: !!p.screen,
        speaking: lvl > THRESH,
        level: lvl,
        connection: p.pc.connectionState,
        stream: p.stream,
        screen: p.screen,
      })
    }
    const loudest = participants.filter((p) => p.speaking).sort((a, b) => b.level - a.level)[0]
    this.state = { ...this.state, participants, activeSpeaker: loudest?.uid }
    this.listeners.forEach((l) => l(this.state))
  }
}

/** Watch whether a call is currently running in a group (for the "Join call" button). */
export function watchCall(gid: string, cb: (count: number) => void) {
  return onSnapshot(collection(fs(), 'groups', gid, 'calls', 'live', 'participants'), (s) =>
    cb(s.docs.filter((d) => !d.data().lastSeen || Date.now() - d.data().lastSeen < STALE_MS).length),
  )
}
