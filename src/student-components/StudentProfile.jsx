import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, Hash, BookOpen, Award, GraduationCap, Save, AlertTriangle } from 'lucide-react';
import { useStudentContext } from './StudentApp';
import './StudentProfile.css';

const API_BASE = 'rivooooox-backnd.vercel.app';

const StudentProfile = () => {
  const { studentData } = useStudentContext();

  // State for elective subjects and faculties
  const [electiveSubjects, setElectiveSubjects] = useState({
    mdm: [],
    oe: [],
    pe: []
  });
  const [currentSelections, setCurrentSelections] = useState({});
  const [selectedSubjects, setSelectedSubjects] = useState({
    mdm: { subject_id: '', faculty_id: '', subject_name: '', faculty_name: '' },
    oe: { subject_id: '', faculty_id: '', subject_name: '', faculty_name: '' },
    pe: { subject_id: '', faculty_id: '', subject_name: '', faculty_name: '' }
  });
  const [selectionsLocked, setSelectionsLocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [locking, setLocking] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Fetch elective subjects on component mount
  useEffect(() => {
    const fetchElectiveSubjects = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');

        const response = await fetch(`${API_BASE}/api/students/elective-subjects`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        const data = await response.json();
        console.log('Elective subjects data:', data);

        if (data.success) {
          setElectiveSubjects(data.electives);

          // Ensure currentSelections is an object
          const selections = data.currentSelections || {};
          setCurrentSelections(selections);

          // Check if selections are locked
          const isLocked = selections.selections_locked === true;
          setSelectionsLocked(isLocked);

          console.log('📚 Current selections from DB:', selections);
          console.log('🔒 Selections locked:', isLocked);

          // Helper to get subject and faculty names
          const getSubjectName = (type, subjectId) => {
            if (!subjectId) return '';
            const subject = data.electives[type]?.find(s => s.id === subjectId);
            const name = subject ? `${subject.code} - ${subject.name}` : '';
            console.log(`Getting ${type.toUpperCase()} subject name for ID ${subjectId}:`, name);
            return name;
          };

          const getFacultyName = (type, subjectId, facultyId) => {
            if (!subjectId || !facultyId) return '';
            const subject = data.electives[type]?.find(s => s.id === subjectId);
            const faculty = subject?.faculties?.find(f => f.id === facultyId);
            const name = faculty ? faculty.name : '';
            console.log(`Getting ${type.toUpperCase()} faculty name for ID ${facultyId}:`, name);
            return name;
          };

          // Set current selections in form with names
          const newSelections = {
            mdm: {
              subject_id: selections.mdm_id || '',
              faculty_id: selections.mdm_faculty_id || '',
              subject_name: getSubjectName('mdm', selections.mdm_id),
              faculty_name: getFacultyName('mdm', selections.mdm_id, selections.mdm_faculty_id)
            },
            oe: {
              subject_id: selections.oe_id || '',
              faculty_id: selections.oe_faculty_id || '',
              subject_name: getSubjectName('oe', selections.oe_id),
              faculty_name: getFacultyName('oe', selections.oe_id, selections.oe_faculty_id)
            },
            pe: {
              subject_id: selections.pe_id || '',
              faculty_id: selections.pe_faculty_id || '',
              subject_name: getSubjectName('pe', selections.pe_id),
              faculty_name: getFacultyName('pe', selections.pe_id, selections.pe_faculty_id)
            }
          };

          console.log('✅ Setting selected subjects:', newSelections);
          setSelectedSubjects(newSelections);
        } else {
          setError(data.error || 'Failed to load elective subjects');
        }
      } catch (err) {
        console.error('Error fetching elective subjects:', err);
        setError('Failed to load elective subjects');
      } finally {
        setLoading(false);
      }
    };

    fetchElectiveSubjects();
  }, []);

  // Handle subject selection change
  const handleSubjectChange = (type, subjectId) => {
    setSelectedSubjects(prev => ({
      ...prev,
      [type]: {
        subject_id: subjectId,
        faculty_id: '' // Reset faculty when subject changes
      }
    }));
  };

  // Handle faculty selection change
  const handleFacultyChange = (type, facultyId) => {
    setSelectedSubjects(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        faculty_id: facultyId
      }
    }));
  };

  // Save elective selection
  const saveElectiveSelection = async (type) => {
    const selection = selectedSubjects[type];

    if (!selection.subject_id || !selection.faculty_id) {
      setError(`Please select both subject and faculty for ${type.toUpperCase()}`);
      return;
    }

    try {
      setSaving(true);
      const token = localStorage.getItem('token');

      const response = await fetch(`${API_BASE}/api/students/select-elective`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          subject_id: selection.subject_id,
          faculty_id: selection.faculty_id,
          type: type.toUpperCase()
        }),
      });

      const data = await response.json();
      console.log('Save elective response:', data);

      if (data.success) {
        setSuccessMessage(`${type.toUpperCase()} selection saved successfully!`);
        setError('');
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setError(data.error || 'Failed to save selection');
      }
    } catch (err) {
      console.error('Error saving elective selection:', err);
      setError('Failed to save selection');
    } finally {
      setSaving(false);
    }
  };

  // Get faculty options for selected subject
  const getFacultyOptions = (type) => {
    const subjectId = selectedSubjects[type].subject_id;
    if (!subjectId) return [];

    const subject = electiveSubjects[type].find(s => s.id === subjectId);
    return subject ? subject.faculties : [];
  };

  // Lock selections
  const lockSelections = async () => {
    // Check which electives are available based on what the backend returned
    const availableElectives = [];
    if (electiveSubjects.oe && electiveSubjects.oe.length > 0) availableElectives.push('OE');
    if (electiveSubjects.mdm && electiveSubjects.mdm.length > 0) availableElectives.push('MDM');
    if (electiveSubjects.pe && electiveSubjects.pe.length > 0) availableElectives.push('PE');

    // Check if all available subjects are selected
    const missingSubjects = [];
    if (availableElectives.includes('OE') && !selectedSubjects.oe.subject_id) missingSubjects.push('OE');
    if (availableElectives.includes('MDM') && !selectedSubjects.mdm.subject_id) missingSubjects.push('MDM');
    if (availableElectives.includes('PE') && !selectedSubjects.pe.subject_id) missingSubjects.push('PE');

    if (missingSubjects.length > 0) {
      setError(`Please select all available elective subjects (${missingSubjects.join(', ')}) before finalizing`);
      return;
    }

    // Check if all available subjects have faculty selected
    const missingFaculty = [];
    if (availableElectives.includes('OE') && !selectedSubjects.oe.faculty_id) missingFaculty.push('OE');
    if (availableElectives.includes('MDM') && !selectedSubjects.mdm.faculty_id) missingFaculty.push('MDM');
    if (availableElectives.includes('PE') && !selectedSubjects.pe.faculty_id) missingFaculty.push('PE');

    if (missingFaculty.length > 0) {
      setError(`Please select faculty for all elective subjects (${missingFaculty.join(', ')}) before finalizing`);
      return;
    }

    if (!window.confirm('Are you sure you want to finalize your selections? You will not be able to change them without contacting your class teacher.')) {
      return;
    }

    try {
      setLocking(true);
      const token = localStorage.getItem('token');

      const response = await fetch(`${API_BASE}/api/students/lock-selections`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        }
      });

      const data = await response.json();

      if (data.success) {
        setSelectionsLocked(true);
        setSuccessMessage('Your elective selections have been finalized successfully!');
        setError('');
        setTimeout(() => setSuccessMessage(''), 5000);
      } else {
        setError(data.error || 'Failed to finalize selections');
      }
    } catch (err) {
      console.error('Error locking selections:', err);
      setError('Failed to finalize selections');
    } finally {
      setLocking(false);
    }
  };

  // Build academic fields dynamically based on available electives
  const buildAcademicFields = () => {
    const fields = [];
    
    // Add OE if available
    if (electiveSubjects.oe && electiveSubjects.oe.length > 0) {
      fields.push(
        { label: 'Open Elective (OE)', value: selectedSubjects.oe.subject_name || 'Not Selected', icon: BookOpen },
        { label: 'OE Faculty', value: selectedSubjects.oe.faculty_name || 'Not Selected', icon: User }
      );
    }
    
    // Add MDM if available
    if (electiveSubjects.mdm && electiveSubjects.mdm.length > 0) {
      fields.push(
        { label: 'Multidisciplinary Minor (MDM)', value: selectedSubjects.mdm.subject_name || 'Not Selected', icon: GraduationCap },
        { label: 'MDM Faculty', value: selectedSubjects.mdm.faculty_name || 'Not Selected', icon: User }
      );
    }
    
    // Add PE if available
    if (electiveSubjects.pe && electiveSubjects.pe.length > 0) {
      fields.push(
        { label: 'Professional Elective (PE)', value: selectedSubjects.pe.subject_name || 'Not Selected', icon: Award },
        { label: 'PE Faculty', value: selectedSubjects.pe.faculty_name || 'Not Selected', icon: User }
      );
    }
    
    return fields;
  };

  const profileSections = [
    {
      title: 'Personal Information',
      icon: User,
      fields: [
        { label: 'Full Name', value: studentData.name, icon: User },
        { label: 'Roll Number', value: studentData.rollNumber, icon: Hash },
        { label: 'Hall Ticket Number', value: studentData.hallTicket, icon: Hash },
        { label: 'Email Address', value: studentData.email, icon: Mail },
        { label: 'Contact Number', value: studentData.contact, icon: Phone },
        { label: 'Batch', value: studentData.batch, icon: GraduationCap }
      ]
    },
    {
      title: 'Academic Information',
      icon: BookOpen,
      fields: buildAcademicFields()
    }
  ];

  return (
    <div className="student-profile">
      <div className="profile-header">
        <div className="profile-left">
          <div className="profile-avatar">
            <User size={48} />
          </div>
          <div className="profile-info">
            <h1>{studentData.name}</h1>
            <p>{studentData.rollNumber}</p>
          </div>
        </div>

        <div className="profile-right">
          <div className="completion-circle">
            <svg className="progress-ring" width="120" height="120">
              <circle
                className="progress-ring-circle-bg"
                stroke="#e8eaed"
                strokeWidth="8"
                fill="transparent"
                r="52"
                cx="60"
                cy="60"
              />
              <circle
                className="progress-ring-circle"
                stroke="#4285f4"
                strokeWidth="8"
                fill="transparent"
                r="52"
                cx="60"
                cy="60"
                strokeDasharray={`${2 * Math.PI * 52}`}
                strokeDashoffset={`${2 * Math.PI * 52 * (1 - studentData.submissionPercentage / 100)}`}
                strokeLinecap="round"
              />
            </svg>
            <div className="completion-text">
              <span className="completion-percentage">{studentData.submissionPercentage}%</span>
              <span className="completion-label">Complete</span>
            </div>
          </div>
        </div>
      </div>

      <div className="profile-sections">
        {profileSections.map((section, index) => {
          const SectionIcon = section.icon;
          return (
            <div key={index} className="profile-section">
              <div className="section-header">
                <SectionIcon size={20} />
                <h2>{section.title}</h2>
              </div>

              <div className="section-content">
                <div className="fields-grid">
                  {section.fields.map((field, fieldIndex) => {
                    const FieldIcon = field.icon;
                    return (
                      <div key={fieldIndex} className="field-item">
                        <div className="field-icon">
                          <FieldIcon size={16} />
                        </div>
                        <div className="field-content">
                          <label className="field-label">{field.label}</label>
                          <div className="field-value">{field.value}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}

        {/* Elective Subjects Section with Dropdowns */}
        <div className="profile-section">
          <div className="section-header">
            <Award size={20} />
            <h2>Elective Subjects Selection</h2>
            {selectionsLocked && (
              <span style={{
                marginLeft: 'auto',
                padding: '4px 12px',
                background: '#34a853',
                color: 'white',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: '600'
              }}>
                ✓ Finalized
              </span>
            )}
          </div>

          {loading ? (
            <div className="loading-state">
              <p>Loading elective subjects...</p>
            </div>
          ) : error ? (
            <div className="error-state">
              <AlertTriangle size={20} />
              <p>{error}</p>
            </div>
          ) : (
            <div className="section-content">
              {selectionsLocked && (
                <div style={{
                  padding: '12px',
                  background: '#e6f4ea',
                  border: '1px solid #34a853',
                  borderRadius: '8px',
                  marginBottom: '20px',
                  color: '#137333'
                }}>
                  <p style={{ margin: 0, fontSize: '14px' }}>
                    ✓ Your elective selections have been finalized. Contact your class teacher if you need to make changes.
                  </p>
                </div>
              )}

              {successMessage && (
                <div className="success-message">
                  <p>{successMessage}</p>
                </div>
              )}

              <div className="elective-fields-grid">
                {/* Open Elective (OE) - Show for Year 2, 3, and 4 */}
                {electiveSubjects.oe && electiveSubjects.oe.length > 0 && (
                  <div className="elective-field">
                    <label className="elective-label">
                      <BookOpen size={16} />
                      Open Elective (OE)
                    </label>
                    <select
                      value={selectedSubjects.oe.subject_id}
                      onChange={(e) => handleSubjectChange('oe', e.target.value)}
                      className="elective-dropdown"
                      disabled={saving || selectionsLocked}
                    >
                      <option value="">Select Open Elective Subject</option>
                      {electiveSubjects.oe.map((subject) => (
                        <option key={subject.id} value={subject.id}>
                          {subject.code} - {subject.name}
                        </option>
                      ))}
                    </select>

                    {selectedSubjects.oe.subject_id && (
                      <>
                        <select
                          value={selectedSubjects.oe.faculty_id}
                          onChange={(e) => handleFacultyChange('oe', e.target.value)}
                          className="elective-dropdown faculty-dropdown"
                          disabled={saving || selectionsLocked}
                        >
                          <option value="">Select Faculty</option>
                          {getFacultyOptions('oe').map((faculty) => (
                            <option key={faculty.id} value={faculty.id}>
                              {faculty.name}
                            </option>
                          ))}
                        </select>

                        <button
                          className="save-elective-btn"
                          onClick={() => saveElectiveSelection('oe')}
                          disabled={saving || selectionsLocked || !selectedSubjects.oe.faculty_id}
                        >
                          <Save size={16} />
                          {saving ? 'Saving...' : 'Save OE Selection'}
                        </button>
                      </>
                    )}
                  </div>
                )}

                {/* Multidisciplinary Minor (MDM) - Show for Year 2 and 3 only */}
                {electiveSubjects.mdm && electiveSubjects.mdm.length > 0 && (
                  <div className="elective-field">
                    <label className="elective-label">
                      <GraduationCap size={16} />
                      Multidisciplinary Minor (MDM)
                    </label>
                    <select
                      value={selectedSubjects.mdm.subject_id}
                      onChange={(e) => handleSubjectChange('mdm', e.target.value)}
                      className="elective-dropdown"
                      disabled={saving || selectionsLocked}
                    >
                      <option value="">Select MDM Subject</option>
                      {electiveSubjects.mdm.map((subject) => (
                        <option key={subject.id} value={subject.id}>
                          {subject.code} - {subject.name}
                        </option>
                      ))}
                    </select>

                    {selectedSubjects.mdm.subject_id && (
                      <>
                        <select
                          value={selectedSubjects.mdm.faculty_id}
                          onChange={(e) => handleFacultyChange('mdm', e.target.value)}
                          className="elective-dropdown faculty-dropdown"
                          disabled={saving || selectionsLocked}
                        >
                          <option value="">Select Faculty</option>
                          {getFacultyOptions('mdm').map((faculty) => (
                            <option key={faculty.id} value={faculty.id}>
                              {faculty.name}
                            </option>
                          ))}
                        </select>

                        <button
                          className="save-elective-btn"
                          onClick={() => saveElectiveSelection('mdm')}
                          disabled={saving || selectionsLocked || !selectedSubjects.mdm.faculty_id}
                        >
                          <Save size={16} />
                          {saving ? 'Saving...' : 'Save MDM Selection'}
                        </button>
                      </>
                    )}
                  </div>
                )}

                {/* Professional Elective (PE) - Show for Year 3 and 4 only */}
                {electiveSubjects.pe && electiveSubjects.pe.length > 0 && (
                  <div className="elective-field">
                    <label className="elective-label">
                      <Award size={16} />
                      Professional Elective (PE)
                    </label>
                    <select
                      value={selectedSubjects.pe.subject_id}
                      onChange={(e) => handleSubjectChange('pe', e.target.value)}
                      className="elective-dropdown"
                      disabled={saving || selectionsLocked}
                    >
                      <option value="">Select Professional Elective Subject</option>
                      {electiveSubjects.pe.map((subject) => (
                        <option key={subject.id} value={subject.id}>
                          {subject.code} - {subject.name}
                        </option>
                      ))}
                    </select>

                    {selectedSubjects.pe.subject_id && (
                      <>
                        <select
                          value={selectedSubjects.pe.faculty_id}
                          onChange={(e) => handleFacultyChange('pe', e.target.value)}
                          className="elective-dropdown faculty-dropdown"
                          disabled={saving || selectionsLocked}
                        >
                          <option value="">Select Faculty</option>
                          {getFacultyOptions('pe').map((faculty) => (
                            <option key={faculty.id} value={faculty.id}>
                              {faculty.name}
                            </option>
                          ))}
                        </select>

                        <button
                          className="save-elective-btn"
                          onClick={() => saveElectiveSelection('pe')}
                          disabled={saving || selectionsLocked || !selectedSubjects.pe.faculty_id}
                        >
                          <Save size={16} />
                          {saving ? 'Saving...' : 'Save PE Selection'}
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Finalize Selections Button */}
              {!selectionsLocked && (
                <div style={{ marginTop: '20px', textAlign: 'center' }}>
                  <button
                    className="finalize-selections-btn"
                    onClick={lockSelections}
                    disabled={locking}
                    style={{
                      padding: '12px 32px',
                      background: '#34a853',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '16px',
                      fontWeight: '600',
                      cursor: locking ? 'not-allowed' : 'pointer',
                      opacity: locking ? 0.6 : 1,
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {locking ? 'Finalizing...' : '✓ Finalize All Selections'}
                  </button>
                  <p style={{
                    marginTop: '10px',
                    fontSize: '13px',
                    color: '#5f6368'
                  }}>
                    Once finalized, you cannot change your selections without contacting your class teacher
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="profile-footer">
        <div className="footer-note">
          <p>This profile is in view-only mode. Contact your administrator for any changes.</p>
        </div>
      </div>
    </div>
  );
};

export default StudentProfile;