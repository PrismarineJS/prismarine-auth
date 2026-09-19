import { EventEmitter } from 'events'
import { Authflow } from '..'

/** Experimental: this API may change or move to a separate package. */
export interface TitleOptions {
  titleId: string
  scid: string
  templateName: string
  timeout?: number
}
export interface RequestOptions {
  data?: unknown
  headers?: Record<string, string>
  contractVersion?: string
  timeout?: number
  signal?: AbortSignal
}
export interface Profile {
  id: string
  [key: string]: unknown
}
export interface SessionProperties {
  system?: Record<string, unknown>
  custom?: Record<string, unknown>
}
export interface Session {
  properties: SessionProperties
  [key: string]: unknown
}
export interface SessionHandle {
  sessionRef: { scid: string; templateName: string; name: string }
  [key: string]: unknown
}
export class XboxClient {
  constructor(authflow: Authflow, options?: Partial<TitleOptions>)
  get<T = unknown>(url: string, config?: RequestOptions): Promise<T | undefined>
  post<T = unknown>(url: string, config?: RequestOptions): Promise<T | undefined>
  put<T = unknown>(url: string, config?: RequestOptions): Promise<T | undefined>
  delete<T = unknown>(url: string, config?: RequestOptions): Promise<T | undefined>
  abortPending(): void
  getProfile(identifier: string): Promise<Profile>
  getSessions(xuid: string): Promise<SessionHandle[]>
  getSession(name: string): Promise<Session>
  updateSession(name: string, payload: Record<string, unknown>): Promise<unknown>
  setActivity(name: string): Promise<unknown>
  sendInvite(name: string, xuid: string): Promise<unknown>
  leaveSession(name: string): Promise<void>
}
export class SessionDirectory extends EventEmitter {
  constructor(authflow: Authflow, options: TitleOptions)
  /** This client belongs to this session; end() cancels its pending requests. */
  readonly client: XboxClient
  createSession(properties?: SessionProperties | ((context: { profile: Profile }) => SessionProperties)): Promise<void>
  joinSession(name: string): Promise<Session>
  getSession(): Promise<Session>
  updateSession(payload: Record<string, unknown>): Promise<void>
  invitePlayer(identifier: string): Promise<void>
  end(): Promise<void>
}
