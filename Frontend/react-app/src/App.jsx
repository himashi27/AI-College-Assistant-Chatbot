import { useEffect, useRef, useState } from 'react'
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
const ENABLE_DIRECT_REDIRECT = (import.meta.env.VITE_ENABLE_DIRECT_REDIRECT || 'false').toLowerCase() === 'true'
const DEFAULT_STUDENT_ID = import.meta.env.VITE_DEFAULT_STUDENT_ID || 'AI23001'
const DEFAULT_PERSONA = 'student'

const moduleItems = [
  { title: 'Admit Card', icon: 'idCard' },
  { title: 'AlumniPortal', icon: 'gear' },
  { title: 'Assignments', icon: 'assignment' },
  { title: 'Attendance', icon: 'userCheck' },
  { title: 'Central Communication', icon: 'network' },
  { title: 'Circular', icon: 'refresh' },
  { title: 'College Info', icon: 'building' },
  { title: 'Convocation Form', icon: 'form' },
  { title: 'Courses', icon: 'courses' },
  { title: 'Fee Undertaking', icon: 'fee' },
  { title: 'Feedback', icon: 'feedback' },
  { title: 'Fees', icon: 'fees' },
  { title: 'Grievance Complaint', icon: 'grievance' },
  { title: 'LMS', icon: 'lms' },
  { title: 'Mentor Mentee', icon: 'mentor' },
  { title: 'Moodle LMS', icon: 'lms' },
  { title: 'My Report Card', icon: 'report' },
  { title: 'NEFT Form', icon: 'fees' },
  { title: 'Performances', icon: 'gauge' },
  { title: 'Student Request Service', icon: 'request' },
  { title: 'Survey', icon: 'survey' },
  { title: 'Time Table', icon: 'calendar' },
]

const sidebarItems = [
  { title: 'Admit Card', icon: 'idCard' },
  { title: 'AlumniPortal', icon: 'gear' },
  { title: 'Assignments', icon: 'assignment' },
  { title: 'Attendance', icon: 'userCheck' },
  { title: 'Central Communication', icon: 'network' },
  { title: 'Circular', icon: 'refresh' },
  { title: 'College Info', icon: 'building' },
  { title: 'Convocation Form', icon: 'form' },
  { title: 'Courses', icon: 'courses' },
  { title: 'Fee Undertaking', icon: 'fee' },
]

const suggestionChipsByPersona = {
  student: ['Attendance', 'Syllabus', 'Assignments', 'Fees', 'Performance', 'Results'],
  faculty: ['Today Classes', 'Assignment Reviews', 'Low Attendance', 'Leave Requests', 'Course Plan', 'Student Progress'],
}

const defaultQuickActions = [
  { label: 'Attendance Summary', query: 'attendance of all subjects', tone: 'Academic' },
  { label: 'Syllabus Overview', query: 'syllabus of all subjects', tone: 'Course' },
  { label: 'Due Assignments', query: 'due assignment of all subjects', tone: 'Deadline' },
  { label: 'Fee Status', query: 'pending fees', tone: 'Finance' },
]

const defaultQuickActionsByPersona = {
  student: defaultQuickActions,
  faculty: [
    { label: "Today's Classes", query: 'show my classes for today', tone: 'Teaching' },
    { label: 'Pending Reviews', query: 'show pending assignment reviews', tone: 'Evaluation' },
    { label: 'Low Attendance Alerts', query: 'show low attendance students', tone: 'Alerts' },
    { label: 'Leave Requests', query: 'show pending leave requests', tone: 'Workflow' },
  ],
}

const getWelcomeMessage = (persona) => {
  const personaKey = (persona || DEFAULT_PERSONA).toLowerCase()
  const messages = {
    student: 'Welcome to the University AI Assistant. I can help with attendance, assignments, syllabus, fees, and results. What do you need today?',
    faculty: 'Welcome to the Faculty Assistant. I can help with classes, student progress, reviews, and academic workflow. What would you like to check?',
  }

  return {
    id: 1,
    role: 'bot',
    text: messages[personaKey] || messages.student,
  }
}

