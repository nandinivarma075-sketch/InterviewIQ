import { Bell, Search, Moon, Sun } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getInitials } from '../../utils/helpers';
import { useTheme } from '../../context/ThemeContext';
import './Header.css';

export default function Header({ title = 'Dashboard', subtitle = '' }) {
  const { dark, toggleTheme } = useTheme();
  const { user } = useAuth();
  const displayName = user?.name || 'User';

  return (
    <header className="app-header" role="banner">
      <div className="app-header__left">
        <h1 className="app-header__title">{title}</h1>
        {subtitle && <p className="app-header__subtitle">{subtitle}</p>}
      </div>

      <div className="app-header__right">
        {/* Search */}
        <div className="app-header__search" role="search">
          <Search size={15} className="app-header__search-icon" />
          <input
            id="header-search"
            className="app-header__search-input"
            type="search"
            placeholder="Search..."
            aria-label="Search"
          />
        </div>

        {/* Dark mode toggle */}
        <button
          id="header-theme-toggle"
          className="app-header__icon-btn"
          onClick={toggleTheme}
          aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
          title={dark ? 'Light mode' : 'Dark mode'}
        >
          {dark ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        {/* Notifications */}
        <button
          id="header-notifications"
          className="app-header__icon-btn app-header__icon-btn--notify"
          aria-label="Notifications"
        >
          <Bell size={16} />
          <span className="app-header__notify-dot" aria-hidden="true" />
        </button>

        {/* Avatar */}
        <div className="app-header__avatar" aria-label={displayName} title={displayName}>
          {getInitials(displayName)}
        </div>
      </div>
    </header>
  );
}
