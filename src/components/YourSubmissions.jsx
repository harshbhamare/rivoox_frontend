import { useState, useEffect, useCallback } from 'react';
import { ChevronDown } from 'lucide-react';
import './YourSubmissions.css';

const API_BASE = 'http://localhost:3000';

const YourSubmissions = () => {
  const [subjects, setSubjects] = useState({ theory: [], practical: [] });
  const [students, setStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [hoveredStudent, setHoveredStudent] = useState(null);
  const [showSnackbar, setShowSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [submissionTypes, setSubmissionTypes] = useState([]);

  const showMessage = (message) => {
    setSnackbarMessage(message);
    setShowSnackbar(true);
    setTimeout(() => setShowSnackbar(false), 3000);
  };

  // Fetch subjects from backend
  const fetchSubjects = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/submissions/faculty-subjects`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      
      if (data.success) {
        setSubjects({
          theory: data.subjects.theory || [],
          practical: data.subjects.practical || []
        });
      }
    } catch (error) {
      console.error('Error fetching subjects:', error);
    }
  }, []);

  // Fetch students for selected subject
  const fetchStudents = useCallback(async (subjectId) => {
    if (!subjectId) {
      setStudents([]);
      return;
    }
    
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${API_BASE}/api/submissions/students?subject_id=${subjectId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      
      if (data.success) {
        setStudents(data.students || []);
        setSubmissionTypes(data.submission_types || []);
      } else {
        showMessage(data.error || 'Error fetching students');
        setStudents([]);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
      showMessage('Error fetching students');
      setStudents([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubjects();
  }, [fetchSubjects]);

  useEffect(() => {
    if (selectedSubjectId) {
      fetchStudents(selectedSubjectId);
    } else {
      setStudents([]);
    }
  }, [selectedSubjectId, fetchStudents]);

  // Filter students based on search
  const filteredStudents = students.filter(student => {
    const matchesSearch = (student.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (student.roll_no || '').toString().toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const toggleSubmissionStatus = async (studentId, submissionTypeName) => {
    const student = students.find(s => s.id === studentId);
    const currentStatus = student?.submissions?.[submissionTypeName] || 'pending';
    const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    
    // Optimistically update UI immediately
    setStudents(prevStudents => 
      prevStudents.map(s => 
        s.id === studentId 
          ? {
              ...s,
              submissions: {
                ...s.submissions,
                [submissionTypeName]: newStatus
              }
            }
          : s
      )
    );
    
    try {
      const token = localStorage.getItem('token');
      
      const payload = {
        student_id: studentId,
        subject_id: selectedSubjectId,
        submission_type: submissionTypeName,
        status: newStatus,
      };
      
      const response = await fetch(`${API_BASE}/api/submissions/mark-submission`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!data.success) {
        // Revert on error
        setStudents(prevStudents => 
          prevStudents.map(s => 
            s.id === studentId 
              ? {
                  ...s,
                  submissions: {
                    ...s.submissions,
                    [submissionTypeName]: currentStatus
                  }
                }
              : s
          )
        );
        throw new Error(data.error || 'Failed to update submission');
      }
    } catch (error) {
      console.error('Error marking submission:', error);
      showMessage(error.message || 'Failed to update submission');
    }
  };

  // Get applicable submission types for a student
  // Backend already filters by subject type (practical = TA only, theory/MDM/OE/PE = TA, CIE, Defaulter work)
  const getApplicableTypes = (student) => {
    return submissionTypes.filter(type => {
      // Defaulter work is only for defaulters
      if (type.name === 'Defaulter work') {
        return student.defaulter;
      }
      // Show all other types that backend sent (already filtered by subject type)
      return true;
    });
  };

  const allSubjects = [
    ...subjects.theory.map(s => ({ 
      ...s, 
      displayName: `${s.name} ${s.className ? `- ${s.className}` : ''} (Theory)` 
    })),
    ...subjects.practical.flatMap(s => {
      // If practical subject has batches, create separate entries for each batch
      if (s.batches && s.batches.length > 0) {
        return s.batches.map(batch => ({
          ...s,
          batch_id: batch.batch_id,
          batch_name: batch.batch_name,
          displayName: `${s.name} ${s.className ? `- ${s.className}` : ''} - ${batch.batch_name} (Practical)`
        }));
      }
      // If no batches, show without batch info
      return [{
        ...s,
        displayName: `${s.name} ${s.className ? `- ${s.className}` : ''} (Practical)`
      }];
    })
  ];

  const StudentRow = ({ student, index }) => {
    const applicableTypes = getApplicableTypes(student);
    
    return (
      <tr className="student-row">
        <td className="student-index">{index + 1}</td>
        <td className="student-roll">{student.roll_no}</td>
        <td className="student-name-cell">{student.name}</td>
        <td className="student-attendance">{student.attendance_percent}%</td>
        {applicableTypes.map(type => {
          const status = student.submissions?.[type.name] || 'pending';
          
          return (
            <td key={type.id} className="submission-cell">
              <button
                className={`status-toggle-btn ${status}`}
                onClick={() => toggleSubmissionStatus(student.id, type.name)}
                title={`Click to mark as ${status === 'completed' ? 'pending' : 'completed'}`}
              >
                {status === 'completed' ? '✓' : '○'}
              </button>
            </td>
          );
        })}
      </tr>
    );
  };

  return (
    <div className="your-submissions">
      <h2>Search Student</h2>
      
      <div className="search-section">
        <div className="search-controls">
          <div className="search-input-group">
            <input
              type="text"
              placeholder="Enter Student Name (Atleast 3 Characters)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          
          <select 
            className="subject-filter"
            value={selectedSubjectId}
            onChange={(e) => {
              setSelectedSubjectId(e.target.value);
              setSearchTerm('');
            }}
          >
            <option value="">Select Subject</option>
            {allSubjects.map(subject => (
              <option key={subject.id} value={subject.id}>
                {subject.displayName} - {subject.code}
              </option>
            ))}
          </select>
        </div>
      </div>
      
      {isLoading ? (
        <div className="loading-state">Loading students...</div>
      ) : filteredStudents.length > 0 ? (
        <div className="submissions-table-wrapper">
          <table className="submissions-table">
            <thead>
              <tr>
                <th className="col-index">#</th>
                <th className="col-roll">Roll No</th>
                <th className="col-name">Student Name</th>
                <th className="col-attendance">Attendance</th>
                {getApplicableTypes(filteredStudents[0] || {}).map(type => (
                  <th key={type.id} className="col-submission">
                    {type.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((student, index) => (
                <StudentRow 
                  key={`${student.id}-${index}-${student.batch_id || 'no-batch'}`}
                  student={student}
                  index={index}
                />
              ))}
            </tbody>
          </table>
          <div className="table-footer">
            <span className="student-count">Total: {filteredStudents.length} students</span>
            <span className="legend">
              <span className="legend-item"><span className="legend-icon completed">✓</span> Completed</span>
              <span className="legend-item"><span className="legend-icon pending">○</span> Pending</span>
            </span>
          </div>
        </div>
      ) : (
        <div className="no-students">
          <p>{selectedSubjectId ? 'No students found matching your search criteria.' : 'Please select a subject to view students.'}</p>
        </div>
      )}
      
      {showSnackbar && (
        <div className="snackbar success">
          {snackbarMessage}
        </div>
      )}
    </div>
  );
};

export default YourSubmissions;
