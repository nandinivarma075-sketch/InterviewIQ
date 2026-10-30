import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  Briefcase,
  Mic,
  BarChart3,
  Clock,
  User,
  ChevronLeft,
  Zap,
  Settings,
  Code2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getInitials } from '../../utils/helpers';
import '../../styles/sidebar.css';

const NAV_ITEMS = [
  { label: 'Dashboard',       icon: LayoutDashboard, to: '/dashboard' },
  { label: 'Resume Upload',   icon: FileText,         to: '/resume' },
  { label: 'Role Selection',  icon: Briefcase,        to: '/role-selection' },
];

const INTERVIEW_ITEMS = [
  { label: 'Interview Setup', icon: Settings, to: '/interview/setup' },
  { label: 'Live Interview',  icon: Mic,      to: '/interview/live',      badge: 'LIVE' },
  { label: 'Coding Sandbox',  icon: Code2,    to: '/coding',              badge: 'NEW' },
];

const RESULTS_ITEMS = [
  { label: 'AI Report',       icon: BarChart3, to: '/report' },
  { label: 'History',         icon: Clock,     to: '/history' },
  { label: 'Profile',         icon: User,      to: '/profile' },
];

export default function Sidebar({ collapsed, onToggle }) {
  const location = useLocation();
  const { user } = useAuth();
  const displayName = user?.name || 'User';
  const displayRole = user?.role === 'user' ? 'Candidate' : (user?.role || 'Interviewee');

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      {/* Toggle button */}
      <button
        className="sidebar__toggle"
        onClick={onToggle}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        id="sidebar-toggle-btn"
      >
        <ChevronLeft size={14} color="var(--navy-500)" />
      </button>

      {/* Logo */}
      <div className="sidebar__logo">
        <div className="sidebar__logo-icon">
          <Zap size={18} fill="white" color="white" />
        </div>
        {!collapsed && (
          <div className="sidebar__logo-text">
            <span className="sidebar__logo-name">InterviewIQ</span>
            <span className="sidebar__logo-tagline">AI Interview Coach</span>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="sidebar__nav" aria-label="Main navigation">
        {/* Main section */}
        {!collapsed && <span className="sidebar__section-label">Main</span>}
        {NAV_ITEMS.map(({ label, icon: Icon, to }) => (
          <NavLink
            key={to}
            to={to}
            id={`nav-${label.toLowerCase().replace(/\s+/g, '-')}`}
            className={({ isActive }) =>
              `sidebar__nav-item${isActive ? ' active' : ''}`
            }
          >
            <Icon size={18} />
            {!collapsed && <span className="sidebar__nav-text">{label}</span>}
          </NavLink>
        ))}

        {/* Interview section */}
        {!collapsed && <span className="sidebar__section-label">Interview</span>}
        {INTERVIEW_ITEMS.map(({ label, icon: Icon, to, badge }) => (
          <NavLink
            key={to}
            to={to}
            id={`nav-${label.toLowerCase().replace(/\s+/g, '-')}`}
            className={({ isActive }) =>
              `sidebar__nav-item${isActive ? ' active' : ''}`
            }
          >
            <Icon size={18} />
            {!collapsed && (
              <>
                <span className="sidebar__nav-text">{label}</span>
                {badge && <span className="sidebar__nav-badge">{badge}</span>}
              </>
            )}
          </NavLink>
        ))}

        {/* Results section */}
        {!collapsed && <span className="sidebar__section-label">Results</span>}
        {RESULTS_ITEMS.map(({ label, icon: Icon, to }) => (
          <NavLink
            key={to}
            to={to}
            id={`nav-${label.toLowerCase().replace(/\s+/g, '-')}`}
            className={({ isActive }) =>
              `sidebar__nav-item${isActive ? ' active' : ''}`
            }
          >
            <Icon size={18} />
            {!collapsed && <span className="sidebar__nav-text">{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* User footer */}
      <div className="sidebar__footer">
        <NavLink to="/profile" className="sidebar__user" id="sidebar-user-profile">
          <div className="sidebar__avatar">
            {getInitials(displayName)}
          </div>
          {!collapsed && (
            <div className="sidebar__user-info">
              <div className="sidebar__user-name">{displayName}</div>
              <div className="sidebar__user-role">{displayRole}</div>
            </div>
          )}
        </NavLink>
      </div>
    </aside>
  );
}
