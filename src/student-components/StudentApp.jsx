import React, { useState, createContext, useContext, useEffect, useCallback } from 'react';
import StudentSidebar from './StudentSidebar';
import StudentHeader from './StudentHeader';
import StudentDashboard from './StudentDashboard';
import SubmissionStatus from './SubmissionStatus';
import Subjects from './Subjects';
import DefaulterWork from './DefaulterWork';
import StudentProfile from './StudentProfile';
import './StudentApp.css';

const API_BASE = 'https://rivooooox-backnd.vercel.app';

// Student Context
const StudentContext = createContext();

export const useStudentContext = () => {
    const context = useContext(StudentContext);
    if (!context) {
        throw new Error('useStudentContext must be used within StudentProvider');
    }
    return context;
};

function StudentApp({ user, onLogout }) {
    const [currentView, setCurrentView] = useState('dashboard');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Real data states
    const [studentData, setStudentData] = useState(null);
    const [subjects, setSubjects] = useState([]);
    const [defaulterWorks, setDefaulterWorks] = useState([]);

    // Fetch student dashboard data
    const fetchDashboardData = useCallback(async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            
            const response = await fetch(`${API_BASE}/api/students/dashboard`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            const data = await response.json();
            
            if (data.success) {
                setStudentData(data.student);
                setSubjects(data.subjects);
            } else {
                setError(data.error || 'Failed to load dashboard data');
            }
        } catch (err) {
            console.error('Error fetching dashboard data:', err);
            setError('Failed to load dashboard data');
        } finally {
            setLoading(false);
        }
    }, []);

    // Fetch defaulter work
    const fetchDefaulterWork = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            
            const response = await fetch(`${API_BASE}/api/students/defaulter-work`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            const data = await response.json();
            
            if (data.success) {
                setDefaulterWorks(data.defaulterWork);
            }
        } catch (err) {
            console.error('Error fetching defaulter work:', err);
        }
    }, []);

    // Load data on mount
    useEffect(() => {
        fetchDashboardData();
        fetchDefaulterWork();
    }, [fetchDashboardData, fetchDefaulterWork]);

    const contextValue = {
        currentView,
        setCurrentView,
        studentData,
        subjects,
        defaulterWorks,
        user,
        onLogout,
        loading,
        error,
        fetchDashboardData,
        fetchDefaulterWork
    };

    if (loading) {
        return (
            <div className="student-app">
                <div style={{ 
                    display: 'flex', 
                    justifyContent: 'center', 
                    alignItems: 'center', 
                    height: '100vh',
                    fontSize: '18px',
                    color: '#5f6368'
                }}>
                    Loading student data...
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="student-app">
                <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column',
                    justifyContent: 'center', 
                    alignItems: 'center', 
                    height: '100vh',
                    gap: '20px',
                    padding: '20px'
                }}>
                    <div style={{
                        fontSize: '48px',
                        color: '#ea4335'
                    }}>⚠️</div>
                    <h2 style={{ 
                        margin: 0,
                        color: '#3c4043',
                        fontSize: '24px'
                    }}>Unable to Load Dashboard</h2>
                    <p style={{
                        margin: 0,
                        color: '#5f6368',
                        fontSize: '16px',
                        textAlign: 'center',
                        maxWidth: '500px'
                    }}>{error}</p>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button 
                            onClick={fetchDashboardData}
                            style={{
                                padding: '10px 20px',
                                background: '#4285f4',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '14px',
                                fontWeight: '500'
                            }}
                        >
                            Retry
                        </button>
                        <button 
                            onClick={onLogout}
                            style={{
                                padding: '10px 20px',
                                background: '#ea4335',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '14px',
                                fontWeight: '500'
                            }}
                        >
                            Logout
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <StudentContext.Provider value={contextValue}>
            <div className="student-app">
                <StudentSidebar currentView={currentView} setCurrentView={setCurrentView} />
                <div className="student-main-content">
                    <StudentHeader />
                    <div className="student-content">
                        {currentView === 'dashboard' && <StudentDashboard />}
                        {currentView === 'submission-status' && <SubmissionStatus />}
                        {currentView === 'subjects' && <Subjects />}
                        {currentView === 'defaulter-work' && <DefaulterWork />}
                        {currentView === 'profile' && <StudentProfile />}
                    </div>
                </div>
            </div>
        </StudentContext.Provider>
    );
}

export default StudentApp;