const getStoredPortalAuth = () => {
  try {
    const raw = localStorage.getItem('portal_auth')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

const clearPortalSession = () => {
  ;[
    'portal_auth',
    'portal_user_id',
    'student_id',
    'active_persona',
    'chat_owner_key',
    'chat_messages',
    'chat_session_id',
    'chat_route_context',
  ].forEach((key) => localStorage.removeItem(key))
}

const getStoredRouteContext = () => {
  try {
    const raw = localStorage.getItem('chat_route_context')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

const CHAT_THREADS_KEY = 'chat_threads'

const getLocalDateKey = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const getStoredChatThreads = () => {
  try {
    const raw = localStorage.getItem(CHAT_THREADS_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const saveStoredChatThreads = (threads) => {
  localStorage.setItem(CHAT_THREADS_KEY, JSON.stringify(threads))
}

const getSeenAnnouncementIds = (ownerKey) => {
  if (!ownerKey) return []
  try {
    const raw = localStorage.getItem(`seen_announcements:${ownerKey}`)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const saveSeenAnnouncementIds = (ownerKey, ids) => {
  if (!ownerKey) return
  localStorage.setItem(`seen_announcements:${ownerKey}`, JSON.stringify(ids))
}

const upsertChatThread = (thread) => {
  const threads = getStoredChatThreads().filter((item) => item?.threadKey !== thread.threadKey)
  threads.push(thread)
  threads.sort((a, b) => String(b.lastUpdatedAt || '').localeCompare(String(a.lastUpdatedAt || '')))
  saveStoredChatThreads(threads.slice(0, 20))
}

const getThreadKey = (ownerKey, dateKey) => `${ownerKey}:${dateKey}`

const buildThreadPreview = (messages) => {
  const meaningful = (messages || []).filter((item) => item?.role === 'user' || item?.role === 'bot')
  const firstUser = meaningful.find((item) => item?.role === 'user' && item?.text)
  return firstUser?.text || meaningful[meaningful.length - 1]?.text || 'Conversation started'
}

const formatThreadLabel = (dateKey) => {
  if (!dateKey) return 'Previous Chat'
  if (dateKey === getLocalDateKey()) return 'Today'
  const parsed = new Date(`${dateKey}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return dateKey
  return parsed.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

const normalizeText = (value) =>
  String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const inferFollowUpQuery = (rawMessage, routeContext) => {
  if (!routeContext?.intent) return null

  const normalized = normalizeText(rawMessage)
  if (!normalized) return null

  const explicitIntentMarkers = ['attendance', 'syllabus', 'assignment', 'assignments', 'fees', 'results', 'result', 'performance']
  if (explicitIntentMarkers.some((token) => normalized.includes(token))) {
    return null
  }

  const subjectFollowUp = normalized.match(/^(?:what about|how about|and|for)\s+(.+)$/)
  if (subjectFollowUp?.[1]) {
    const subjectText = subjectFollowUp[1].trim()
    if (routeContext.intent === 'attendance') return `attendance of ${subjectText}`
    if (routeContext.intent === 'syllabus') return `syllabus of ${subjectText}`
    if (routeContext.intent === 'assignment_due' || routeContext.intent === 'assignments') return `due assignment for ${subjectText}`
  }

  if (routeContext.intent === 'attendance') {
    if (['which one is lower', 'which one is lowest', 'lowest one', 'which subject is lower'].includes(normalized)) {
      return 'which subject has lowest attendance'
    }
    if (['which one is higher', 'which one is highest', 'highest one', 'which subject is higher'].includes(normalized)) {
      return 'which subject has highest attendance'
    }
  }

  if (routeContext.intent === 'assignment_due' || routeContext.intent === 'assignments') {
    if (['which one is due first', 'which is due first', 'which one comes first', 'which assignment comes first'].includes(normalized)) {
      return 'which assignment is due first'
    }
  }

  return null
}

const iconMap = {
  idCard: (
    <svg viewBox="0 0 64 64" className="h-full w-full" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <rect x="10" y="14" width="44" height="36" rx="6" />
      <circle cx="24" cy="32" r="6" />
      <path d="M36 26h12M36 34h12" />
    </svg>
  ),
  gear: (
    <svg viewBox="0 0 64 64" className="h-full w-full" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="32" cy="32" r="8" />
      <path d="M32 14v6M32 44v6M14 32h6M44 32h6M20 20l4 4M40 40l4 4M44 20l-4 4M24 40l-4 4" />
    </svg>
  ),
  assignment: (
    <svg viewBox="0 0 64 64" className="h-full w-full" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <rect x="18" y="14" width="28" height="36" rx="4" />
      <path d="M24 22h16M24 30h16M24 38h10" />
      <path d="M26 14h12l-2 6h-8z" />
    </svg>
  ),
  userCheck: (
    <svg viewBox="0 0 64 64" className="h-full w-full" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="26" cy="26" r="10" />
      <path d="M14 50c4-8 12-12 22-12" />
      <path d="M40 30l4 4 8-8" />
    </svg>
  ),
  network: (
    <svg viewBox="0 0 64 64" className="h-full w-full" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="32" cy="32" r="6" />
      <circle cx="16" cy="20" r="6" />
      <circle cx="48" cy="20" r="6" />
      <circle cx="16" cy="44" r="6" />
      <circle cx="48" cy="44" r="6" />
      <path d="M22 24l6 4M42 24l-6 4M22 40l6-4M42 40l-6-4" />
    </svg>
  ),
  refresh: (
    <svg viewBox="0 0 64 64" className="h-full w-full" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M48 22a18 18 0 1 0 4 12" />
      <path d="M48 14v10h-10" />
    </svg>
  ),
  building: (
    <svg viewBox="0 0 64 64" className="h-full w-full" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 48h36" />
      <path d="M20 48V22l12-8 12 8v26" />
      <path d="M28 30h8M28 38h8" />
    </svg>
  ),
  form: (
    <svg viewBox="0 0 64 64" className="h-full w-full" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <rect x="18" y="14" width="28" height="36" rx="4" />
      <path d="M24 26h16M24 34h10" />
      <path d="M40 36l8 8" />
    </svg>
  ),
  courses: (
    <svg viewBox="0 0 64 64" className="h-full w-full" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <rect x="12" y="18" width="40" height="28" rx="4" />
      <path d="M22 30h12" />
      <path d="M36 34l10-6-10-6z" />
    </svg>
  ),
  fee: (
    <svg viewBox="0 0 64 64" className="h-full w-full" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 34h18l6 6H18" />
      <circle cx="44" cy="22" r="8" />
      <path d="M44 18v8M40 22h8" />
    </svg>
  ),
  feedback: (
    <svg viewBox="0 0 64 64" className="h-full w-full" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 20h32v22H24l-8 8z" />
      <path d="M38 18l2 4 4 1-3 3 1 4-4-2-4 2 1-4-3-3 4-1z" />
    </svg>
  ),
  fees: (
    <svg viewBox="0 0 64 64" className="h-full w-full" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 40h28l6 6H18" />
      <path d="M28 26l12-6 12 6-12 6z" />
      <path d="M32 32v8" />
    </svg>
  ),
  grievance: (
    <svg viewBox="0 0 64 64" className="h-full w-full" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <rect x="12" y="14" width="40" height="28" rx="6" />
      <path d="M32 26v10" />
      <circle cx="32" cy="40" r="2" />
    </svg>
  ),
  lms: (
    <svg viewBox="0 0 64 64" className="h-full w-full" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <rect x="12" y="16" width="40" height="28" rx="4" />
      <path d="M22 48h20" />
      <path d="M26 24h12M26 32h8" />
    </svg>
  ),
  mentor: (
    <svg viewBox="0 0 64 64" className="h-full w-full" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="22" cy="26" r="8" />
      <circle cx="42" cy="30" r="6" />
      <path d="M10 50c4-8 14-12 24-10" />
      <path d="M34 50c2-6 8-10 16-10" />
    </svg>
  ),
  report: (
    <svg viewBox="0 0 64 64" className="h-full w-full" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <rect x="16" y="14" width="32" height="36" rx="4" />
      <circle cx="32" cy="28" r="6" />
      <path d="M24 42h16" />
    </svg>
  ),
  calendar: (
    <svg viewBox="0 0 64 64" className="h-full w-full" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <rect x="14" y="18" width="36" height="30" rx="4" />
      <path d="M22 14v8M42 14v8M14 26h36" />
    </svg>
  ),
  gauge: (
    <svg viewBox="0 0 64 64" className="h-full w-full" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 44a18 18 0 0 1 36 0" />
      <path d="M32 32l10-6" />
      <circle cx="32" cy="44" r="4" />
    </svg>
  ),
  request: (
    <svg viewBox="0 0 64 64" className="h-full w-full" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="22" cy="24" r="8" />
      <path d="M12 48c4-8 12-12 22-12" />
      <path d="M38 30h14M38 38h10" />
    </svg>
  ),
  survey: (
    <svg viewBox="0 0 64 64" className="h-full w-full" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <rect x="14" y="16" width="36" height="32" rx="6" />
      <path d="M22 26h20M22 34h12" />
      <path d="M32 48l6 6" />
    </svg>
  ),
}

const feedbackList = [
  { text: 'Quick response and clear steps for admissions.', rating: 5 },
  { text: 'Needs more details on hostel availability.', rating: 3 },
  { text: 'Great help with fee payment links.', rating: 4 },
]

const systemStatus = [
  { name: 'LLM API', status: 'Operational' },
  { name: 'Database', status: 'Operational' },
  { name: 'ERP Sync', status: 'Delayed' },
  { name: 'Notifications', status: 'Operational' },
]

const ADMIN_REPORT_STATUS_STORAGE_KEY = 'admin_report_statuses'

const getStoredJson = (storageKey, fallbackValue) => {
  try {
    const raw = localStorage.getItem(storageKey)
    return raw ? JSON.parse(raw) : fallbackValue
  } catch {
    return fallbackValue
  }
}

const saveStoredJson = (storageKey, value) => localStorage.setItem(storageKey, JSON.stringify(value))

const DashboardLayout = ({ children, showAdminLink = false, onLogout, currentUser }) => {
  const [sidebarExpanded, setSidebarExpanded] = useState(false)
  const sidebarTimer = useRef()

  const showSidebar = () => {
    window.clearTimeout(sidebarTimer.current)
    setSidebarExpanded(true)
  }

  const hideSidebar = () => {
    sidebarTimer.current = window.setTimeout(() => {
      setSidebarExpanded(false)
    }, 160)
  }

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <aside
        onMouseEnter={showSidebar}
        onMouseLeave={hideSidebar}
        className={`flex w-full flex-row items-center gap-3 bg-[#4f8fe9] px-4 py-3 text-white shadow-inner transition-all duration-200 lg:w-auto lg:flex-col lg:gap-4 lg:px-2 lg:py-4 ${
          sidebarExpanded ? 'lg:w-60' : 'lg:w-[88px]'
        }`}
      >
        <div className="grid h-12 w-12 place-items-center rounded-full border-2 border-white/60 bg-white/20 font-outfit text-[11px] font-semibold tracking-[0.2em] lg:h-14 lg:w-14 lg:text-sm">
          EmS
        </div>
          <nav className={`flex w-full flex-1 flex-row flex-wrap gap-2 ${sidebarExpanded ? 'lg:items-start' : 'lg:items-center'} lg:flex-col`}>
            {sidebarItems.map((item, index) => (
              <button
                key={item.title}
                type="button"
                className={`flex items-center gap-3 rounded-2xl text-left transition ${
                  index === 0 ? 'bg-white/20' : 'hover:bg-white/20'
                } ${sidebarExpanded ? 'lg:w-full lg:justify-start lg:px-2 lg:py-2' : 'lg:w-auto lg:justify-center lg:px-2 lg:py-2'} ${sidebarExpanded ? 'px-2 py-2' : 'px-1 py-1'}`}
              >
                <span className="grid h-10 w-10 place-items-center rounded-xl border border-white/30">
                  <span className="h-6 w-6">{iconMap[item.icon]}</span>
                </span>
                <span
                  className={`whitespace-nowrap text-sm font-semibold transition-all ${
                    sidebarExpanded
                      ? 'opacity-100 translate-x-0 max-w-[180px]'
                      : 'pointer-events-none -translate-x-2 opacity-0 max-w-0'
                  } overflow-hidden`}
                >
                  {item.title}
                </span>
              </button>
            ))}
          </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="grid grid-cols-1 gap-3 border-b border-[#e5edf8] bg-white px-4 py-4 shadow sm:grid-cols-[auto_1fr_auto] sm:items-center sm:px-7 sm:py-0">
          <div className="flex items-center justify-center gap-3 font-outfit text-sm font-semibold text-slate-500 sm:justify-start">
            <button
              type="button"
              onMouseEnter={showSidebar}
              onMouseLeave={hideSidebar}
              onFocus={showSidebar}
              onBlur={hideSidebar}
              onClick={() => setSidebarExpanded((prev) => !prev)}
              className="grid h-9 w-9 place-items-center rounded-lg border border-[#e5edf8] text-lg text-slate-500"
              aria-label="Toggle sidebar"
              aria-expanded={sidebarExpanded}
            >
              &#9776;
            </button>
            <span>Menu</span>
            <span className="text-xs">&#9662;</span>
          </div>
          <div className="flex justify-center">
            <img src="/logo.png" alt="K.R. Mangalam University logo" className="h-12 w-12 object-contain sm:h-14 sm:w-14" />
          </div>
          <div className="flex items-center justify-center gap-3 text-sm font-semibold text-slate-500 sm:justify-end">
            {showAdminLink && (
              <Link
                to="/admin"
                className="rounded-full border border-[#e5edf8] px-3 py-1 text-xs font-semibold text-slate-500"
              >
                Admin
              </Link>
            )}
            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="rounded-full border border-[#e5edf8] px-3 py-1 text-xs font-semibold text-rose-500"
              >
                Logout
              </button>
            )}
            <button type="button" className="grid h-9 w-9 place-items-center rounded-full border border-[#e5edf8] bg-white">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 8a6 6 0 0 1 12 0v5l2 2H4l2-2z" />
                <path d="M9 19a3 3 0 0 0 6 0" />
              </svg>
            </button>
            <span className="h-6 w-px bg-[#e5edf8]" />
            <div className="flex flex-col items-end leading-tight">
              <span className="text-sm font-semibold">{currentUser?.displayName || 'Portal User'}</span>
              <span className="text-[11px] uppercase tracking-wide text-slate-400">{currentUser?.personaLabel || 'Student'}</span>
            </div>
            <div className="grid h-9 w-9 place-items-center rounded-full bg-[#e8f0ff] text-[#1f4ea7]">
              {(currentUser?.displayName || 'P').slice(0, 1).toUpperCase()}
            </div>
          </div>
        </header>

        <div className="flex items-center justify-center gap-3 bg-gradient-to-r from-[#f0f2f6] to-[#dfe3ea] px-4 py-2 text-sm font-semibold text-slate-700 shadow-inner sm:px-7">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
          School of Engineering &amp; Technology
          <span className="ml-auto text-lg text-slate-400">&#10005;</span>
        </div>

        <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  )
}

const AdminDashboard = ({ adminToken, onUnauthorized }) => {
  const [stats, setStats] = useState(null)
  const [recentQueries, setRecentQueries] = useState([])
  const [topIntents, setTopIntents] = useState([])
  const [adminUsers, setAdminUsers] = useState([])
  const [flaggedReports, setFlaggedReports] = useState([])
  const [feedbackEntries, setFeedbackEntries] = useState([])
  const [announcements, setAnnouncements] = useState([])
  const [reportStatuses, setReportStatuses] = useState(() => getStoredJson(ADMIN_REPORT_STATUS_STORAGE_KEY, {}))
  const [announcementDraft, setAnnouncementDraft] = useState({
    title: '',
    message: '',
    audience: 'students',
  })
  const [announcementStatus, setAnnouncementStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    saveStoredJson(ADMIN_REPORT_STATUS_STORAGE_KEY, reportStatuses)
  }, [reportStatuses])

  useEffect(() => {
    let mounted = true

    const loadAdminData = async (quiet = false) => {
      if (!quiet) {
        setLoading(true)
      }
      try {
        const headers = adminToken ? { Authorization: `Bearer ${adminToken}` } : {}
        const [statsRes, recentRes, intentsRes, usersRes, reportsRes, feedbackRes, announcementsRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/admin/stats`, { headers }),
          fetch(`${API_BASE_URL}/api/admin/recent-queries`, { headers }),
          fetch(`${API_BASE_URL}/api/admin/top-intents`, { headers }),
          fetch(`${API_BASE_URL}/api/admin/users`, { headers }),
          fetch(`${API_BASE_URL}/api/admin/reports`, { headers }),
          fetch(`${API_BASE_URL}/api/admin/feedback`, { headers }),
          fetch(`${API_BASE_URL}/api/admin/announcements`, { headers }),
        ])

        if (
          statsRes.status === 401 ||
          recentRes.status === 401 ||
          intentsRes.status === 401 ||
          usersRes.status === 401 ||
          reportsRes.status === 401 ||
          feedbackRes.status === 401 ||
          announcementsRes.status === 401
        ) {
          if (onUnauthorized) {
            onUnauthorized()
          }
          return
        }

        if (!statsRes.ok || !recentRes.ok || !intentsRes.ok || !usersRes.ok || !reportsRes.ok || !feedbackRes.ok || !announcementsRes.ok) {
          throw new Error('Failed to load admin analytics')
        }

        const [statsPayload, recentPayload, intentsPayload, usersPayload, reportsPayload, feedbackPayload, announcementsPayload] = await Promise.all([
          statsRes.json(),
          recentRes.json(),
          intentsRes.json(),
          usersRes.json(),
          reportsRes.json(),
          feedbackRes.json(),
          announcementsRes.json(),
        ])

        if (!mounted) return
        setError('')
        setStats(statsPayload)
        setRecentQueries(Array.isArray(recentPayload) ? recentPayload : [])
        setTopIntents(Array.isArray(intentsPayload) ? intentsPayload : [])
        setAdminUsers(Array.isArray(usersPayload) ? usersPayload : [])
        setFlaggedReports(Array.isArray(reportsPayload) ? reportsPayload : [])
        setFeedbackEntries(Array.isArray(feedbackPayload) ? feedbackPayload : [])
        setAnnouncements(Array.isArray(announcementsPayload) ? announcementsPayload : [])
      } catch {
        if (!mounted) return
        setError('Unable to load live admin controls right now.')
      } finally {
        if (mounted && !quiet) {
          setLoading(false)
        }
      }
    }

    loadAdminData(false)
    const timer = window.setInterval(() => {
      loadAdminData(true)
    }, 15000)

    return () => {
      mounted = false
      window.clearInterval(timer)
    }
  }, [adminToken, onUnauthorized])

  const statsCards = [
    { label: 'Total Queries', value: String(stats?.total_queries ?? 0), trend: 'Assistant responses logged' },
    { label: 'Active Users', value: String(stats?.active_users ?? 0), trend: 'Unique users in sessions' },
    { label: 'Avg Response', value: `${stats?.avg_latency_ms ?? 0} ms`, trend: 'Average assistant latency' },
    { label: 'CSAT Score', value: stats?.csat ? `${stats.csat}/5` : 'N/A', trend: 'From feedback ratings' },
  ]

  const maxIntentValue = Math.max(1, ...topIntents.map((intent) => intent.value || 0))
  const visibleReports = flaggedReports.filter((item) => reportStatuses[item.report_id] !== 'resolved')
  const activeAnnouncements = announcements.slice().sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))
  const mergedFeedbackEntries =
    feedbackEntries.length > 0
      ? feedbackEntries
      : feedbackList.map((item, index) => ({
          message_id: `demo-feedback-${index + 1}`,
          rating: item.rating,
          comment: item.text,
          created_at: null,
        }))

  const setUserFlag = async (userId, updates) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/users/${encodeURIComponent(userId)}/state`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify(updates),
      })
      if (response.status === 401) {
        if (onUnauthorized) onUnauthorized()
        return
      }
      if (!response.ok) {
        throw new Error('User update failed')
      }
      const payload = await response.json()
      setAdminUsers((current) => current.map((item) => (item.user_id === userId ? payload : item)))
    } catch {
      setError('Could not update the selected portal user right now.')
    }
  }

  const markReportResolved = (reportId) => {
    setReportStatuses((current) => ({ ...current, [reportId]: 'resolved' }))
  }

  const saveFeedbackReview = async (messageId, updates) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/feedback/${encodeURIComponent(messageId)}/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          reviewed: Boolean(updates.reviewed),
          note: updates.note || '',
        }),
      })
      if (response.status === 401) {
        if (onUnauthorized) onUnauthorized()
        return
      }
      if (!response.ok) {
        throw new Error('Feedback review save failed')
      }
      const payload = await response.json()
      setFeedbackEntries((current) => current.map((item) => (item.message_id === messageId ? payload : item)))
    } catch {
      setError('Could not save the feedback review right now.')
    }
  }

  const publishAnnouncement = async () => {
    if (!announcementDraft.title.trim() || !announcementDraft.message.trim()) {
      setAnnouncementStatus('Please add both a title and a message before sending the alert.')
      return
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/announcements`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify(announcementDraft),
      })

      if (response.status === 401) {
        if (onUnauthorized) {
          onUnauthorized()
        }
        return
      }

      if (!response.ok) {
        throw new Error('Announcement failed')
      }

      const payload = await response.json()
      setAnnouncements((current) => [
        {
          announcement_id: payload.announcement_id,
          title: announcementDraft.title,
          message: announcementDraft.message,
          audience: announcementDraft.audience,
          created_at: new Date().toISOString(),
          status: payload.status,
        },
        ...current,
      ])
      setAnnouncementDraft({ title: '', message: '', audience: 'students' })
      setAnnouncementStatus('Announcement queued for chatbot delivery preview.')
    } catch {
      setAnnouncementStatus('Could not queue the announcement right now.')
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">Admin Dashboard</h2>
          <p className="text-sm text-slate-500">Monitor chatbot performance, usage, and system health.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" className="rounded-full border border-[#e5edf8] bg-white px-4 py-2 text-sm font-semibold text-slate-600">
            Export
          </button>
          <button type="button" className="rounded-full bg-royal px-4 py-2 text-sm font-semibold text-white shadow">
            Add Report
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statsCards.map((item) => (
          <div key={item.label} className="rounded-2xl border border-[#e5edf8] bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{item.label}</p>
            <p className="mt-2 text-2xl font-semibold text-slate-800">{loading ? '...' : item.value}</p>
            <p className="mt-1 text-xs text-slate-500">{item.trend}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="rounded-2xl border border-[#e5edf8] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700">Recent Queries</h3>
            <button type="button" className="text-xs font-semibold text-royal">View all</button>
          </div>
          <div className="mt-4 overflow-hidden rounded-xl border border-[#eef2f8]">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#f8faff] text-xs uppercase text-slate-400">
                <tr>
                  <th className="px-4 py-3">Session</th>
                  <th className="px-4 py-3">Query</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Created</th>
                </tr>
              </thead>
              <tbody>
                {recentQueries.length === 0 && !loading ? (
                  <tr className="border-t border-[#eef2f8] text-slate-500">
                    <td className="px-4 py-3" colSpan={4}>No recent queries found.</td>
                  </tr>
                ) : (
                  recentQueries.map((item, index) => (
                    <tr key={`${item.session_id}-${index}`} className="border-t border-[#eef2f8] text-slate-600">
                      <td className="px-4 py-3 font-semibold text-slate-700">{item.session_id || '-'}</td>
                      <td className="px-4 py-3">{item.query || '-'}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600">
                          Logged
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400">
                        {item.created_at ? new Date(item.created_at).toLocaleString() : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-[#e5edf8] bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-700">Top Intents</h3>
            <div className="mt-4 space-y-3">
              {topIntents.length === 0 && !loading ? (
                <p className="text-sm text-slate-500">No intent data available yet.</p>
              ) : (
                topIntents.map((intent) => (
                  <div key={intent.name} className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-600">{intent.name}</span>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-24 rounded-full bg-[#eef2f8]">
                        <div
                          className="h-2 rounded-full bg-royal"
                          style={{ width: `${Math.max(8, Math.round(((intent.value || 0) / maxIntentValue) * 100))}%` }}
                        />
                      </div>
                      <span className="text-xs text-slate-400">{intent.value || 0}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-[#e5edf8] bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-700">System Status</h3>
            <div className="mt-4 space-y-3 text-sm">
              {systemStatus.map((item) => (
                <div key={item.name} className="flex items-center justify-between">
                  <span className="text-slate-600">{item.name}</span>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      item.status === 'Operational' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-[#e5edf8] bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-700">Recent Feedback</h3>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {feedbackList.map((item, index) => (
            <div key={item.text} className="rounded-2xl border border-[#eef2f8] bg-[#f8faff] p-4">
              <p className="text-sm text-slate-600">{item.text}</p>
              <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-amber-500">
                {'*'.repeat(item.rating)}
                <span className="text-slate-400">{index + 1}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-[#e5edf8] bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-800">User Accounts & Verification</h3>
              <p className="mt-1 text-sm text-slate-500">
                Manage student and staff accounts, verify users, and keep access safe.
              </p>
            </div>
            <span className="rounded-full bg-[#f1f6ff] px-3 py-1 text-xs font-semibold text-[#1f4ea7]">
              {adminUsers.length} users
            </span>
          </div>
          <div className="mt-5 space-y-3">
            {adminUsers.slice(0, 8).map((user) => {
              const isVerified = Boolean(user.verified)
              const isBlocked = Boolean(user.blocked)
              return (
                <div key={user.user_id} className="rounded-2xl border border-[#eef2f8] bg-[#fcfdff] p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{user.name}</p>
                      <p className="text-xs text-slate-500">{user.email || user.user_id}</p>
                      <p className="mt-1 text-xs uppercase tracking-wide text-slate-400">
                        {user.persona} {user.semester ? `• Sem ${user.semester}` : ''}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${isVerified ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                        {isVerified ? 'Verified' : 'Pending'}
                      </span>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${isBlocked ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-500'}`}>
                        {isBlocked ? 'Blocked' : 'Active'}
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setUserFlag(user.user_id, { verified: !isVerified })}
                      className="rounded-xl bg-emerald-700 px-3 py-2 text-xs font-semibold text-white"
                    >
                      {isVerified ? 'Unverify' : 'Verify User'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setUserFlag(user.user_id, { blocked: !isBlocked })}
                      className="rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-500"
                    >
                      {isBlocked ? 'Restore Access' : 'Block Account'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-[#e5edf8] bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-800">Misuse & Inappropriate Query Reports</h3>
              <p className="mt-1 text-sm text-slate-500">
                Review flagged chatbot queries and resolve misuse reports.
              </p>
            </div>
            <span className="rounded-full bg-[#fff7ed] px-3 py-1 text-xs font-semibold text-amber-600">
              {visibleReports.length} open
            </span>
          </div>
          <div className="mt-5 space-y-3">
            {visibleReports.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#d8e3f5] bg-[#f8faff] px-4 py-5 text-sm text-slate-500">
                No flagged misuse reports right now.
              </div>
            ) : (
              visibleReports.map((report) => (
                <div key={report.report_id} className="rounded-2xl border border-[#eef2f8] bg-[#fcfdff] p-4">
                  <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{report.reason}</p>
                      <p className="mt-1 text-sm text-slate-600">{report.query}</p>
                      <p className="mt-2 text-xs text-slate-400">
                        Session: {report.session_id || '-'} {report.created_at ? `• ${new Date(report.created_at).toLocaleString()}` : ''}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => markReportResolved(report.report_id)}
                      className="rounded-xl bg-royal px-3 py-2 text-xs font-semibold text-white"
                    >
                      Mark Resolved
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-2xl border border-[#e5edf8] bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-800">Announcements & Alerts</h3>
              <p className="mt-1 text-sm text-slate-500">
                Send important announcements or alerts to portal users through the chatbot workflow.
              </p>
            </div>
            <span className="rounded-full bg-[#eef6ff] px-3 py-1 text-xs font-semibold text-royal">
              Chatbot notices
            </span>
          </div>

          <div className="mt-5 grid gap-3">
            <input
              type="text"
              value={announcementDraft.title}
              onChange={(event) => setAnnouncementDraft((current) => ({ ...current, title: event.target.value }))}
              placeholder="Announcement title"
              className="rounded-2xl border border-[#dbe4f4] px-4 py-3 text-sm outline-none focus:border-royal"
            />
            <textarea
              value={announcementDraft.message}
              onChange={(event) => setAnnouncementDraft((current) => ({ ...current, message: event.target.value }))}
              placeholder="Write the alert or notice students should receive."
              rows={4}
              className="rounded-2xl border border-[#dbe4f4] px-4 py-3 text-sm outline-none focus:border-royal"
            />
            <div className="flex flex-col gap-3 sm:flex-row">
              <select
                value={announcementDraft.audience}
                onChange={(event) => setAnnouncementDraft((current) => ({ ...current, audience: event.target.value }))}
                className="rounded-2xl border border-[#dbe4f4] px-4 py-3 text-sm outline-none focus:border-royal"
              >
                <option value="students">Students</option>
                <option value="faculty">Faculty</option>
                <option value="all">All Users</option>
              </select>
              <button
                type="button"
                onClick={publishAnnouncement}
                className="rounded-2xl bg-royal px-5 py-3 text-sm font-semibold text-white shadow"
              >
                Send Announcement
              </button>
            </div>
            {announcementStatus && (
              <p className="text-sm text-slate-500">{announcementStatus}</p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-[#e5edf8] bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-800">Recent Announcements</h3>
          <div className="mt-4 space-y-3">
            {activeAnnouncements.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#d8e3f5] bg-[#f8faff] px-4 py-5 text-sm text-slate-500">
                No announcements have been sent yet.
              </div>
            ) : (
              activeAnnouncements.slice(0, 4).map((item) => (
                <div key={item.id} className="rounded-2xl border border-[#eef2f8] bg-[#f8faff] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-800">{item.title}</p>
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase text-emerald-600">
                      {item.audience}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{item.message}</p>
                  <p className="mt-2 text-xs text-slate-400">
                    {item.created_at ? new Date(item.created_at).toLocaleString() : 'Queued'} • {item.status || 'queued'}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-[#e5edf8] bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-800">Feedback Review & Content Updates</h3>
            <p className="mt-1 text-sm text-slate-500">
              Review student feedback on chatbot answers and track content corrections.
            </p>
          </div>
          <span className="rounded-full bg-[#fff7ed] px-3 py-1 text-xs font-semibold text-amber-600">
            {mergedFeedbackEntries.length} items
          </span>
        </div>
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {mergedFeedbackEntries.map((item) => {
            return (
              <div key={item.message_id} className="rounded-2xl border border-[#eef2f8] bg-[#fcfdff] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-slate-800">Message ID: {item.message_id}</div>
                  <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-600">
                    {item.rating}/5
                  </span>
                </div>
                <p className="mt-3 text-sm text-slate-600">{item.comment || 'No written feedback provided.'}</p>
                <textarea
                  value={item.review_note || ''}
                  onChange={(event) =>
                    setFeedbackEntries((current) =>
                      current.map((entry) =>
                        entry.message_id === item.message_id ? { ...entry, review_note: event.target.value } : entry
                      )
                    )
                  }
                  placeholder="Admin update note: corrected topic, refreshed dataset, or reviewed response."
                  rows={3}
                  className="mt-4 w-full rounded-2xl border border-[#dbe4f4] px-4 py-3 text-sm outline-none focus:border-royal"
                />
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => saveFeedbackReview(item.message_id, { reviewed: !item.reviewed, note: item.review_note || '' })}
                    className="rounded-xl bg-emerald-700 px-3 py-2 text-xs font-semibold text-white"
                  >
                    {item.reviewed ? 'Reviewed' : 'Mark Reviewed'}
                  </button>
                  {item.reviewed && (
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600">
                      Content update tracked
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
const ChatbotPanel = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const initialAuth = getStoredPortalAuth()
  const initialPersona = initialAuth?.persona || localStorage.getItem('active_persona') || DEFAULT_PERSONA
  const initialUserId = initialAuth?.userId || localStorage.getItem('portal_user_id') || localStorage.getItem('student_id') || DEFAULT_STUDENT_ID
  const [selectedPersona] = useState(initialPersona)
  const [messages, setMessages] = useState([getWelcomeMessage(initialPersona)])
  const [input, setInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [feedbackStatus, setFeedbackStatus] = useState({})
  const [reviewStatuses, setReviewStatuses] = useState({})
  const [userAnnouncements, setUserAnnouncements] = useState([])
  const [quickActions, setQuickActions] = useState(defaultQuickActionsByPersona[initialPersona] || defaultQuickActions)
  const [chatHydrated, setChatHydrated] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [historyThreads, setHistoryThreads] = useState([])
  const [viewedThreadKey, setViewedThreadKey] = useState(null)
  const endRef = useRef(null)
  const messageScrollRef = useRef(null)
  const historyScrollRef = useRef(null)
  const studentIdRef = useRef(initialUserId)
  const sessionIdRef = useRef(localStorage.getItem('chat_session_id') || `web-${Date.now()}`)
  const routeContextRef = useRef(getStoredRouteContext())
  const activeSuggestionChips = suggestionChipsByPersona[selectedPersona] || suggestionChipsByPersona.student
  const ownerKeyRef = useRef(`${initialPersona}:${initialUserId}`)
  const currentDateKeyRef = useRef(getLocalDateKey())

  useEffect(() => {
    localStorage.setItem('chat_session_id', sessionIdRef.current)
    localStorage.setItem('student_id', studentIdRef.current)
  }, [])

  useEffect(() => {
    const activeAuth = getStoredPortalAuth()
    const activeStudentId = activeAuth?.userId || localStorage.getItem('portal_user_id') || localStorage.getItem('student_id') || DEFAULT_STUDENT_ID
    const activePersona = localStorage.getItem('active_persona') || selectedPersona || DEFAULT_PERSONA
    const chatOwnerKey = localStorage.getItem('chat_owner_key')
    const currentOwnerKey = `${activePersona}:${activeStudentId}`
    const todayKey = getLocalDateKey()
    const todayThreadKey = getThreadKey(currentOwnerKey, todayKey)
    const storedThreads = getStoredChatThreads()
    const todayThread = storedThreads.find((item) => item?.threadKey === todayThreadKey)
    ownerKeyRef.current = currentOwnerKey
    currentDateKeyRef.current = todayKey
    setViewedThreadKey(todayThreadKey)

    // Reset once when user identity or persona changes, then preserve history for that combination.
    if (chatOwnerKey !== currentOwnerKey) {
      studentIdRef.current = activeStudentId
      sessionIdRef.current = `web-${Date.now()}`
      localStorage.setItem('chat_owner_key', currentOwnerKey)
      localStorage.setItem('chat_session_id', sessionIdRef.current)
      localStorage.setItem('student_id', activeStudentId)
      localStorage.setItem('active_persona', activePersona)
      localStorage.removeItem('chat_route_context')
      routeContextRef.current = null
      const welcome = [getWelcomeMessage(activePersona)]
      localStorage.setItem('chat_messages', JSON.stringify(welcome))
      upsertChatThread({
        threadKey: todayThreadKey,
        ownerKey: currentOwnerKey,
        dateKey: todayKey,
        sessionId: sessionIdRef.current,
        persona: activePersona,
        userId: activeStudentId,
        title: 'Today',
        preview: buildThreadPreview(welcome),
        messages: welcome,
        routeContext: null,
        lastUpdatedAt: new Date().toISOString(),
      })
      setHistoryThreads(getStoredChatThreads().filter((item) => item?.ownerKey === currentOwnerKey))
      setMessages(welcome)
      setChatHydrated(true)
      return
    }

    if (todayThread?.sessionId) {
      sessionIdRef.current = todayThread.sessionId
      localStorage.setItem('chat_session_id', sessionIdRef.current)
    }
    if (todayThread?.routeContext) {
      routeContextRef.current = todayThread.routeContext
      localStorage.setItem('chat_route_context', JSON.stringify(todayThread.routeContext))
    } else {
      routeContextRef.current = getStoredRouteContext()
    }

    if (!todayThread?.messages?.length) {
      const welcome = [getWelcomeMessage(activePersona)]
      localStorage.setItem('chat_messages', JSON.stringify(welcome))
      upsertChatThread({
        threadKey: todayThreadKey,
        ownerKey: currentOwnerKey,
        dateKey: todayKey,
        sessionId: sessionIdRef.current,
        persona: activePersona,
        userId: activeStudentId,
        title: 'Today',
        preview: buildThreadPreview(welcome),
        messages: welcome,
        routeContext: routeContextRef.current,
        lastUpdatedAt: new Date().toISOString(),
      })
      setMessages(welcome)
      setHistoryThreads(getStoredChatThreads().filter((item) => item?.ownerKey === currentOwnerKey))
      setChatHydrated(true)
      return
    }
    setMessages(todayThread.messages)
    setHistoryThreads(storedThreads.filter((item) => item?.ownerKey === currentOwnerKey))
    setChatHydrated(true)
  }, [selectedPersona])

  useEffect(() => {
    if (!chatHydrated) return
    localStorage.setItem('chat_messages', JSON.stringify(messages))
    const ownerKey = ownerKeyRef.current
    const dateKey = currentDateKeyRef.current
    const threadKey = getThreadKey(ownerKey, dateKey)
    const activeThread = {
      threadKey,
      ownerKey,
      dateKey,
      sessionId: sessionIdRef.current,
      persona: selectedPersona,
      userId: studentIdRef.current,
      title: dateKey === getLocalDateKey() ? 'Today' : dateKey,
      preview: buildThreadPreview(messages),
      messages,
      routeContext: routeContextRef.current,
      lastUpdatedAt: new Date().toISOString(),
    }
    upsertChatThread(activeThread)
    setHistoryThreads(getStoredChatThreads().filter((item) => item?.ownerKey === ownerKey))
  }, [chatHydrated, messages, selectedPersona])

  useEffect(() => {
    let active = true
    const loadQuickActions = async () => {
      setQuickActions(defaultQuickActionsByPersona[selectedPersona] || defaultQuickActions)
      try {
        const response = await fetch(`${API_BASE_URL}/api/portal/quick-actions?role=${encodeURIComponent(selectedPersona)}`, {
          headers: {
            'X-Student-Id': studentIdRef.current,
          },
        })
        if (!response.ok) return
        const payload = await response.json()
        const actions = Array.isArray(payload?.actions)
          ? payload.actions
              .filter((item) => item && item.label && item.query)
              .map((item) => ({
                label: item.label,
                query: item.query,
                tone: item.tone || 'General',
              }))
          : []
        if (active && actions.length > 0) {
          setQuickActions(actions)
        }
      } catch {
        // keep default quick actions
      }
    }
    loadQuickActions()
    return () => {
      active = false
    }
  }, [selectedPersona])

  useEffect(() => {
    let active = true
    const loadAnnouncements = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/portal/announcements?role=${encodeURIComponent(selectedPersona)}`, {
          headers: {
            'X-Student-Id': studentIdRef.current,
          },
        })
        if (!response.ok) return
        const payload = await response.json()
        if (active) {
          setUserAnnouncements(Array.isArray(payload) ? payload : [])
        }
      } catch {
        // keep announcements empty
      }
    }
    loadAnnouncements()
    return () => {
      active = false
    }
  }, [selectedPersona])

  useEffect(() => {
    const messageIds = messages
      .filter((item) => item?.role === 'bot' && item?.messageId)
      .map((item) => item.messageId)
    if (messageIds.length === 0) {
      setReviewStatuses({})
      return
    }

    let active = true
    const loadReviewStatuses = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/feedback/reviews?message_ids=${encodeURIComponent(messageIds.join(','))}`, {
          headers: {
            'X-Student-Id': studentIdRef.current,
          },
        })
        if (!response.ok) return
        const payload = await response.json()
        if (active && payload && typeof payload === 'object') {
          setReviewStatuses(payload)
        }
      } catch {
        // keep review statuses empty
      }
    }
    loadReviewStatuses()
    return () => {
      active = false
    }
  }, [messages])

  const formatAssignmentSummary = (payload) => {
    if (!payload || !Array.isArray(payload.assignments) || payload.assignments.length === 0) {
      return 'No open due assignments found right now.'
    }

    if (payload.subject) {
      const lines = [`Assignments for ${payload.subject}:`]
      payload.assignments.forEach((item) => {
        lines.push(`- ${item.title} | Due: ${item.due_date} | Status: ${item.status}`)
      })
      return lines.join('\n')
    }

    const grouped = payload.assignments.reduce((acc, item) => {
      const key = item.subject || 'Unknown'
      if (!acc[key]) acc[key] = []
      acc[key].push(item)
      return acc
    }, {})

    const lines = ['Assignments (All Subjects):']
    Object.entries(grouped).forEach(([subjectName, rows]) => {
      lines.push(`${subjectName}:`)
      rows.forEach((item) => {
        lines.push(`- ${item.title} | Due: ${item.due_date} | Status: ${item.status}`)
      })
    })
    return lines.join('\n')
  }

  const removeRawUrls = (text) => {
    if (!text) return ''
    return String(text)
      .replace(/https?:\/\/[^\s]+/gi, '')
      .replace(/(\/[A-Za-z0-9._-]+){2,}/g, '')
      .replace(/\s{2,}/g, ' ')
      .trim()
  }

  const safeBotText = (text) => {
    const cleaned = removeRawUrls(text)
    return cleaned || 'Here is the information you requested.'
  }

  const sendFeedback = async (messageId, rating) => {
    if (!messageId || feedbackStatus[messageId]) return

    setFeedbackStatus((prev) => ({ ...prev, [messageId]: 'sending' }))
    try {
      const response = await fetch(`${API_BASE_URL}/api/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Student-Id': studentIdRef.current,
        },
        body: JSON.stringify({
          message_id: String(messageId),
          rating,
        }),
      })
      if (!response.ok) {
        throw new Error('Feedback request failed')
      }
      setFeedbackStatus((prev) => ({ ...prev, [messageId]: 'done' }))
    } catch {
      setFeedbackStatus((prev) => ({ ...prev, [messageId]: 'error' }))
    }
  }

  const sendMessage = async (text) => {
    const cleaned = text.trim()
    if (!cleaned || isSending) return
    if (viewedThreadKey && viewedThreadKey !== getThreadKey(ownerKeyRef.current, currentDateKeyRef.current)) {
      const currentThreads = getStoredChatThreads()
      const todayThread = currentThreads.find((item) => item?.threadKey === getThreadKey(ownerKeyRef.current, currentDateKeyRef.current))
      setViewedThreadKey(getThreadKey(ownerKeyRef.current, currentDateKeyRef.current))
      setMessages(todayThread?.messages?.length ? todayThread.messages : [getWelcomeMessage(selectedPersona)])
    }
    const rewrittenQuery = inferFollowUpQuery(cleaned, routeContextRef.current)
    const effectiveQuery = rewrittenQuery || cleaned
    const effectivePage =
      location.pathname === '/' && routeContextRef.current?.page
        ? routeContextRef.current.page
        : location.pathname
    const history = messages
      .filter((item) => item?.role === 'user' || item?.role === 'bot')
      .slice(-6)
      .map((item) => ({ role: item.role, text: item.text }))

    const userMessage = {
      id: Date.now(),
      role: 'user',
      text: cleaned,
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsSending(true)

    try {
      const routeRes = await fetch(`${API_BASE_URL}/api/query/route`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Student-Id': studentIdRef.current,
        },
        body: JSON.stringify({
          message: effectiveQuery,
          session_id: sessionIdRef.current,
          user_id: studentIdRef.current,
          role: selectedPersona,
          current_page: effectivePage,
        }),
      })

      if (!routeRes.ok) {
        let detail = 'Route request failed'
        try {
          const payload = await routeRes.json()
          if (payload?.detail) {
            detail = payload.detail
          }
        } catch {
          // keep fallback detail
        }
        throw new Error(detail)
      }

      const routePayload = await routeRes.json()

      if (routePayload.action === 'navigate' && routePayload.navigation?.url) {
        const targetLabel = routePayload.navigation.label || 'requested section'
        routeContextRef.current = {
          intent: routePayload.intent,
          subject: routePayload?.data?.subject || null,
          page: routePayload.navigation.url,
        }
        localStorage.setItem('chat_route_context', JSON.stringify(routeContextRef.current))
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now() + 1,
            messageId: null,
            role: 'bot',
            text: safeBotText(ENABLE_DIRECT_REDIRECT
              ? `Opening ${targetLabel}.`
              : `${targetLabel} is ready.`),
          },
        ])

        if (ENABLE_DIRECT_REDIRECT) {
          window.setTimeout(() => {
            navigate(routePayload.navigation.url)
          }, 450)
        }
        return
      }

      if (routePayload.action === 'assignment_summary') {
        const assignmentRes = await fetch(`${API_BASE_URL}/api/assignments/parse-due`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Student-Id': studentIdRef.current,
          },
          body: JSON.stringify({
            message: effectiveQuery,
            current_page: effectivePage,
          }),
        })

        if (!assignmentRes.ok) {
          throw new Error('Assignment parse request failed')
        }

        const assignmentPayload = await assignmentRes.json()
        routeContextRef.current = {
          intent: routePayload.intent,
          subject: assignmentPayload?.subject || routePayload?.data?.subject || null,
          page: routePayload.navigation?.url || effectivePage,
        }
        localStorage.setItem('chat_route_context', JSON.stringify(routeContextRef.current))
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now() + 1,
            messageId: null,
            role: 'bot',
            text: safeBotText(formatAssignmentSummary(assignmentPayload)),
          },
        ])
        return
      }

      if (routePayload.action === 'clarify') {
        const suggestions = routePayload?.data?.suggestions?.length
          ? ` Suggestions: ${routePayload.data.suggestions.join(', ')}`
          : ''
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now() + 1,
            messageId: null,
            role: 'bot',
            text: safeBotText(`${routePayload.clarification || 'Please clarify your request.'}${suggestions}`),
          },
        ])
        return
      }

      const chatRes = await fetch(`${API_BASE_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Student-Id': studentIdRef.current,
        },
        body: JSON.stringify({
          session_id: sessionIdRef.current,
          user_id: studentIdRef.current,
          message: effectiveQuery,
          role: selectedPersona,
          language: 'en',
          history,
        }),
      })

      if (!chatRes.ok) {
        let detail = 'Chat request failed'
        try {
          const payload = await chatRes.json()
          if (payload?.detail) {
            detail = payload.detail
          }
        } catch {
          // keep fallback detail
        }
        throw new Error(detail)
      }

      const payload = await chatRes.json()
      setMessages((prev) => [
        ...prev,
        {
          id: payload.message_id || Date.now() + 1,
          messageId: payload.message_id || null,
          role: 'bot',
          text: safeBotText(payload.reply || 'I could not generate a response right now.'),
        },
      ])
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          messageId: null,
          role: 'bot',
          text: safeBotText(err?.message || 'I am having trouble reaching the server right now. Please try again in a moment.'),
        },
      ])
    } finally {
      setIsSending(false)
    }
  }

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const showThread = (thread) => {
    setViewedThreadKey(thread.threadKey)
    setMessages(Array.isArray(thread.messages) && thread.messages.length > 0 ? thread.messages : [getWelcomeMessage(selectedPersona)])
    routeContextRef.current = thread.routeContext || null
    localStorage.setItem('chat_route_context', JSON.stringify(routeContextRef.current))
    setHistoryOpen(false)
  }

  const goToTodayThread = () => {
    const todayKey = getThreadKey(ownerKeyRef.current, currentDateKeyRef.current)
    const thread = getStoredChatThreads().find((item) => item?.threadKey === todayKey)
    setViewedThreadKey(todayKey)
    setMessages(thread?.messages?.length ? thread.messages : [getWelcomeMessage(selectedPersona)])
    routeContextRef.current = thread?.routeContext || null
    if (routeContextRef.current) {
      localStorage.setItem('chat_route_context', JSON.stringify(routeContextRef.current))
    } else {
      localStorage.removeItem('chat_route_context')
    }
    setHistoryOpen(false)
  }

  const startFreshTodayChat = () => {
    const welcome = [getWelcomeMessage(selectedPersona)]
    sessionIdRef.current = `web-${Date.now()}`
    routeContextRef.current = null
    localStorage.setItem('chat_session_id', sessionIdRef.current)
    localStorage.removeItem('chat_route_context')
    setViewedThreadKey(getThreadKey(ownerKeyRef.current, currentDateKeyRef.current))
    setMessages(welcome)
    setInput('')
    upsertChatThread({
      threadKey: getThreadKey(ownerKeyRef.current, currentDateKeyRef.current),
      ownerKey: ownerKeyRef.current,
      dateKey: currentDateKeyRef.current,
      sessionId: sessionIdRef.current,
      persona: selectedPersona,
      userId: studentIdRef.current,
      title: 'Today',
      preview: buildThreadPreview(welcome),
      messages: welcome,
      routeContext: null,
      lastUpdatedAt: new Date().toISOString(),
    })
    setHistoryThreads(getStoredChatThreads().filter((item) => item?.ownerKey === ownerKeyRef.current))
    setHistoryOpen(false)
  }

  const isViewingHistory = viewedThreadKey && viewedThreadKey !== getThreadKey(ownerKeyRef.current, currentDateKeyRef.current)
  const handleForcedScroll = (event) => {
    const target = event.currentTarget
    if (!target) return
    target.scrollTop += event.deltaY
  }
  const inputPlaceholder = isViewingHistory
    ? 'Return to Today to continue chatting'
    : selectedPersona === 'faculty'
      ? 'Ask about classes, reviews, or attendance alerts'
      : 'Ask about attendance, syllabus, fees, or assignments'

  return (
    <div className="grid h-full min-h-0 grid-rows-[auto,minmax(0,1fr),auto] overflow-hidden rounded-[26px] bg-[#f6f0e5] shadow-2xl">
      <div className="flex items-center gap-3 bg-royal px-5 py-4 text-white">
        <button
          type="button"
          onClick={() => setHistoryOpen((prev) => !prev)}
          className="grid h-10 w-10 place-items-center rounded-xl border border-white/20 bg-white/10 text-white"
          aria-label="Toggle chat history"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 4h18M3 12h18M3 20h18" />
          </svg>
        </button>
        <div className="h-11 w-11 rounded-xl bg-white p-1">
          <img src="/logo.png" alt="K.R. Mangalam University" className="h-full w-full rounded-lg object-contain" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-outfit text-lg font-semibold">Campus Guide</h3>
          <div className="flex items-center gap-2 text-xs text-white/80">
            <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
            Online
          </div>
        </div>
        <span className="rounded-full border border-white/30 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white/90">
          {selectedPersona}
        </span>
      </div>

      <div className="relative min-h-0 overflow-hidden">
        {historyOpen && (
          <div className="absolute inset-y-0 left-0 z-10 flex w-[78%] max-w-[260px] min-h-0 flex-col border-r border-[#e5dccb] bg-[#fffaf1] p-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-slate-800">History</h4>
              <button type="button" onClick={() => setHistoryOpen(false)} className="text-sm font-semibold text-slate-500">Close</button>
            </div>
            <button
              type="button"
              onClick={startFreshTodayChat}
              className="mt-3 w-full rounded-2xl bg-royal px-3 py-3 text-left text-sm font-semibold text-white shadow-sm"
            >
              New Chat
            </button>
            <button
              type="button"
              onClick={goToTodayThread}
              className={`mt-4 w-full rounded-2xl border px-3 py-3 text-left text-sm ${!isViewingHistory ? 'border-royal bg-white text-slate-800' : 'border-[#eadfcf] bg-white/70 text-slate-700'}`}
            >
              <p className="font-semibold">{formatThreadLabel(currentDateKeyRef.current)}</p>
              <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                {historyThreads.find((item) => item?.threadKey === getThreadKey(ownerKeyRef.current, currentDateKeyRef.current))?.preview || 'Current conversation'}
              </p>
            </button>
            <div
              ref={historyScrollRef}
              onWheel={handleForcedScroll}
              className="chat-scroll-region mt-4 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1"
            >
              {historyThreads
                .filter((item) => item?.threadKey !== getThreadKey(ownerKeyRef.current, currentDateKeyRef.current))
                .map((thread) => (
                  <button
                    key={thread.threadKey}
                    type="button"
                    onClick={() => showThread(thread)}
                    className={`w-full rounded-2xl border px-3 py-3 text-left text-sm ${
                      viewedThreadKey === thread.threadKey ? 'border-royal bg-white text-slate-800' : 'border-[#eadfcf] bg-white/70 text-slate-700'
                    }`}
                  >
                    <p className="font-semibold">{formatThreadLabel(thread.dateKey)}</p>
                    <p className="mt-1 line-clamp-3 text-xs text-slate-500">{thread.preview}</p>
                  </button>
                ))}
              {historyThreads.filter((item) => item?.threadKey !== getThreadKey(ownerKeyRef.current, currentDateKeyRef.current)).length === 0 && (
                <p className="text-xs text-slate-500">Previous-day chats will appear here.</p>
              )}
            </div>
          </div>
        )}

        <div
          ref={messageScrollRef}
          onWheel={handleForcedScroll}
          className="chat-scroll-region h-full min-h-0 overflow-y-scroll px-5 py-4"
          style={{ overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' }}
        >
          <div className="space-y-5">
            {userAnnouncements.length > 0 && (
              <div className="space-y-2">
                {userAnnouncements.slice(0, 2).map((item) => (
                  <div key={item.announcement_id} className="rounded-2xl border border-[#ead9b4] bg-[#fff6df] px-4 py-3 text-sm text-slate-700 shadow-sm">
                    <p className="font-semibold text-slate-800">{item.title}</p>
                    <p className="mt-1">{item.message}</p>
                  </div>
                ))}
              </div>
            )}
            {isViewingHistory && (
              <div className="rounded-2xl border border-[#e9decc] bg-white px-4 py-3 text-xs font-semibold text-slate-600 shadow-sm">
                You are viewing an older conversation. Return to Today to continue chatting.
              </div>
            )}
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
              {activeSuggestionChips.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => sendMessage(chip)}
                  className="rounded-full border border-[#d7d7d7] bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-royal hover:text-royal"
                >
                  {chip}
                </button>
              ))}
              </div>
            </div>

            {messages.map((message) => (
              <div key={message.id} className={message.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                <div className="max-w-[80%]">
                  <div
                    className={
                      message.role === 'user'
                        ? 'rounded-2xl rounded-br-md bg-royal px-4 py-3 text-sm text-white shadow-lg whitespace-pre-line'
                        : 'rounded-2xl rounded-bl-md bg-white px-4 py-3 text-sm text-slate-800 shadow whitespace-pre-line'
                    }
                  >
                    {message.text}
                  </div>
                  {message.role === 'bot' && message.messageId && (
                    <div className="mt-2 flex items-center gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => sendFeedback(message.messageId, 5)}
                        disabled={feedbackStatus[message.messageId] === 'sending' || feedbackStatus[message.messageId] === 'done'}
                        className="rounded-full border border-[#d7d7d7] bg-white px-3 py-1 text-slate-600 disabled:opacity-50"
                      >
                        Like
                      </button>
                      <button
                        type="button"
                        onClick={() => sendFeedback(message.messageId, 1)}
                        disabled={feedbackStatus[message.messageId] === 'sending' || feedbackStatus[message.messageId] === 'done'}
                        className="rounded-full border border-[#d7d7d7] bg-white px-3 py-1 text-slate-600 disabled:opacity-50"
                      >
                        Dislike
                      </button>
                      {feedbackStatus[message.messageId] === 'done' && <span className="text-emerald-600">Feedback saved</span>}
                      {feedbackStatus[message.messageId] === 'error' && <span className="text-rose-600">Try again</span>}
                    </div>
                  )}
                  {message.role === 'bot' && message.messageId && reviewStatuses[message.messageId]?.reviewed && (
                    <div className="mt-2 rounded-2xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                      <p className="font-semibold">Admin reviewed this response.</p>
                      {reviewStatuses[message.messageId]?.note && (
                        <p className="mt-1 text-emerald-700/90">{reviewStatuses[message.messageId].note}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}

            <div className="rounded-2xl border border-[#e9decc] bg-white shadow-sm">
              <div className="border-b border-[#efe6d8] px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Quick Actions</div>
              {quickActions.map((item, index) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => sendMessage(item.query)}
                  className={`flex w-full items-center justify-between px-4 py-3 text-left transition hover:bg-[#faf4ea] ${
                    index !== quickActions.length - 1 ? 'border-b border-[#efe6d8]' : ''
                  }`}
                >
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-semibold text-slate-800">{item.label}</span>
                    <span className="text-xs text-slate-500">{item.tone}</span>
                  </div>
                  <span className="text-lg font-semibold text-slate-400">&gt;</span>
                </button>
              ))}
            </div>
            <div ref={endRef} />
          </div>
      </div>
      </div>

      <div className="border-t border-[#e6dfd4] bg-[#f6f0e5] px-5 py-4">
        <div className="flex items-center gap-3 rounded-full border border-[#e0d7c8] bg-white px-4 py-2 shadow">
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                sendMessage(input)
              }
            }}
            disabled={isViewingHistory}
            placeholder={inputPlaceholder}
            className="flex-1 bg-transparent text-sm text-slate-700 outline-none"
          />
          <button
            type="button"
            onClick={() => sendMessage(input)}
            disabled={isSending || isViewingHistory}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-[#d4a650] text-slate-900 shadow disabled:cursor-not-allowed disabled:opacity-60"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 2 11 13" />
              <path d="m22 2-7 20-4-9-9-4Z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
const AdminLogin = ({ onLogin }) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    setLoading(true)
    const success = await onLogin(email, password)
    setLoading(false)
    if (success) {
      setError('')
      setEmail('')
      setPassword('')
      return
    }
    setError('Invalid admin credentials or missing admin role.')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f6f8fc] px-4">
      <div className="w-full max-w-md rounded-3xl border border-[#e5edf8] bg-white p-8 shadow-lg">
        <h2 className="text-xl font-semibold text-slate-800">Admin Access</h2>
        <p className="mt-2 text-sm text-slate-500">
          This area is restricted. Sign in with an allowed admin email.
        </p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">Email</label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-[#e5edf8] px-4 py-3 text-sm text-slate-700 outline-none focus:border-royal"
              placeholder="admin@example.com"
              autoComplete="email"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">Password</label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-[#e5edf8] px-4 py-3 text-sm text-slate-700 outline-none focus:border-royal"
              placeholder="Enter password"
              autoComplete="current-password"
            />
          </div>
          {error && <p className="text-sm text-rose-500">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-royal px-4 py-3 text-sm font-semibold text-white shadow"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}

const PortalLoginLanding = () => {
  const auth = getStoredPortalAuth()

  if (auth?.userId) {
    return <Navigate to="/" replace />
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_#eef5ff,_#f6f0e5_58%,_#efe5d3)] px-4 py-10">
      <div className="mx-auto flex min-h-[85vh] w-full max-w-xl flex-col items-center justify-center">
        <div className="w-full rounded-[34px] border border-white/70 bg-white/85 p-8 shadow-[0_32px_90px_rgba(31,78,167,0.14)] backdrop-blur">
          <div className="flex flex-col items-center text-center">
            <img src="/logo.png" alt="K.R. Mangalam University" className="h-32 w-32 object-contain sm:h-40 sm:w-40" />
            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.35em] text-[#4f8fe9]">Campus Access</p>
            <h1 className="mt-3 font-outfit text-3xl font-semibold text-slate-800 sm:text-4xl">Sign in to your portal</h1>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <Link
              to="/login/student"
              className="group rounded-[26px] border border-[#dbe7fb] bg-[linear-gradient(180deg,#ffffff,#eef5ff)] p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="flex items-center gap-4">
                <div className="grid h-14 w-14 place-items-center rounded-2xl bg-[#4f8fe9] text-lg font-bold text-white shadow-md">S</div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#4f8fe9]">Student</p>
                  <h2 className="mt-1 text-xl font-semibold text-slate-800">Student Login</h2>
                </div>
              </div>
            </Link>

            <Link
              to="/login/staff"
              className="group rounded-[26px] border border-[#dbe7fb] bg-[linear-gradient(180deg,#ffffff,#eef5ff)] p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="flex items-center gap-4">
                <div className="grid h-14 w-14 place-items-center rounded-2xl bg-[#1f4ea7] text-lg font-bold text-white shadow-md">T</div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#1f4ea7]">Staff</p>
                  <h2 className="mt-1 text-xl font-semibold text-slate-800">Staff Login</h2>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

const PersonaLoginPage = () => {
  const navigate = useNavigate()
  const { persona = 'student' } = useParams()
  const normalizedPersona = persona === 'staff' ? 'staff' : 'student'
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [otpRequested, setOtpRequested] = useState(false)
  const [otpHint, setOtpHint] = useState('')
  const [statusText, setStatusText] = useState('')
  const [copyStatus, setCopyStatus] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const auth = getStoredPortalAuth()
  if (auth?.userId) {
    return <Navigate to="/" replace />
  }

  const handleCopyOtp = async () => {
    if (!otpHint) return
    try {
      await navigator.clipboard.writeText(otpHint)
      setCopyStatus('OTP copied')
      window.setTimeout(() => setCopyStatus(''), 1800)
    } catch {
      setCopyStatus('Copy failed')
      window.setTimeout(() => setCopyStatus(''), 1800)
    }
  }

  const handleRequestOtp = async (event) => {
    event.preventDefault()
    setLoading(true)
    setError('')
    setStatusText('')
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/request-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
          persona: normalizedPersona,
        }),
      })

      if (!response.ok) {
        let detail = 'We could not send an OTP for this Outlook ID.'
        try {
          const payload = await response.json()
          if (payload?.detail) {
            detail = payload.detail
          }
        } catch {
          // keep default error
        }
        throw new Error(detail)
      }

      const payload = await response.json()
      setOtpRequested(true)
      setOtp('')
      setOtpHint(payload.otp_code || '')
      setStatusText(payload.detail || 'OTP sent successfully.')
      setCopyStatus('')
    } catch (err) {
      setError(err?.message || 'We could not send an OTP for this Outlook ID.')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async (event) => {
    event.preventDefault()
    setLoading(true)
    setError('')
    setStatusText('')
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
          persona: normalizedPersona,
          otp: otp.trim(),
        }),
      })

      if (!response.ok) {
        let detail = 'We could not verify this OTP.'
        try {
          const payload = await response.json()
          if (payload?.detail) {
            detail = payload.detail
          }
        } catch {
          // keep default error
        }
        throw new Error(detail)
      }

      const payload = await response.json()
      const nextAuth = {
        persona: payload.persona,
        userId: payload.user_id,
        email: payload.email,
        displayName: payload.display_name,
      }

      clearPortalSession()
      localStorage.setItem('portal_auth', JSON.stringify(nextAuth))
      localStorage.setItem('portal_user_id', payload.user_id)
      localStorage.setItem('active_persona', payload.persona)
      if (payload.persona === 'student') {
        localStorage.setItem('student_id', payload.user_id)
      }

      navigate('/', { replace: true })
    } catch (err) {
      setError(err?.message || 'We could not verify this OTP.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_#edf4ff,_#f7f1e7_60%,_#efe5d3)] px-4 py-8">
      <div className="mx-auto flex min-h-[88vh] w-full max-w-lg flex-col justify-center">
        <div className="rounded-[34px] border border-white/70 bg-white/90 p-8 shadow-[0_32px_90px_rgba(31,78,167,0.14)] backdrop-blur">
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="rounded-full border border-[#dbe7fb] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500"
          >
            Back
          </button>

          <div className="mt-6 flex flex-col items-center text-center">
            <img src="/logo.png" alt="K.R. Mangalam University" className="h-28 w-28 object-contain sm:h-32 sm:w-32" />
            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.35em] text-[#4f8fe9]">
              {normalizedPersona === 'staff' ? 'Staff Access' : 'Student Access'}
            </p>
            <h1 className="mt-3 font-outfit text-3xl font-semibold text-slate-800">Enter your Outlook ID</h1>
            <p className="mt-3 text-sm text-slate-500">
              We will first verify your college Outlook ID with an OTP, then open the correct portal profile.
            </p>
          </div>

          <form onSubmit={otpRequested ? handleVerifyOtp : handleRequestOtp} className="mt-8 space-y-5">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">Official Email</label>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder={normalizedPersona === 'staff' ? 'name@krmangalam.edu.in' : 'student@krmangalam.edu.in'}
                className="mt-2 w-full rounded-2xl border border-[#dbe7fb] bg-[#fbfdff] px-4 py-4 text-sm text-slate-700 outline-none transition focus:border-[#4f8fe9]"
                autoComplete="email"
                disabled={otpRequested}
                required
              />
            </div>

            {otpRequested && (
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">OTP</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={otp}
                  onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="Enter 6-digit OTP"
                  className="mt-2 w-full rounded-2xl border border-[#dbe7fb] bg-[#fbfdff] px-4 py-4 text-sm tracking-[0.35em] text-slate-700 outline-none transition focus:border-[#4f8fe9]"
                  autoComplete="one-time-code"
                    required
                />
                {otpHint && (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    <p className="font-semibold">Prototype Test OTP</p>
                    <p className="mt-1 text-xs text-emerald-700/90">
                      This MVP shows the OTP on screen for testing. In the final portal, this will be delivered to the official Outlook ID.
                    </p>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <span className="rounded-xl bg-white px-3 py-2 font-semibold tracking-[0.35em] text-emerald-800">
                        {otpHint}
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyOtp}
                        className="rounded-xl border border-emerald-300 bg-white px-3 py-2 text-xs font-semibold text-emerald-700"
                      >
                        {copyStatus || 'Copy OTP'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {error && <p className="text-sm text-rose-500">{error}</p>}
            {statusText && <p className="text-sm text-emerald-600">{statusText}</p>}

            <div className="space-y-3">
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl bg-[linear-gradient(135deg,#4f8fe9,#6f7ef4)] px-4 py-4 text-sm font-semibold text-white shadow-lg disabled:opacity-70"
              >
                {loading ? (otpRequested ? 'Verifying OTP...' : 'Sending OTP...') : otpRequested ? 'Verify OTP' : 'Send OTP'}
              </button>
              {otpRequested && (
                <button
                  type="button"
                  onClick={() => {
                    setOtpRequested(false)
                    setOtp('')
                    setOtpHint('')
                    setStatusText('')
                    setError('')
                  }}
                  className="w-full rounded-2xl border border-[#dbe7fb] bg-white px-4 py-4 text-sm font-semibold text-slate-600"
                >
                  Change Outlook ID
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

const HomePage = () => {
  const auth = getStoredPortalAuth()
  const [announcements, setAnnouncements] = useState([])

  useEffect(() => {
    let active = true
    const loadAnnouncements = async () => {
      try {
        const role = auth?.persona || 'student'
        const response = await fetch(`${API_BASE_URL}/api/portal/announcements?role=${encodeURIComponent(role)}`, {
          headers: {
            'X-Student-Id': auth?.userId || DEFAULT_STUDENT_ID,
          },
        })
        if (!response.ok) return
        const payload = await response.json()
        if (active) {
          setAnnouncements(Array.isArray(payload) ? payload : [])
        }
      } catch {
        // ignore announcement load failure on home
      }
    }
    loadAnnouncements()
    return () => {
      active = false
    }
  }, [auth?.persona, auth?.userId])

  return (
    <div className="space-y-6">
      {announcements.length > 0 && (
        <div className="grid gap-3">
          {announcements.slice(0, 2).map((item) => (
            <div key={item.announcement_id} className="rounded-2xl border border-[#ead9b4] bg-[#fff6df] px-5 py-4 shadow-sm">
              <p className="text-sm font-semibold text-slate-800">{item.title}</p>
              <p className="mt-1 text-sm text-slate-600">{item.message}</p>
            </div>
          ))}
        </div>
      )}
      <div className="grid grid-cols-2 gap-x-5 gap-y-7 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {moduleItems.map((item) => (
          <button
            key={item.title}
            type="button"
            className="flex flex-col items-center gap-3 rounded-2xl px-3 py-4 text-center transition hover:-translate-y-1 hover:bg-white hover:shadow-md"
          >
            <span className="h-16 w-16 text-[#1f7ae0]">{iconMap[item.icon]}</span>
            <span className="text-sm font-semibold text-slate-500">{item.title}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

const PortalSectionPage = ({ sectionType }) => {
  const navigate = useNavigate()
  const { subject = 'overview' } = useParams()
  const auth = getStoredPortalAuth()
  const currentUserId = auth?.userId || localStorage.getItem('student_id') || DEFAULT_STUDENT_ID
  const isFaculty = auth?.persona === 'faculty'
  const [sectionPayload, setSectionPayload] = useState(null)
  const [loadingSection, setLoadingSection] = useState(true)
  const [sectionError, setSectionError] = useState('')

  useEffect(() => {
    let active = true
    const loadSection = async () => {
      setLoadingSection(true)
      setSectionError('')
      try {
        const shouldSendSubject = sectionType !== 'fees' && sectionType !== 'performance' && subject !== 'overview'
        const params = new URLSearchParams()
        if (shouldSendSubject) {
          params.set('subject', subject)
        }
        if (sectionType === 'performance' && subject !== 'overview') {
          params.set('semester', subject)
        }
        if (currentUserId) {
          params.set('student_id', currentUserId)
        }
        const query = params.toString() ? `?${params.toString()}` : ''
        const response = await fetch(`${API_BASE_URL}/api/portal/section/${sectionType}${query}`, {
          headers: {
            'X-Student-Id': currentUserId,
          },
        })
        if (!response.ok) {
          if (response.status === 401) {
            throw new Error('AUTH_REQUIRED')
          }
          if (response.status === 403) {
            throw new Error('ACCESS_DENIED')
          }
          throw new Error('Section fetch failed')
        }
        const payload = await response.json()
        if (!active) return
        setSectionPayload(payload)
      } catch (err) {
        if (!active) return
        if (String(err || '').includes('AUTH_REQUIRED')) {
          setSectionError('Please sign in again to access this section.')
        } else if (String(err || '').includes('ACCESS_DENIED')) {
          setSectionError('Access denied for this section with your student profile.')
        } else {
          setSectionError('Could not load live section data.')
        }
      } finally {
        if (active) {
          setLoadingSection(false)
        }
      }
    }
    loadSection()
    return () => {
      active = false
    }
  }, [sectionType, subject, currentUserId])

  const renderContent = () => {
    if (loadingSection) {
      return <p className="text-slate-500">Loading...</p>
    }
    if (sectionError) {
      return <p className="text-rose-500">{sectionError}</p>
    }
    const liveData = sectionPayload?.data
    if (!liveData) {
      return <p className="text-slate-500">No data available for this section.</p>
    }

    if (sectionType === 'class_schedule') {
      const rows = Array.isArray(liveData?.classes) ? liveData.classes : []
      if (rows.length === 0) return <p className="text-slate-500">No classes scheduled right now.</p>
      return (
        <div className="space-y-3">
          {rows.map((row) => (
            <div key={`${row.time}-${row.subject}-${row.section}`} className="rounded-xl border border-[#e5edf8] bg-[#f8faff] p-4 text-sm text-slate-700">
              <p className="font-semibold text-slate-800">{row.subject}</p>
              <p>{row.time}</p>
              <p>{row.section}</p>
              <p>Room: {row.room}</p>
            </div>
          ))}
        </div>
      )
    }

    if (sectionType === 'assignments_review') {
      return (
        <div className="space-y-3 text-sm text-slate-700">
          <p><span className="font-semibold">Faculty:</span> {liveData?.faculty_name || auth?.displayName || 'Faculty'}</p>
          <p><span className="font-semibold">Pending Reviews:</span> {liveData?.pending_count ?? 0}</p>
          <p><span className="font-semibold">Subjects:</span> {Array.isArray(liveData?.subjects) && liveData.subjects.length > 0 ? liveData.subjects.join(', ') : 'Not available'}</p>
        </div>
      )
    }

    if (sectionType === 'attendance_review') {
      const rows = Array.isArray(liveData?.students) ? liveData.students : []
      if (rows.length === 0) return <p className="text-slate-500">No low attendance alerts right now.</p>
      return (
        <div className="space-y-3">
          {rows.map((row) => (
            <div key={`${row.student_id}-${row.subject}`} className="rounded-xl border border-[#e5edf8] bg-[#f8faff] p-4 text-sm text-slate-700">
              <p className="font-semibold text-slate-800">{row.name}</p>
              <p>ID: {row.student_id}</p>
              <p>Subject: {row.subject}</p>
              <p>Attendance: {row.percentage}</p>
            </div>
          ))}
        </div>
      )
    }

    if (sectionType === 'leave_requests') {
      const rows = Array.isArray(liveData?.pending) ? liveData.pending : []
      if (rows.length === 0) return <p className="text-slate-500">No pending leave requests right now.</p>
      return (
        <div className="space-y-3">
          {rows.map((row) => (
            <div key={`${row.student_id}-${row.reason}`} className="rounded-xl border border-[#e5edf8] bg-[#f8faff] p-4 text-sm text-slate-700">
              <p className="font-semibold text-slate-800">{row.student_name}</p>
              <p>ID: {row.student_id}</p>
              <p>Days: {row.days}</p>
              <p>Reason: {row.reason}</p>
            </div>
          ))}
        </div>
      )
    }

    if (sectionType === 'attendance') {
      const row = liveData
      if (!row) return <p className="text-slate-500">No attendance data found for this subject.</p>
      if (!row.attendance_template && !row.attendance_url && typeof row === 'object') {
        const entries = Object.entries(row)
        if (entries.length === 0) {
          return <p className="text-slate-500">No attendance data found.</p>
        }
        return (
          <div className="space-y-3">
            {entries.map(([subjectName, record]) => {
              const stats = record?.attendance_stats || null
              return (
                <div key={subjectName} className="rounded-xl border border-[#e5edf8] bg-[#f8faff] p-3 text-sm">
                  <p className="font-semibold text-slate-700">{subjectName}</p>
                  {stats ? (
                    <>
                      <p className="text-slate-600">Attendance: {stats.percentage || '-'}</p>
                      {stats.attended != null && stats.total != null && (
                        <p className="text-slate-600">Classes: {stats.attended}/{stats.total}</p>
                      )}
                    </>
                  ) : (
                    <p className="text-slate-500">Attendance stats unavailable.</p>
                  )}
                </div>
              )
            })}
          </div>
        )
      }
      const stats = row.attendance_stats || null
      return (
        <div className="space-y-2 text-sm text-slate-700">
          <p><span className="font-semibold">Subject:</span> {sectionPayload?.subject || subject}</p>
          <p><span className="font-semibold">{isFaculty ? 'User ID' : 'Student ID'}:</span> {currentUserId}</p>
          {stats ? (
            <>
              <p><span className="font-semibold">Attendance:</span> {stats.percentage || '-'}</p>
              {stats.attended != null && stats.total != null && (
                <p><span className="font-semibold">Classes:</span> {stats.attended}/{stats.total}</p>
              )}
            </>
          ) : (
            <>
              <p><span className="font-semibold">Attendance:</span> Not available yet for this student.</p>
              <p className="text-xs text-slate-500">Only route is available right now: {row.attendance_url || row.attendance_template || '-'}</p>
            </>
          )}
        </div>
      )
    }

    if (sectionType === 'syllabus') {
      const row = liveData
      if (!row) return <p className="text-slate-500">No syllabus data found for this subject.</p>
      if (!Array.isArray(row.units) && typeof row === 'object') {
        const entries = Object.entries(row)
        if (entries.length === 0) {
          return <p className="text-slate-500">No syllabus data found.</p>
        }
        return (
          <div className="space-y-3">
            {entries.map(([subjectName, details]) => (
              <div key={subjectName} className="rounded-xl border border-[#e5edf8] bg-[#f8faff] p-3 text-sm text-slate-700">
                <p className="font-semibold text-slate-800">{subjectName}</p>
                <ul className="mt-2 list-disc pl-5">
                  {(details?.units || []).map((unit) => (
                    <li key={`${subjectName}-${unit}`}>{unit}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )
      }
      return (
        <div className="space-y-2 text-sm text-slate-700">
          <p><span className="font-semibold">Subject:</span> {sectionPayload?.subject || subject}</p>
          <p className="font-semibold">Units:</p>
          <ul className="list-disc pl-5">
            {row.units.map((unit) => (
              <li key={unit}>{unit}</li>
            ))}
          </ul>
        </div>
      )
    }

    if (sectionType === 'assignments') {
      const rows = Array.isArray(liveData?.assignments)
        ? liveData.assignments
        : []
      if (rows.length === 0) return <p className="text-slate-500">No assignments found.</p>
      return (
        <div className="space-y-3">
          {rows.map((row) => (
            <div key={`${row.assignment_id || row.title}-${row.due_date || row.dueDate}`} className="rounded-xl border border-[#e5edf8] bg-[#f8faff] p-3 text-sm">
              <p className="font-semibold text-slate-700">{row.title}</p>
              <p className="text-slate-600">Due: {row.due_date || row.dueDate}</p>
              <p className="text-slate-600">Status: {row.status}</p>
            </div>
          ))}
        </div>
      )
    }

    if (sectionType === 'fees') {
      const pages = liveData
      return (
        <div className="space-y-3">
          {Object.entries(pages).map(([key, value]) => (
            <div key={key} className="rounded-xl border border-[#e5edf8] bg-[#f8faff] p-3 text-sm">
              <p className="font-semibold text-slate-700 capitalize">{key}</p>
              <p className="text-slate-600 break-all">{String(value)}</p>
            </div>
          ))}
        </div>
      )
    }

    if (sectionType === 'performance') {
      const row = liveData
      if (!row) return <p className="text-slate-500">No performance data found.</p>
      if (!row.marks_page_template && !row.marks_page_url && typeof row === 'object') {
        const entries = Object.entries(row)
        if (entries.length === 0) {
          return <p className="text-slate-500">No performance records found.</p>
        }
        return (
          <div className="space-y-3">
            {entries.map(([sem, details]) => (
              <div key={sem} className="rounded-xl border border-[#e5edf8] bg-[#f8faff] p-3 text-sm text-slate-700">
                <p className="font-semibold text-slate-800 capitalize">{sem}</p>
                <p>{isFaculty ? 'User ID' : 'Student ID'}: {currentUserId}</p>
                {details?.marks_page_url && <p>Result page available.</p>}
              </div>
            ))}
          </div>
        )
      }
      return (
        <div className="space-y-2 text-sm text-slate-700">
          <p><span className="font-semibold">Semester:</span> {sectionPayload?.subject || subject}</p>
          <p><span className="font-semibold">{isFaculty ? 'User ID' : 'Student ID'}:</span> {currentUserId}</p>
          <p>Result page is available.</p>
        </div>
      )
    }

    return <p className="text-slate-500">No content available.</p>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="rounded-full border border-[#e5edf8] bg-white px-4 py-2 text-sm font-semibold text-slate-600"
        >
          Back
        </button>
        <h2 className="text-lg font-semibold text-slate-800 capitalize">{sectionType} - {subject}</h2>
      </div>
      <div className="rounded-2xl border border-[#e5edf8] bg-white p-5 shadow-sm">{renderContent()}</div>
    </div>
  )
}

const StudentShell = ({ children }) => {
  const auth = getStoredPortalAuth()
  const [chatOpen, setChatOpen] = useState(false)
  const [accessBlocked, setAccessBlocked] = useState('')
  const [announcementPopup, setAnnouncementPopup] = useState(null)

  useEffect(() => {
    document.body.style.overflow = chatOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [chatOpen])

  useEffect(() => {
    let active = true
    const validateAccess = async () => {
      if (!auth?.userId) return
      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/access?user_id=${encodeURIComponent(auth.userId)}`)
        if (!response.ok) return
        const payload = await response.json()
        if (active && payload?.allowed === false) {
          setAccessBlocked(payload.detail || 'This portal account has been blocked by admin.')
        }
      } catch {
        // do not interrupt normal portal use on transient failures
      }
    }
    validateAccess()
    return () => {
      active = false
    }
  }, [auth?.userId])

  useEffect(() => {
    let active = true
    const loadAnnouncementPopup = async () => {
      if (!auth?.userId || !auth?.persona) return
      try {
        const response = await fetch(`${API_BASE_URL}/api/portal/announcements?role=${encodeURIComponent(auth.persona)}`, {
          headers: {
            'X-Student-Id': auth.userId,
          },
        })
        if (!response.ok) return
        const payload = await response.json()
        if (!active || !Array.isArray(payload) || payload.length === 0) return
        const ownerKey = `${auth.persona}:${auth.userId}`
        const seenIds = getSeenAnnouncementIds(ownerKey)
        const newest = payload.find((item) => item?.announcement_id && !seenIds.includes(item.announcement_id))
        if (newest) {
          setAnnouncementPopup(newest)
        }
      } catch {
        // ignore popup fetch failure
      }
    }
    loadAnnouncementPopup()
    return () => {
      active = false
    }
  }, [auth?.persona, auth?.userId])

  if (!auth?.userId) {
    return <Navigate to="/login" replace />
  }

  const handleLogout = () => {
    clearPortalSession()
    window.location.href = '/login'
  }

  const dismissAnnouncementPopup = () => {
    if (announcementPopup?.announcement_id && auth?.userId && auth?.persona) {
      const ownerKey = `${auth.persona}:${auth.userId}`
      const seenIds = getSeenAnnouncementIds(ownerKey)
      if (!seenIds.includes(announcementPopup.announcement_id)) {
        saveSeenAnnouncementIds(ownerKey, [announcementPopup.announcement_id, ...seenIds].slice(0, 20))
      }
    }
    setAnnouncementPopup(null)
  }

  if (accessBlocked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f6f8fc] px-4">
        <div className="w-full max-w-lg rounded-3xl border border-rose-200 bg-white p-8 shadow-lg">
          <h2 className="text-xl font-semibold text-slate-800">Portal Access Blocked</h2>
          <p className="mt-3 text-sm text-slate-600">{accessBlocked}</p>
          <button
            type="button"
            onClick={handleLogout}
            className="mt-6 rounded-2xl bg-rose-500 px-4 py-3 text-sm font-semibold text-white shadow"
          >
            Return to Login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen">
      <div className={`transition-all duration-200 ${chatOpen ? 'blur-[6px]' : ''}`}>
        <DashboardLayout
          showAdminLink
          onLogout={handleLogout}
          currentUser={{
            displayName: auth.displayName,
            personaLabel: auth.persona === 'faculty' ? 'Staff' : auth.persona,
          }}
        >
          {children}
        </DashboardLayout>
      </div>

      <button
        type="button"
        onClick={() => setChatOpen(true)}
        className={`fixed bottom-6 right-6 z-40 grid h-[72px] w-[72px] place-items-center rounded-2xl border-2 border-royal bg-white shadow-lg transition ${
          chatOpen ? 'pointer-events-none opacity-0' : 'opacity-100'
        }`}
        aria-label="Open chatbot"
      >
        <img src="/robot.png" alt="Chatbot robot" className="h-12 w-12 object-contain" />
      </button>

      {chatOpen && (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            className="absolute inset-0 h-full w-full cursor-default bg-transparent"
            onClick={() => setChatOpen(false)}
            aria-label="Close chatbot backdrop"
          />
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6">
            <div className="pointer-events-auto flex h-[92vh] min-h-0 w-[92vw] max-w-[440px] flex-col">
            <ChatbotPanel />
            </div>
          </div>
        </div>
      )}

      {announcementPopup && (
        <div className="fixed bottom-6 left-1/2 z-40 w-[92vw] max-w-md -translate-x-1/2 rounded-3xl border border-[#ead9b4] bg-[#fff6df] p-5 shadow-2xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-700">New Announcement</p>
              <h3 className="mt-2 text-lg font-semibold text-slate-800">{announcementPopup.title}</h3>
              <p className="mt-2 text-sm text-slate-700">{announcementPopup.message}</p>
            </div>
            <button
              type="button"
              onClick={dismissAnnouncementPopup}
              className="rounded-full border border-[#ead9b4] bg-white px-3 py-1 text-xs font-semibold text-slate-600"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

const AdminPage = () => {
  const [adminToken, setAdminToken] = useState(() => localStorage.getItem('admin_token') || '')
  const [authed, setAuthed] = useState(() => Boolean(localStorage.getItem('admin_token')))

  const login = async (email, password) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })
      if (!response.ok) {
        return false
      }
      const payload = await response.json()
      localStorage.setItem('admin_token', payload.access_token)
      setAdminToken(payload.access_token)
      setAuthed(true)
      return true
    } catch {
      return false
    }
  }

  const logout = () => {
    localStorage.removeItem('admin_token')
    setAdminToken('')
    setAuthed(false)
  }

  if (!authed) {
    return <AdminLogin onLogin={login} />
  }

  return (
    <DashboardLayout onLogout={logout}>
      <AdminDashboard adminToken={adminToken} onUnauthorized={logout} />
    </DashboardLayout>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<PortalLoginLanding />} />
        <Route path="/login/:persona" element={<PersonaLoginPage />} />
        <Route
          path="/"
          element={
            <StudentShell>
              <HomePage />
            </StudentShell>
          }
        />
        <Route
          path="/attendance/:subject"
          element={
            <StudentShell>
              <PortalSectionPage sectionType="attendance" />
            </StudentShell>
          }
        />
        <Route
          path="/attendance"
          element={
            <StudentShell>
              <PortalSectionPage sectionType="attendance" />
            </StudentShell>
          }
        />
        <Route
          path="/syllabus/:subject"
          element={
            <StudentShell>
              <PortalSectionPage sectionType="syllabus" />
            </StudentShell>
          }
        />
        <Route
          path="/syllabus"
          element={
            <StudentShell>
              <PortalSectionPage sectionType="syllabus" />
            </StudentShell>
          }
        />
        <Route
          path="/assignments/:subject"
          element={
            <StudentShell>
              <PortalSectionPage sectionType="assignments" />
            </StudentShell>
          }
        />
        <Route
          path="/assignments"
          element={
            <StudentShell>
              <PortalSectionPage sectionType="assignments" />
            </StudentShell>
          }
        />
        <Route
          path="/fees/overview"
          element={
            <StudentShell>
              <PortalSectionPage sectionType="fees" />
            </StudentShell>
          }
        />
        <Route
          path="/performance/:subject"
          element={
            <StudentShell>
              <PortalSectionPage sectionType="performance" />
            </StudentShell>
          }
        />
        <Route
          path="/performance"
          element={
            <StudentShell>
              <PortalSectionPage sectionType="performance" />
            </StudentShell>
          }
        />
        <Route
          path="/staff/classes"
          element={
            <StudentShell>
              <PortalSectionPage sectionType="class_schedule" />
            </StudentShell>
          }
        />
        <Route
          path="/staff/reviews"
          element={
            <StudentShell>
              <PortalSectionPage sectionType="assignments_review" />
            </StudentShell>
          }
        />
        <Route
          path="/staff/attendance-alerts"
          element={
            <StudentShell>
              <PortalSectionPage sectionType="attendance_review" />
            </StudentShell>
          }
        />
        <Route
          path="/staff/leave-requests"
          element={
            <StudentShell>
              <PortalSectionPage sectionType="leave_requests" />
            </StudentShell>
          }
        />
        <Route path="/admin" element={<AdminPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
