import React from 'react';
import { Sparkles } from './Icons';

const Header: React.FC = () => {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-2 rounded-lg">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400">
            LuminaGen
          </h1>
        </div>
        
        <nav className="hidden md:flex items-center gap-6">
          <a href="#" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">History</a>
          <a href="#" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">Community</a>
          <div className="h-4 w-px bg-zinc-800"></div>
          <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-400 hover:text-indigo-300">
            Pricing & Billing
          </a>
        </nav>
      </div>
    </header>
  );
};

export default Header;