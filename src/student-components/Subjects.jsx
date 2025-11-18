import React, { useState, useEffect } from 'react';
import { Book, BookOpen, GraduationCap, Award, Eye, Star, AlertTriangle } from 'lucide-react';
import { useStudentContext } from './StudentApp';
import './Subjects.css';

const API_BASE = 'https://rivooooox-backnd.vercel.app';

const Subjects = () => {
    const [allSubjects, setAllSubjects] = useState({
        theory: [],
        practical: [],
        mdm: [],
        oe: [],
        pe: []
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Fetch subjects from API
    useEffect(() => {
        const fetchSubjects = async () => {
            try {
                setLoading(true);
                const token = localStorage.getItem('token');
                
                const response = await fetch(`${API_BASE}/api/students/subjects`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                
                const data = await response.json();
                console.log('Student subjects data:', data);
                
                if (data.success) {
                    setAllSubjects(data.subjects);
                } else {
                    setError(data.error || 'Failed to load subjects');
                }
            } catch (err) {
                console.error('Error fetching subjects:', err);
                setError('Failed to load subjects');
            } finally {
                setLoading(false);
            }
        };

        fetchSubjects();
    }, []);

    if (loading) {
        return (
            <div className="subjects-container">
                <div className="loading-state">
                    <p>Loading subjects...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="subjects-container">
                <div className="error-state">
                    <AlertTriangle size={48} />
                    <p>Error: {error}</p>
                    <button onClick={() => window.location.reload()}>Retry</button>
                </div>
            </div>
        );
    }

    const SubjectCard = ({ subject, type, icon: Icon }) => (
        <div className={`subject-card ${type}`}>
            <div className="subject-card-top">
                <div className="subject-icon">
                    <Icon size={22} />
                </div>
                <div className="subject-type-badge">
                    {type.toUpperCase()}
                </div>
            </div>

            <div className="subject-info">
                <div className="subject-code">{subject.code}</div>
                <div className="subject-name">{subject.name}</div>
                <div className="subject-faculty">
                    <span className="faculty-label">Faculty:</span> {subject.faculty}
                </div>
                {subject.description && (
                    <div className="subject-description">{subject.description}</div>
                )}
            </div>

            <div className="subject-footer">
                <div className="view-only-badge">
                    <Eye size={14} />
                    <span>View Only</span>
                </div>
            </div>
        </div>
    );

    const SubjectSection = ({ title, subjects, type, icon }) => (
        <div className="subject-section">
            <div className="section-header">
                <h3>{title}</h3>
                <span className="subject-count">{subjects.length} subjects</span>
            </div>
            <div className="subjects-grid">
                {subjects.length > 0 ? (
                    subjects.map((subject, index) => (
                        <SubjectCard
                            key={subject.id || index}
                            subject={subject}
                            type={type}
                            icon={icon}
                        />
                    ))
                ) : (
                    <div className="no-subjects">
                        <p>No {title.toLowerCase()} assigned</p>
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <div className="subjects-container">
            <div className="subjects-header">
                <h2>My Subjects</h2>
                <p>View all your allotted subjects for the current semester</p>
            </div>

            <div className="subjects-content">
                <SubjectSection
                    title="Theory Subjects"
                    subjects={allSubjects.theory}
                    type="theory"
                    icon={Book}
                />

                <SubjectSection
                    title="Practical Subjects"
                    subjects={allSubjects.practical}
                    type="practical"
                    icon={BookOpen}
                />

                {/* Only show elective sections if they have subjects */}
                {(allSubjects.mdm && allSubjects.mdm.length > 0) && (
                    <SubjectSection
                        title="Multidisciplinary Minor (MDM)"
                        subjects={allSubjects.mdm}
                        type="mdm"
                        icon={GraduationCap}
                    />
                )}

                {(allSubjects.oe && allSubjects.oe.length > 0) && (
                    <SubjectSection
                        title="Open Elective (OE)"
                        subjects={allSubjects.oe}
                        type="oe"
                        icon={Award}
                    />
                )}

                {(allSubjects.pe && allSubjects.pe.length > 0) && (
                    <SubjectSection
                        title="Professional Elective (PE)"
                        subjects={allSubjects.pe}
                        type="pe"
                        icon={Star}
                    />
                )}
            </div>


        </div>
    );
};

export default Subjects;