import React, { useState } from 'react';
import RivooxIntro from './components/RivooxIntro';
import AuthWrapper from './components/AuthWrapper';
import './App.css';

function App() {
  const [showIntro, setShowIntro] = useState(() => {
    // Check if user is logged in or if intro was already shown
    const hasSeenIntro = localStorage.getItem('hasSeenIntro');
    const isLoggedIn = localStorage.getItem('user');
    return !hasSeenIntro && !isLoggedIn;
  });

  const handleIntroComplete = () => {
    localStorage.setItem('hasSeenIntro', 'true');
    setShowIntro(false);
  };

  if (showIntro) {
    return <RivooxIntro onComplete={handleIntroComplete} />;
  }

  return (
    <div className="app">
      <AuthWrapper />
    </div>
  );
}

export default App;