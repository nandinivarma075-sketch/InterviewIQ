import { Zap } from 'lucide-react';
import './Logo.css';

export default function Logo({ collapsed = false, size = 'md' }) {
  return (
    <div className={`logo logo--${size} ${collapsed ? 'logo--collapsed' : ''}`}>
      <div className="logo__icon">
        <Zap size={size === 'sm' ? 16 : 20} fill="white" color="white" />
      </div>
      {!collapsed && (
        <div className="logo__text">
          <span className="logo__name">InterviewIQ</span>
          <span className="logo__tagline">AI Interview Coach</span>
        </div>
      )}
    </div>
  );
}
