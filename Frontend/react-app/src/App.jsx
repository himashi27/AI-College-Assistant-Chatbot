import { useEffect, useRef, useState } from 'react'
import { BrowserRouter, Link, Route, Routes } from 'react-router-dom'

const ADMIN_PASSCODE = 'KRMGU-ADMIN'
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

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

const suggestionChips = [
  'Admissions Deadlines',
  'Scholarships',
  'Course Catalog',
  'Campus Map',
  'Housing',
]

const quickActions = [
  'Apply and admissions checklist',
  'Registrar and transcripts',
  'Financial aid and tuition',
]

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

const adminStats = [
  { label: 'Total Queries', value: '12,480', trend: '+8% this week' },
  { label: 'Active Users', value: '1,284', trend: '+5% this week' },
  { label: 'Avg Response', value: '1.6s', trend: 'P95 2.3s' },
  { label: 'CSAT Score', value: '4.4/5', trend: 'Based on 620 ratings' },
]

const recentQueries = [
  { user: 'Ananya', query: 'Scholarship eligibility for CSE', status: 'Resolved', time: '2 min ago' },
  { user: 'Rohit', query: 'Exam timetable for Semester 4', status: 'In progress', time: '12 min ago' },
  { user: 'Sneha', query: 'Hostel fees due date', status: 'Resolved', time: '20 min ago' },
  { user: 'Karan', query: 'Transcript request process', status: 'Escalated', time: '35 min ago' },
]

const topIntents = [
  { name: 'Admissions', value: 28 },
  { name: 'Fees & Payments', value: 22 },
  { name: 'Timetable', value: 18 },
  { name: 'Scholarships', value: 14 },
  { name: 'Hostel', value: 10 },
]

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

