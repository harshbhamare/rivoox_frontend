import React, { useMemo, useEffect, useState } from 'react';
import { useAppContext } from './AuthWrapper';
import './Dashboard.css';

const Dashboard = () => {
  const { students, setStudents, filters, setFilters, batches, setBatches, user } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [batchNameById, setBatchNameById] = useState({});
  const [dashboardStats, setDashboardStats] = useState({
    overallSubmission: 0,
    submissionMarked: 0,
    defaulterWorkSubmitted: 0
  });
  const [isAvailable, setIsAvailable] = useState(false);
  const [updatingAvailability, setUpdatingAvailability] = useState(false);

  // --- Fetch students & batches on mount ---
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const [studentsRes, batchesRes, statsRes, availabilityRes] = await Promise.all([
          fetch('https://rivooooox-backnd.vercel.app/api/class-teacher/students', {
            headers: { Authorization: `Bearer ${token}` }
          }),
          fetch('https://rivooooox-backnd.vercel.app/api/class-teacher/batches', {
            headers: { Authorization: `Bearer ${token}` }
          }),
          fetch('https://rivooooox-backnd.vercel.app/api/submissions/dashboard-statistics', {
            headers: { Authorization: `Bearer ${token}` }
          }),
          fetch('https://rivooooox-backnd.vercel.app/api/class-teacher/availability', {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);

        const studentsJson = await studentsRes.json();
        const batchesJson = await batchesRes.json();
        const statsJson = await statsRes.json();
        const availabilityJson = await availabilityRes.json();

        if (!studentsRes.ok) {
          const errorMsg = studentsJson.error || studentsJson.message || 'Failed to load students';
          console.error('Students API Error:', errorMsg);
          throw new Error(errorMsg);
        }
        if (!batchesRes.ok) {
          const errorMsg = batchesJson.error || batchesJson.message || 'Failed to load batches';
          console.error('Batches API Error:', errorMsg);
          throw new Error(errorMsg);
        }

        const mappedStudents = (studentsJson.students || []).map(s => ({
          id: s.id,
          name: s.name,
          rollNumber: s.roll_no,
          hallTicket: s.hall_ticket_number,
          email: s.email,
          contact: s.mobile,
          batch_id: s.batch_id,
          batch_name: s.batch_name,
          defaulter: s.defaulter,
          submission_percentage: s.submission_percentage || 0,
          attendance_percent: s.attendance_percent,
          class_id: s.class_id,
          created_at: s.created_at
        }));

        setStudents(mappedStudents);

        setBatches(batchesJson.batches || []);

        // Set dashboard statistics from API
        if (statsJson.success && statsJson.statistics) {
          setDashboardStats({
            overallSubmission: statsJson.statistics.overallSubmission,
            submissionMarked: statsJson.statistics.submissionMarked,
            defaulterWorkSubmitted: statsJson.statistics.defaulterWorkSubmitted
          });
          
        }

        // Set availability status
        if (availabilityJson.success) {
          setIsAvailable(availabilityJson.isAvailable);
          
        } else {
          console.warn('Could not fetch availability status:', availabilityJson.error);
          setIsAvailable(false);
        }

      } catch (e) {
        console.error(e);
        setError(e.message || 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [setStudents, setBatches]);

  // Toggle availability status
  const toggleAvailability = async () => {
    try {
      setUpdatingAvailability(true);
      const token = localStorage.getItem('token');
      const newStatus = !isAvailable;

      const response = await fetch('https://rivooooox-backnd.vercel.app/api/class-teacher/availability', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ isAvailable: newStatus })
      });

      const data = await response.json();

      if (data.success) {
        setIsAvailable(data.isAvailable);
      } else {
        console.error('Failed to update availability:', data.error);
        alert('Could not update availability status. The database may need to be updated with the is_available_for_submission column.');
      }
    } catch (error) {
      console.error('Error updating availability:', error);
      alert('Error updating availability status');
    } finally {
      setUpdatingAvailability(false);
    }
  };

  // Map batch_id -> name
  useEffect(() => {
    const map = {};
    (batches || []).forEach(b => { map[b.id] = b.name; });
    setBatchNameById(map);
  }, [batches]);

  // --- Analysis cards (using real data from API) ---
  const analysisData = useMemo(() => {
    // Calculate overall class analysis as average of all student submission percentages
    let overallClassPercentage = 0;
    if (students && students.length > 0) {
      const totalPercentage = students.reduce((sum, student) => {
        return sum + (student.submission_percentage || 0);
      }, 0);
      overallClassPercentage = Math.round(totalPercentage / students.length);
    }

    return [
      {
        title: 'Overall Class Analysis',
        percentage: overallClassPercentage,
        subtitle: 'Submission'
      },
      {
        title: 'Self Taught Subject Analysis',
        percentage: dashboardStats.submissionMarked,
        subtitle: 'Submission Marked'
      },
      {
        title: 'Defaulters Analysis',
        percentage: dashboardStats.defaulterWorkSubmitted,
        subtitle: 'Defaulter Work Submitted'
      }
    ];
  }, [dashboardStats, students]);

  // --- Filters ---
  const filteredStudents = useMemo(() => {
    if (!Array.isArray(students)) return [];

    return students.filter(student => {
      if (!student) return false;

      // Category filter based on submission percentage
      let categoryMatch = true;
      if (filters.category === 'Regular') {
        // Regular: students who haven't completed all submissions (< 100%)
        categoryMatch = student.submission_percentage < 100;
      } else if (filters.category === 'Defaulter') {
        // Defaulter: students marked as defaulters
        categoryMatch = student.defaulter === true;
      } else if (filters.category === 'Completed') {
        // Completed: students who completed all submissions (100%)
        categoryMatch = student.submission_percentage === 100;
      }

      // Batch filter
      let batchMatch = true;
      if (filters.batch && filters.batch !== 'All') {
        batchMatch = student.batch_name === filters.batch;
      }

      return categoryMatch && batchMatch;
    });
  }, [students, filters]);

  const calculateSubmissionPercentage = (student) => {
    // Use the submission_percentage calculated by the backend
    return student.submission_percentage || 0;
  };

  const ProgressCircle = ({ percentage, title, subtitle }) => {
    const radius = 35;
    const circumference = 2 * Math.PI * radius;
    const strokeDasharray = circumference;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
      <div className="analysis-card">
        <div className="progress-circle">
          <svg width="80" height="80">
            <circle cx="40" cy="40" r={radius} className="progress-circle-bg" />
            <circle
              cx="40"
              cy="40"
              r={radius}
              className="progress-circle-fill"
              style={{ strokeDasharray, strokeDashoffset }}
            />
          </svg>
          <div className="progress-text">{percentage}%</div>
        </div>
        <div className="analysis-info">
          <div className="analysis-subtitle">{subtitle}</div>
          <div className="analysis-title">{title}</div>
        </div>
      </div>
    );
  };

  if (error) {
    return (
      <div className="dashboard">
        <div className="error-container" style={{
          padding: '40px',
          textAlign: 'center',
          backgroundColor: '#fff',
          borderRadius: '12px',
          margin: '20px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ color: '#dc3545', marginBottom: '20px' }}>⚠️ Access Error</h2>
          <p style={{ fontSize: '16px', color: '#666', marginBottom: '20px' }}>{error}</p>
          <p style={{ fontSize: '14px', color: '#999' }}>
            Please contact your administrator to resolve this issue.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="analysis-section">
        <div className="analysis-grid">
          {analysisData.map((item, index) => (
            <ProgressCircle
              key={index}
              percentage={item.percentage}
              title={item.title}
              subtitle={item.subtitle}
            />
          ))}
        </div>
      </div>

      <div className="filters-section">
        <div className="filter-group">
          <h3>Category Wise Filter</h3>
          <div className="filter-buttons">
            {['Regular', 'Defaulter', 'Completed'].map(category => (
              <button
                key={category}
                className={`filter-btn ${filters.category === category ? 'active' : ''}`}
                onClick={() => setFilters(prev => ({ ...prev, category }))}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        <div className="filter-group">
          <h3>Batch Wise Filter</h3>
          <div className="filter-buttons">
            <button
              className={`filter-btn ${filters.batch === 'All' ? 'active' : ''}`}
              onClick={() => setFilters(prev => ({ ...prev, batch: 'All' }))}
            >
              All
            </button>
            {(batches || []).map(batch => (
              <button
                key={batch.id}
                className={`filter-btn ${filters.batch === batch.name ? 'active' : ''}`}
                onClick={() => setFilters(prev => ({ ...prev, batch: batch.name }))}
              >
                {batch.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="student-table-section">
        <table className="student-table">
          <thead>
            <tr>
              <th>Roll Number</th>
              <th>Name of Student</th>
              <th>Batch</th>
              <th>Percentage Submission Completed</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="4" style={{ textAlign: 'center', padding: 20 }}>Loading…</td></tr>
            ) : filteredStudents.length > 0 ? (
              filteredStudents.map((student) => (
                <tr key={student.id}>
                  <td>{student.rollNumber}</td>
                  <td>{student.name}</td>
                  <td>{batchNameById[student.batch_id] || '-'}</td>
                  <td>{calculateSubmissionPercentage(student)}%</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" style={{ textAlign: 'center', padding: '20px', color: '#5f6368' }}>
                  No students found for the selected filters
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Dashboard;
