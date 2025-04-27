import React, { useEffect, useRef } from 'react';
import { useTextChecker } from '../context/TextCheckerContext';

const TextInput: React.FC = () => {
  const { text, setText, charCount, setCharCount, isChecked, setIsChecked } = useTextChecker();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [text]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setText(newText);
    setCharCount(newText.length);
    
    if (isChecked) {
      setIsChecked(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <label htmlFor="text-input" className="block text-sm font-medium text-gray-200">
          Enter your UX text below
        </label>
        <div className="text-sm">
          <span className={`${charCount > 300 ? 'text-red-400 font-medium' : 'text-gray-300'}`}>
            {charCount}
          </span>
          <span className="text-gray-400"> / 300</span>
        </div>
      </div>
      
      <div className="relative">
        <textarea
          ref={textareaRef}
          id="text-input"
          value={text}
          onChange={handleTextChange}
          placeholder="Type or paste your text here..."
          className="w-full min-h-[160px] p-4 rounded-lg bg-white/5 border border-purple-500/30 text-white placeholder-gray-400 focus:ring-2 focus:ring-pink-500 focus:border-pink-500 resize-none transition"
          rows={6}
        />
      </div>
    </div>
  );
};

export default TextInput;