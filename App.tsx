import React, { useContext } from 'react';
import Header from './components/Header';
import HomePage from './components/HomePage';
import PracticePage from './components/PracticePage';
import { AppContext, AppProvider } from './context/AppContext';
import DashboardPage from './components/DashboardPage';
import HistoryPage from './components/HistoryPage';
import { ProfilePage } from './components/ProfilePage';
import { Page } from './types';
import { Alert } from './components/ui/Alert';
import { PracticeSetupModal } from './components/PracticeSetupModal';
import { AuthProvider } from './context/AuthContext';


const AppContent: React.FC = () => {
  const context = useContext(AppContext);

  if (!context) {
    throw new Error("AppContext not found. Make sure AppContent is a child of AppProvider.");
  }
  const { page, navigateTo, sessionResetKey, isSetupModalOpen, closeSetupModal, handleStartFromSetup } = context;

  const renderPage = () => {
    switch (page) {
      case 'practice':
        return <PracticePage key={sessionResetKey} />;
      case 'dashboard':
        return <DashboardPage />;
      case 'history':
        return <HistoryPage />;
      case 'profile':
        return <ProfilePage />;
      case 'home':
      default:
        return <HomePage onStartPractice={() => navigateTo('practice')} />;
    }
  };

  return (
    <div className="h-screen bg-slate-50 dark:bg-slate-900 text-gray-900 dark:text-gray-100 font-sans transition-colors duration-300 flex flex-col">
      <Alert />
      <Header />
      <main className="container mx-auto px-4 py-4 flex-grow flex flex-col min-h-0">
        {renderPage()}
      </main>
      <PracticeSetupModal
        isOpen={isSetupModalOpen}
        onClose={closeSetupModal}
        onStart={handleStartFromSetup}
      />

    </div>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </AuthProvider>
  );
};

export default App;