const DashboardLayout = ({ children, showAdminLink = false, onLogout }) => {
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
            <span className="text-sm font-semibold">HIMANSHI</span>
            <div className="grid h-9 w-9 place-items-center rounded-full bg-[#e8f0ff] text-[#1f4ea7]">H</div>
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

const AdminDashboard = () => (
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

    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {adminStats.map((item) => (
        <div key={item.label} className="rounded-2xl border border-[#e5edf8] bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{item.label}</p>
          <p className="mt-2 text-2xl font-semibold text-slate-800">{item.value}</p>
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
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Query</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Time</th>
              </tr>
            </thead>
            <tbody>
              {recentQueries.map((item) => (
                <tr key={item.user} className="border-t border-[#eef2f8] text-slate-600">
                  <td className="px-4 py-3 font-semibold text-slate-700">{item.user}</td>
                  <td className="px-4 py-3">{item.query}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        item.status === 'Resolved'
                          ? 'bg-emerald-50 text-emerald-600'
                          : item.status === 'Escalated'
                          ? 'bg-rose-50 text-rose-600'
                          : 'bg-amber-50 text-amber-600'
                      }`}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">{item.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-6">
        <div className="rounded-2xl border border-[#e5edf8] bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700">Top Intents</h3>
          <div className="mt-4 space-y-3">
            {topIntents.map((intent) => (
              <div key={intent.name} className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-600">{intent.name}</span>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-24 rounded-full bg-[#eef2f8]">
                    <div className="h-2 rounded-full bg-royal" style={{ width: `${intent.value}%` }} />
                  </div>
                  <span className="text-xs text-slate-400">{intent.value}%</span>
                </div>
              </div>
            ))}
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
              {'Ã¢Ëœâ€¦'.repeat(item.rating)}
              <span className="text-slate-400">{index + 1}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
)

const ChatbotPanel = () => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      role: 'bot',
      text: 'Welcome to the University AI Assistant. I can help with admissions, courses, financial aid, housing, and campus services. What do you need today?',
    },
  ])
  const [input, setInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const endRef = useRef(null)
  const sessionIdRef = useRef(`web-${Date.now()}`)

  const sendMessage = async (text) => {
    const cleaned = text.trim()
    if (!cleaned || isSending) return

    const userMessage = {
      id: Date.now(),
      role: 'user',
      text: cleaned,
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsSending(true)

    try {
      const response = await fetch(`${API_BASE_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: sessionIdRef.current,
          user_id: 'web-student',
          message: cleaned,
          role: 'student',
          language: 'en',
        }),
      })

      if (!response.ok) {
        throw new Error('Chat request failed')
      }

      const payload = await response.json()
      setMessages((prev) => [
        ...prev,
        {
          id: payload.message_id || Date.now() + 1,
          role: 'bot',
          text: payload.reply || 'I could not generate a response right now.',
        },
      ])
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: 'bot',
          text: 'I am having trouble reaching the server right now. Please try again in a moment.',
        },
      ])
    } finally {
      setIsSending(false)
    }
  }

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-[26px] bg-[#f6f0e5] shadow-2xl">
      <div className="flex items-center gap-3 bg-royal px-5 py-4 text-white">
        <div className="h-11 w-11 rounded-xl bg-white p-1">
          <img src="/logo.png" alt="K.R. Mangalam University" className="h-full w-full rounded-lg object-contain" />
        </div>
        <div>
          <h3 className="font-outfit text-lg font-semibold">Campus Guide</h3>
          <div className="flex items-center gap-2 text-xs text-white/80">
            <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
            Online
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
        <div className="flex flex-wrap gap-2">
          {suggestionChips.map((chip) => (
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

        {messages.map((message) => (
          <div key={message.id} className={message.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
            <div
              className={
                message.role === 'user'
                  ? 'max-w-[80%] rounded-2xl rounded-br-md bg-royal px-4 py-3 text-sm text-white shadow-lg'
                  : 'max-w-[80%] rounded-2xl rounded-bl-md bg-white px-4 py-3 text-sm text-slate-800 shadow'
              }
            >
              {message.text}
            </div>
          </div>
        ))}

        <div className="rounded-2xl border border-[#efe6d8] bg-white">
          {quickActions.map((item, index) => (
            <button
              key={item}
              type="button"
              onClick={() => sendMessage(item)}
              className={`flex w-full items-center justify-between px-4 py-4 text-left text-sm font-medium text-slate-800 transition hover:bg-[#faf4ea] ${
                index !== quickActions.length - 1 ? 'border-b border-[#efe6d8]' : ''
              }`}
            >
              <span>{item}</span>
              <span className="text-xl text-slate-400">&gt;</span>
            </button>
          ))}
        </div>
        <div ref={endRef} />
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
            placeholder="Ask about admissions, courses, or services"
            className="flex-1 bg-transparent text-sm text-slate-700 outline-none"
          />
          <button
            type="button"
            onClick={() => sendMessage(input)}
            disabled={isSending}
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
  const [passcode, setPasscode] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = (event) => {
    event.preventDefault()
    if (onLogin(passcode)) {
      setError('')
      setPasscode('')
      return
    }
    setError('Invalid passcode. Access denied.')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f6f8fc] px-4">
      <div className="w-full max-w-md rounded-3xl border border-[#e5edf8] bg-white p-8 shadow-lg">
        <h2 className="text-xl font-semibold text-slate-800">Admin Access</h2>
        <p className="mt-2 text-sm text-slate-500">
          This area is restricted. Enter the admin passcode to continue.
        </p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">Passcode</label>
            <input
              type="password"
              value={passcode}
              onChange={(event) => setPasscode(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-[#e5edf8] px-4 py-3 text-sm text-slate-700 outline-none focus:border-royal"
              placeholder="Enter admin passcode"
            />
          </div>
          {error && <p className="text-sm text-rose-500">{error}</p>}
          <button
            type="submit"
            className="w-full rounded-2xl bg-royal px-4 py-3 text-sm font-semibold text-white shadow"
          >
            Unlock Admin
          </button>
          <p className="text-center text-xs text-slate-400">
            Update the passcode in <code className="font-semibold">ADMIN_PASSCODE</code> inside <code className="font-semibold">App.jsx</code>.
          </p>
        </form>
      </div>
    </div>
  )
}

const LandingPage = () => {
  const [chatOpen, setChatOpen] = useState(false)

  useEffect(() => {
    document.body.style.overflow = chatOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [chatOpen])

  return (
    <div className="relative min-h-screen">
      <div className={`transition-all duration-200 ${chatOpen ? 'blur-[6px]' : ''}`}>
        <DashboardLayout showAdminLink>
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
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-transparent p-6"
          onClick={() => setChatOpen(false)}
          aria-hidden={!chatOpen}
        >
          <div className="h-[92vh] w-[92vw] max-w-[440px]" onClick={(event) => event.stopPropagation()}>
            <ChatbotPanel />
          </div>
        </div>
      )}
    </div>
  )
}

const AdminPage = () => {
  const [authed, setAuthed] = useState(() => localStorage.getItem('admin_access') === 'true')

  const login = (passcode) => {
    if (passcode === ADMIN_PASSCODE) {
      localStorage.setItem('admin_access', 'true')
      setAuthed(true)
      return true
    }
    return false
  }

  const logout = () => {
    localStorage.removeItem('admin_access')
    setAuthed(false)
  }

  if (!authed) {
    return <AdminLogin onLogin={login} />
  }

  return (
    <DashboardLayout onLogout={logout}>
      <AdminDashboard />
    </DashboardLayout>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/admin" element={<AdminPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
