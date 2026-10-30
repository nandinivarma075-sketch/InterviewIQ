import { useNavigate } from 'react-router-dom';
import { ArrowRight, Check } from 'lucide-react';
import { jobRoles } from '../data/mockData';
import { useInterview } from '../context/InterviewContext';
import './PlaceholderPage.css';

export default function RoleSelectionPage() {
  const navigate = useNavigate();
  const { selectedRole, updateRole } = useInterview();

  return (
    <div className="placeholder-page" id="role-selection-page">
      <div className="placeholder-page__header">
        <h2 className="placeholder-page__title">Select Job Role</h2>
        <p className="placeholder-page__subtitle">
          Choose the role you're interviewing for. Our AI tailors questions to your target position.
        </p>
      </div>

      <div className="roles-grid">
        {jobRoles.map((role) => (
          <button
            key={role.id}
            id={`role-card-${role.id}`}
            className={`role-card card ${selectedRole === role.id ? 'role-card--selected' : ''}`}
            onClick={() => updateRole(role.id)}
            aria-pressed={selectedRole === role.id}
          >
            <div className="role-card__inner card-body">
              <div className="role-card__top">
                <h3 className="role-card__title">{role.label}</h3>
                {selectedRole === role.id && (
                  <span className="role-card__check" aria-hidden="true">
                    <Check size={14} />
                  </span>
                )}
              </div>
              <div className="role-card__tags">
                {role.tags.map((tag) => (
                  <span key={tag} className="badge badge-navy">{tag}</span>
                ))}
              </div>
            </div>
          </button>
        ))}
      </div>


      {selectedRole && (
        <div className="placeholder-page__actions">
          <button
            id="role-continue-btn"
            className="btn btn-primary btn-lg"
            onClick={() => navigate('/interview/setup')}
          >
            Continue to Setup <ArrowRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
