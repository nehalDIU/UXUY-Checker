import React, { useEffect } from 'react';
import TextChecker from './components/TextChecker';
import DataTableDemo from './components/DataTableDemo';
import DataAnalysisReport from './components/DataAnalysisReport';
import { TextCheckerProvider } from './context/TextCheckerContext';
import { useFingerprint } from './context/FingerprintContext';
import { ThemeProvider } from './context/ThemeContext';

function App() {
  const { deviceId } = useFingerprint();
  
  // Log the device ID for debugging (optional)
  useEffect(() => {
    if (deviceId) {
      console.log('Device identification loaded successfully');
    }
  }, [deviceId]);

  return (
    <ThemeProvider>
      <div className="min-h-screen bg-[#0F172A] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.3),rgba(255,255,255,0))]">
        <TextCheckerProvider>
          <div className="max-w-7xl mx-auto px-3 py-4 sm:px-6 lg:px-8 sm:py-8">
            <div className="text-center mb-6">
              <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold tracking-tight gradient-text">
                UXUY Text Checker
              </h1>
              <p className="text-sm sm:text-base text-gray-400 mt-2">
                Analyze and verify UXUY referrals
              </p>
            </div>
            <TextChecker />
            
            <div className="mt-10">
              <DataAnalysisReport />
            </div>
            
            <div className="mt-10">
              <DataTableDemo />
            </div>
          </div>
        </TextCheckerProvider>
      </div>
    </ThemeProvider>
  );
}

export default App;