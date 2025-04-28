import React from 'react';
import { useTextChecker } from '../context/TextCheckerContext';
import { Sparkles, CheckCircle, AlertCircle } from 'lucide-react';
import CheckResults from './CheckResults';

const TextChecker: React.FC = () => {
  const { 
    inviteText, 
    setInviteText, 
    referrerText, 
    setReferrerText, 
    checkText, 
    isChecked,
    analysisResults 
  } = useTextChecker();

  const hasContent = inviteText.trim() && referrerText.trim();

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-3 sm:p-4">
          <h2 className="text-lg font-semibold mb-3 text-white flex items-center">
            <Sparkles className="w-4 h-4 mr-2 text-indigo-400" />
            Invite Details
          </h2>
          <div className="space-y-2">
            <textarea
              value={inviteText}
              onChange={(e) => setInviteText(e.target.value)}
              className="input-area min-h-[160px]"
              placeholder="Enter invite details (e.g. 0x733******6A8f 10 UXUY)"
            />
            <div className="flex items-start gap-1.5 text-xs text-gray-400">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              <p>ETH address + UXUY amount per line</p>
            </div>
          </div>
        </div>
        
        <div className="card p-3 sm:p-4">
          <h2 className="text-lg font-semibold mb-3 text-white flex items-center">
            <Sparkles className="w-4 h-4 mr-2 text-cyan-400" />
            Referrer Addresses
          </h2>
          <div className="space-y-2">
            <textarea
              value={referrerText}
              onChange={(e) => setReferrerText(e.target.value)}
              className="input-area min-h-[160px]"
              placeholder="Enter referrer addresses (e.g. 0x733******6A8f)"
            />
            <div className="flex items-start gap-1.5 text-xs text-gray-400">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              <p>One ETH address per line</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-center">
        <button
          onClick={checkText}
          disabled={!hasContent}
          className="btn-primary text-sm px-4 py-2 sm:px-6 sm:py-3"
        >
          <CheckCircle className="mr-2 h-4 w-4" />
          Analyze Results
        </button>
      </div>

      {isChecked && analysisResults && <CheckResults />}
    </div>
  );
};

export default TextChecker;