import React, { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, Plus, Link as LinkIcon, SkipForward, Trash2, ExternalLink } from 'lucide-react';
import './DefaulterPlug.css';

const API_BASE = 'rivooooox-backnd.vercel.app';

const DefaulterPlug = () => {
  const [subjects, setSubjects] = useState({ theory: [], practical: [] });
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [instructionText, setInstructionText] = useState('');
  const [referenceLink, setReferenceLink] = useState('');
  const [skip, setSkip] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showSnackbar, setShowSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarType, setSnackbarType] = useState('success');
  const [defaulterSubmissions, setDefaulterSubmissions] = useState([]);
  const [deletingId, setDeletingId] = useState(null);

  const showMessage = useCallback((message, type = 'success') => {
    setSnackbarMessage(message);
    setSnackbarType(type);
    setShowSnackbar(true);
    setTimeout(() => setShowSnackbar(false), 4000);
  }, []);

  // Fetch subjects from backend
  const fetchSubjects = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/class-teacher/subjects`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) {
        console.warn('Subjects endpoint error:', response.status);
        setSubjects({ theory: [], practical: [] });
        return;
      }

      const data = await response.json();

      if (data.success) {
        setSubjects({
          theory: data.subjects.theory || [],
          practical: data.subjects.practical || []
        });
      } else {
        setSubjects({ theory: [], practical: [] });
      }
    } catch (error) {
      console.error('Error fetching subjects:', error);
      setSubjects({ theory: [], practical: [] });
    }
  }, []);

  // Fetch defaulter submissions
  const fetchDefaulterSubmissions = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/defaulter/submissions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();

      if (data.success) {
        setDefaulterSubmissions(data.submissions || []);
      }
    } catch (error) {
      console.error('Error fetching defaulter submissions:', error);
    }
  }, []);

  useEffect(() => {
    fetchSubjects();
    fetchDefaulterSubmissions();
  }, [fetchSubjects, fetchDefaulterSubmissions]);

  const handleAssignWork = async () => {
    // Validation
    if (!selectedSubjectId) {
      showMessage('Please select a subject', 'error');
      return;
    }

    if (!skip && !instructionText.trim()) {
      showMessage('Please enter instruction text or enable skip option', 'error');
      return;
    }

    if (!skip && referenceLink && !isValidUrl(referenceLink)) {
      showMessage('Please enter a valid URL for reference link', 'error');
      return;
    }

    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');

      const payload = {
        subject_id: selectedSubjectId,
        instruction_text: instructionText.trim(),
        reference_link: referenceLink.trim() || null,
        skip: skip
      };

      const response = await fetch(`${API_BASE}/api/defaulter/assign-defaulter-work`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to assign defaulter work');
      }

      if (data.success) {
        // Check if there are no defaulter students (this is informational, not an error)
        if (data.message && data.message.includes('No defaulter students')) {
          showMessage(data.message, 'success');
          // Don't reset form in this case, let user try with a different subject
          return;
        }

        showMessage(
          data.message || (
            skip
              ? `Marked as skipped. ${data.total_assigned || 0} defaulter students updated.`
              : `Defaulter work assigned successfully to ${data.total_assigned || 0} students.`
          ),
          'success'
        );

        // Reset form only if assignment was successful
        setSelectedSubjectId('');
        setInstructionText('');
        setReferenceLink('');
        setSkip(false);

        // Refresh submissions if needed
        fetchDefaulterSubmissions();
      }
    } catch (error) {
      console.error('Error assigning defaulter work:', error);
      showMessage(error.message || 'Failed to assign defaulter work', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const isValidUrl = (string) => {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  };

  const handleSkipToggle = () => {
    setSkip(!skip);
    if (!skip) {
      // When enabling skip, clear instruction text
      setInstructionText('');
    }
  };

  const handleDeleteWork = async (subjectId) => {
    if (!window.confirm('Are you sure you want to delete this defaulter work? This will remove it for all students.')) {
      return;
    }

    try {
      setDeletingId(subjectId);
      const token = localStorage.getItem('token');

      const response = await fetch(`${API_BASE}/api/defaulter/submissions/${subjectId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        showMessage('Defaulter work deleted successfully', 'success');
        fetchDefaulterSubmissions();
      } else {
        throw new Error(data.error || 'Failed to delete');
      }
    } catch (error) {
      console.error('Error deleting defaulter work:', error);
      showMessage(error.message || 'Failed to delete defaulter work', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  // Get all subjects as a flat array for selection
  const allSubjects = [
    ...subjects.theory.map(s => ({ ...s, type: 'theory', displayName: `${s.name} (Theory)` })),
    ...subjects.practical.map(s => ({ ...s, type: 'practical', displayName: `${s.name} (Practical)` }))
  ];

  return (
    <div className="defaulter-plug">
      <h2>Manage Defaulter Work</h2>

      {/* Add New Work Section */}
      <div className="add-work-section">
        <div className="section-header">
          <AlertTriangle size={20} />
          <span>Assign Defaulter Work</span>
        </div>

        <div className="add-work-form">
          <div className="form-group">
            <label htmlFor="subject-select">Select Subject *</label>
            <select
              id="subject-select"
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              className="subject-select"
              disabled={isLoading}
            >
              <option value="">Select Subject</option>
              {allSubjects.map(subject => (
                <option key={subject.id} value={subject.id}>
                  {subject.displayName} - {subject.code}
                </option>
              ))}
            </select>
            {allSubjects.length === 0 && (
              <p className="helper-text">No subjects available. Please add subjects first.</p>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="skip-toggle" className="checkbox-label">
              <input
                type="checkbox"
                id="skip-toggle"
                checked={skip}
                onChange={handleSkipToggle}
                disabled={isLoading}
                className="skip-checkbox"
              />
              <SkipForward size={16} />
              <span>Skip Defaulter Work for this Subject</span>
            </label>
            <p className="helper-text">
              {skip
                ? 'When enabled, defaulter students will not receive work for this subject.'
                : 'Enable this to skip assigning work to defaulter students for this subject.'}
            </p>
          </div>

          {!skip && (
            <>
              <div className="form-group">
                <label htmlFor="instruction-text">Instruction Text *</label>
                <textarea
                  id="instruction-text"
                  placeholder="Enter the defaulter work instructions (e.g., 'Solve 2 previous year question papers')"
                  value={instructionText}
                  onChange={(e) => setInstructionText(e.target.value)}
                  className="work-textarea"
                  rows="4"
                  disabled={isLoading}
                />
                <p className="helper-text">Describe the work that defaulter students need to complete.</p>
              </div>

              <div className="form-group">
                <label htmlFor="reference-link">
                  <LinkIcon size={16} />
                  Reference Link (Optional)
                </label>
                <input
                  id="reference-link"
                  type="url"
                  placeholder="https://drive.google.com/assignment-link"
                  value={referenceLink}
                  onChange={(e) => setReferenceLink(e.target.value)}
                  className="form-input"
                  disabled={isLoading}
                />
                <p className="helper-text">Provide a link to reference materials, assignments, or resources.</p>
              </div>
            </>
          )}

          <button
            className="add-work-btn"
            onClick={handleAssignWork}
            disabled={isLoading || !selectedSubjectId || (!skip && !instructionText.trim())}
          >
            {isLoading ? (
              <>Loading...</>
            ) : skip ? (
              <>
                <SkipForward size={16} />
                Skip Defaulter Work
              </>
            ) : (
              <>
                <Plus size={16} />
                Assign Defaulter Work
              </>
            )}
          </button>
        </div>
      </div>

      {/* Assigned Work Section */}
      {defaulterSubmissions.length > 0 && (
        <div className="assigned-work-section">
          <div className="section-header">
            <AlertTriangle size={20} />
            <span>Assigned Defaulter Work</span>
          </div>

          <div className="work-list">
            {defaulterSubmissions.map((submission) => (
              <div key={submission.id} className="work-item">
                <div className="work-item-header">
                  <div className="work-subject">
                    <h4>{submission.subjects?.name || 'Unknown Subject'}</h4>
                    <span className="subject-code">{submission.subjects?.subject_code}</span>
                    {submission.skip && <span className="skip-badge">Skipped</span>}
                  </div>
                  <button
                    className="delete-btn"
                    onClick={() => handleDeleteWork(submission.subject_id)}
                    disabled={deletingId === submission.subject_id}
                    title="Delete this work"
                  >
                    {deletingId === submission.subject_id ? (
                      <span>Deleting...</span>
                    ) : (
                      <Trash2 size={18} />
                    )}
                  </button>
                </div>

                {!submission.skip && (
                  <>
                    <div className="work-content">
                      <p className="work-text">{submission.submission_text}</p>
                    </div>

                    {submission.reference_link && (
                      <div className="work-link">
                        <LinkIcon size={14} />
                        <a
                          href={submission.reference_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="reference-link"
                        >
                          {submission.reference_link}
                          <ExternalLink size={12} />
                        </a>
                      </div>
                    )}
                  </>
                )}

                <div className="work-meta">
                  <span className="work-date">
                    Added: {new Date(submission.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info Section */}
      <div className="info-section">
        <div className="info-card">
          <AlertTriangle size={20} />
          <div>
            <h4>How it works</h4>
            <ul>
              <li>Select a subject and enter work instructions for defaulter students</li>
              <li>All students with attendance below 75% will receive this work</li>
              <li>You can provide a reference link for additional resources</li>
              <li>Use the skip option to exclude a subject from defaulter work assignments</li>
            </ul>
          </div>
        </div>
      </div>

      {showSnackbar && (
        <div className={`snackbar ${snackbarType}`}>
          {snackbarMessage}
        </div>
      )}
    </div>
  );
};

export default DefaulterPlug;