import React, { useState } from 'react';
import { User, ChevronDown, LogOut } from 'lucide-react';
import { useAppContext } from './AuthWrapper';
import './Header.css';

const Header = () => {
  const {
    isSubmissionAvailable,
    setIsSubmissionAvailable,
    subjects,
    user,
    onLogout
  } = useAppContext();

  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showSubjectDropdown, setShowSubjectDropdown] = useState(false);
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [updatingAvailability, setUpdatingAvailability] = useState(false);

  const [teacherSubjects, setTeacherSubjects] = useState({ theory: [], practical: [] });

  // Fetch availability status and subjects on mount
  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');

        // Fetch available subjects
        const availResponse = await fetch('http://localhost:3000/api/class-teacher/available-subjects', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const availData = await availResponse.json();
        if (availData.success) {
          setIsSubmissionAvailable(availData.isAvailable);
          setSelectedSubjects(availData.selectedSubjects || []);
        }

        // Fetch teacher's subjects
        const subjectsResponse = await fetch('http://localhost:3000/api/submissions/faculty-subjects', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const subjectsData = await subjectsResponse.json();
        if (subjectsData.success) {
          setTeacherSubjects({
            theory: subjectsData.subjects.theory || [],
            practical: subjectsData.subjects.practical || []
          });
          console.log('Teacher subjects loaded:', subjectsData.subjects);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    if (user?.role === 'class_teacher' || user?.role === 'faculty') {
      fetchData();
    }
  }, [user, setIsSubmissionAvailable]);

  // Debug: Log user data
  React.useEffect(() => {
    console.log('Header - User data:', user);
  }, [user]);

  // Helper function to format role display
  const formatRole = (role) => {
    const roleMap = {
      'class_teacher': 'Class Teacher',
      'hod': 'Head of Department',
      'director': 'Director',
      'faculty': 'Faculty',
      'student': 'Student'
    };
    return roleMap[role] || role || 'User';
  };

  const handleToggleSubmission = async () => {
    try {
      setUpdatingAvailability(true);
      const token = localStorage.getItem('token');
      const newStatus = !isSubmissionAvailable;

      // If turning on, must have selected subjects
      if (newStatus && selectedSubjects.length === 0) {
        alert('Please select at least one subject before turning on availability');
        setUpdatingAvailability(false);
        return;
      }

      const response = await fetch('http://localhost:3000/api/class-teacher/availability', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ 
          isAvailable: newStatus,
          selectedSubjects: newStatus ? selectedSubjects : []
        })
      });

      const data = await response.json();

      if (data.success) {
        setIsSubmissionAvailable(data.isAvailable);
        if (!data.isAvailable) {
          setSelectedSubjects([]);
        }
      } else {
        console.error('Failed to update availability:', data.error);
        alert('Failed to update availability: ' + data.error);
      }
    } catch (error) {
      console.error('Error updating availability:', error);
      alert('Error updating availability');
    } finally {
      setUpdatingAvailability(false);
    }
  };

  const handleSubjectToggle = (subjectCode, e) => {
    e.stopPropagation();
    setSelectedSubjects(prev => {
      if (prev.includes(subjectCode)) {
        return prev.filter(code => code !== subjectCode);
      } else {
        return [...prev, subjectCode];
      }
    });
  };

  const handleClearAll = (e) => {
    e.stopPropagation();
    setSelectedSubjects([]);
  };

  // Use teacher's subjects from database instead of context
  const allSubjects = [
    ...teacherSubjects.theory.map(s => ({ 
      ...s, 
      type: s.type ? s.type.charAt(0).toUpperCase() + s.type.slice(1) : 'Theory' 
    })),
    ...teacherSubjects.practical.map(s => ({ ...s, type: 'Practical' }))
  ];

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (showSubjectDropdown && !event.target.closest('.subject-selector')) {
        setShowSubjectDropdown(false);
      }
      if (showUserMenu && !event.target.closest('.user-menu-container')) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSubjectDropdown, showUserMenu]);

  return (
    <header className="header">
      <div className="header-left">
        <div className="mil-csn-logo">
          <img
            src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT4tIzAnxHyTy7vmn4G2MT00_NUMlZub68bjA&s"
            alt="Logo"
            style={{ height: "auto", width: "190px" }}
          />

        </div>
      </div>

      <div className="header-right">
        {(user?.role === 'class_teacher' || user?.role === 'faculty') && (
          <div className="submission-toggle" style={{ display: 'flex', visibility: 'visible' }}>
            <span>Available for Submissions?</span>
            <div
              className={`toggle-switch ${isSubmissionAvailable ? 'active' : ''}`}
              onClick={handleToggleSubmission}
              style={{ opacity: updatingAvailability ? 0.6 : 1, pointerEvents: updatingAvailability ? 'none' : 'auto' }}
            >
              <input
                type="checkbox"
                checked={isSubmissionAvailable}
                onChange={handleToggleSubmission}
                disabled={updatingAvailability}
              />
              <span className="toggle-slider"></span>
            </div>
          </div>
        )}

        <div className="subject-selector">
          <div
            className="subject-dropdown-trigger"
            onClick={() => setShowSubjectDropdown(!showSubjectDropdown)}
          >
            <span>
              {selectedSubjects.length === 0
                ? 'Select Subjects'
                : `${selectedSubjects.length} Subject${selectedSubjects.length > 1 ? 's' : ''} Selected`}
            </span>
            <ChevronDown size={16} />
          </div>

          {showSubjectDropdown && (
            <div className="subject-dropdown-menu" onClick={(e) => e.stopPropagation()}>
              <div className="dropdown-header">
                <span>Select Subjects for Submission</span>
                {selectedSubjects.length > 0 && (
                  <button
                    className="clear-all-btn"
                    onClick={handleClearAll}
                  >
                    Clear All
                  </button>
                )}
              </div>
              <div className="dropdown-content">
                {allSubjects.length > 0 ? (
                  allSubjects.map((subject) => (
                    <label
                      key={subject.code}
                      className="subject-checkbox-item"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={selectedSubjects.includes(subject.code)}
                        onChange={(e) => handleSubjectToggle(subject.code, e)}
                      />
                      <span className="checkbox-custom"></span>
                      <span className="subject-label">
                        <span className="subject-name">{subject.name}</span>
                        <span className="subject-type">{subject.type}</span>
                      </span>
                    </label>
                  ))
                ) : (
                  <div className="no-subjects">
                    <p>No subjects available</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="faculty-info">
          <div className="faculty-details">
            <div className="faculty-name">{user?.name || 'User'}</div>
            <div className="faculty-role">{formatRole(user?.role)}</div>
          </div>
          <div className="user-menu-container">
            <div
              className="user-avatar"
              onClick={() => setShowUserMenu(!showUserMenu)}
            >
              <User size={20} />
              <ChevronDown size={16} />
            </div>
            {showUserMenu && (
              <div className="user-dropdown">
                <div className="user-info">
                  <p>{user?.name || 'User'}</p>
                  <span>{formatRole(user?.role)}</span>
                </div>
                <button className="logout-btn" onClick={onLogout}>
                  <LogOut size={16} />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;