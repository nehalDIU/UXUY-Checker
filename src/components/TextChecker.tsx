import React from 'react';
import { useTextChecker } from '../context/TextCheckerContext';
import { FileText, Users2, CheckCircle } from 'lucide-react';
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

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8">
        <div>
          <div className="rounded-2xl bg-white/[0.02] backdrop-blur-xl p-4 sm:p-6 ring-1 ring-white/10 shadow-2xl transition duration-300 hover:bg-white/[0.04]">
            <h2 className="text-lg sm:text-xl font-medium mb-3 sm:mb-4 text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-400" />
              Invite Details
            </h2>
            <textarea
              value={inviteText}
              onChange={(e) => setInviteText(e.target.value)}
              className="w-full min-h-[160px] sm:min-h-[200px] p-3 sm:p-4 rounded-xl bg-slate-900/50 ring-1 ring-white/10 text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500/50 transition duration-200 resize-none text-sm sm:text-base"
              placeholder="Enter invite details (e.g. 0x733******6A8f 10 UXUY)"
            />
            <p className="mt-2 sm:mt-3 text-xs sm:text-sm text-gray-500">
              Format: ETH address followed by UXUY amount
            </p>
          </div>
        </div>
        
        <div>
          <div className="rounded-2xl bg-white/[0.02] backdrop-blur-xl p-4 sm:p-6 ring-1 ring-white/10 shadow-2xl transition duration-300 hover:bg-white/[0.04]">
            <h2 className="text-lg sm:text-xl font-medium mb-3 sm:mb-4 text-white flex items-center gap-2">
              <Users2 className="w-5 h-5 text-indigo-400" />
              Referrer Addresses
            </h2>
            <textarea
              value={referrerText}
              onChange={(e) => setReferrerText(e.target.value)}
              className="w-full min-h-[160px] sm:min-h-[200px] p-3 sm:p-4 rounded-xl bg-slate-900/50 ring-1 ring-white/10 text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500/50 transition duration-200 resize-none text-sm sm:text-base"
              placeholder="Enter referrer addresses (e.g. 0x733******6A8f)"
            />
            <p className="mt-2 sm:mt-3 text-xs sm:text-sm text-gray-500">
              One ETH address per line
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-center pt-2 sm:pt-4">
        <button
          onClick={checkText}
          disabled={!inviteText.trim() || !referrerText.trim()}
          className="group relative inline-flex items-center justify-center px-6 sm:px-8 py-2.5 sm:py-3 text-base sm:text-lg font-medium text-white bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 rounded-xl shadow-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 w-full sm:w-auto"
        >
          <CheckCircle className="mr-2 h-5 w-5 transition-transform group-hover:scale-110" />
          Analyze Results
        </button>
      </div>

      {isChecked && analysisResults && (
        <CheckResults />
      )}
    </div>
  );
}

export default TextChecker;