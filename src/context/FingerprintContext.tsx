import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { generateDeviceFingerprint } from '../utils/deviceFingerprint';

interface FingerprintContextType {
  deviceId: string | null;
  isLoading: boolean;
}

const FingerprintContext = createContext<FingerprintContextType | undefined>(undefined);

export const FingerprintProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeFingerprint = async () => {
      try {
        // Try to get from localStorage first for returning users
        const savedFingerprint = localStorage.getItem('device_id');
        
        if (savedFingerprint) {
          setDeviceId(savedFingerprint);
        } else {
          // Generate a new fingerprint
          const newFingerprint = await generateDeviceFingerprint();
          setDeviceId(newFingerprint);
          
          // Save to localStorage
          try {
            localStorage.setItem('device_id', newFingerprint);
          } catch (e) {
            console.warn('Could not save device ID to localStorage');
          }
        }
      } catch (error) {
        console.error('Error generating fingerprint:', error);
        // Generate a fallback random ID if fingerprinting fails
        const fallbackId = Math.random().toString(36).substring(2);
        setDeviceId(fallbackId);
      } finally {
        setIsLoading(false);
      }
    };

    initializeFingerprint();
  }, []);

  return (
    <FingerprintContext.Provider value={{ deviceId, isLoading }}>
      {children}
    </FingerprintContext.Provider>
  );
};

export const useFingerprint = (): FingerprintContextType => {
  const context = useContext(FingerprintContext);
  if (context === undefined) {
    throw new Error('useFingerprint must be used within a FingerprintProvider');
  }
  return context;
}; 