import { useState, useEffect, useCallback } from 'react';
import { BookOpen, Users, AlertTriangle } from 'lucide-react';
import './SubjectWiseAnalysis.css';

const API_BASE = 'http://localhost:3000';

const SubjectWiseAnalysis = () => {
  const [subjects, setSubjects] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSnackbar, setShowSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  const showMessage = (message) => {
    setSnackbarMessage(message);
    setShowSnackbar(true);
    setTimeout(() => setShowSnackbar(false), 3000);
  };

  const fetchSubjectStatistics = useCallback(async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/submissions/subject-statistics`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      
      if (data.success) {
        setSubjects(data.subjects || []);
      } else {
        showMessage(data.error || 'Error fetching subject statistics');
      }
    } catch (error) {
      console.error('Error fetching subject statistics:', error);
      showMessage('Error fetching subject statistics');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubjectStatistics();
  }, [fetchSubjectStatistics]);

  const calculateOverallCompletion = (subject) => {
    const stats = subject.submissionStats || {};
    let totalSubmissions = 0;
    let completedSubmissions = 0;

    Object.values(stats).forEach(stat => {
      totalSubmissions += stat.total;
      completedSubmissions += stat.completed;
    });

    if (totalSubmissions === 0) return 0;
    return Math.round((completedSubmissions / totalSubmissions) * 100);
  };

  const SubjectCard = ({ subject }) => {
    const completionPercentage = calculateOverallCompletion(subject);

    return (
      <div className="subject-card-compact">
        <div className="card-header">
          <div className="card-icon">
            <BookOpen size={20} />
          </div>
          <div className="card-title-section">
            <h4>{subject.name}</h4>
            <span className="card-code">{subject.code}</span>
          </div>
          <span className={`subject-type-badge ${subject.type}`}>
            {subject.type === 'practical' ? 'Practical' : subject.type.toUpperCase()}
          </span>
        </div>
        
        <div className="card-body">
          <div className="progress-section">
            <div className="completion-circle">
              <svg width="85" height="85" viewBox="0 0 85 85">
                <circle
                  cx="42.5"
                  cy="42.5"
                  r="36"
                  fill="none"
                  stroke="#e8eaed"
                  strokeWidth="8"
                />
                <circle
                  cx="42.5"
                  cy="42.5"
                  r="36"
                  fill="none"
                  stroke="#4285f4"
                  strokeWidth="8"
                  strokeDasharray={`${(completionPercentage / 100) * 226.2} 226.2`}
                  strokeLinecap="round"
                  transform="rotate(-90 42.5 42.5)"
                />
              </svg>
              <div className="percentage-text">{completionPercentage}%</div>
            </div>
            
            <div className="stats-column">
              <div className="stat-item">
                <Users size={14} />
                <div className="stat-content">
                  <span className="stat-value">{subject.totalStudents}</span>
                  <span className="stat-label">Students</span>
                </div>
              </div>
              <div className="stat-item defaulter">
                <AlertTriangle size={14} />
                <div className="stat-content">
                  <span className="stat-value">{subject.defaulterCount}</span>
                  <span className="stat-label">Defaulters</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="subject-wise-analysis-compact">
      <div className="analysis-header-compact">
        <h2>Subject Wise Analysis</h2>
        <p>Overall submission progress</p>
      </div>

      {isLoading ? (
        <div className="loading-state-compact">
          <div className="spinner"></div>
        </div>
      ) : subjects.length === 0 ? (
        <div className="empty-state-compact">
          <BookOpen size={32} />
          <p>No subjects found</p>
        </div>
      ) : (
        <div className="subjects-scroll-container">
          {subjects.map(subject => (
            <SubjectCard key={subject.id} subject={subject} />
          ))}
        </div>
      )}

      {showSnackbar && (
        <div className="snackbar">
          {snackbarMessage}
        </div>
      )}
    </div>
  );
};

export default SubjectWiseAnalysis;
