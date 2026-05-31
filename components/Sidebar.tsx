import React, { useState } from 'react';
import { GenerationMode } from '../types';
import { 
  ImageIcon, Layout, BookOpen, MessageSquare, Hexagon,
  Sparkles, Settings, ChevronRight
} from './Icons';

interface SidebarProps {
  currentMode: GenerationMode;
  setMode: (mode: GenerationMode) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  userEmail?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  currentMode, 
  setMode, 
  searchTerm, 
  setSearchTerm,
  userEmail = 'ezekieloputa5@gmail.com'
}) => {
  const [activeItem, setActiveItem] = useState<string>('reports');
  const userInitials = userEmail.substring(0, 2).toUpperCase();

  const studioModes = [
    { id: GenerationMode.IMAGE, name: 'Image Studio', icon: ImageIcon, desc: 'Generate photo-realistic artwork' },
    { id: GenerationMode.THUMBNAIL, name: 'Thumbnail Pro', icon: Layout, desc: 'Sleek YouTube & TikTok banners' },
    { id: GenerationMode.STORY, name: 'Story Studio', icon: BookOpen, desc: 'Complete scene sequencing' },
    { id: GenerationMode.CAPTIONS, name: 'Caption Master', icon: MessageSquare, desc: 'AI short-form caption templates' },
    { id: GenerationMode.LOGO, name: 'Logo Designer', icon: Hexagon, desc: 'Minimalist brand geometry' },
  ];

  return (
    <aside className="w-72 flex-shrink-0 h-[calc(100vh-64px)] bg-[#090b0e] border-r border-[#161920] flex flex-col justify-between p-5 select-none z-30">
      {/* Upper Navigation section */}
      <div className="space-y-6 flex-1 flex flex-col min-h-0">
        
        {/* Sleek Search Input */}
        <div className="relative">
          <input 
            type="text" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search assets..." 
            className="w-full bg-[#11141c] border border-[#1b202d] rounded-xl py-2.5 pl-10 pr-4 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500/80 transition-colors font-medium focus:ring-1 focus:ring-indigo-500/20"
          />
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="absolute left-3.5 top-3 w-4 h-4 text-zinc-500 transition-colors" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor" 
            strokeWidth="2.5"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')} 
              className="absolute right-3 top-3 text-zinc-500 hover:text-white text-2xs font-bold uppercase"
            >
              Clear
            </button>
          )}
        </div>

        {/* Navigation Categories */}
        <div className="space-y-5 flex-1 overflow-y-auto no-scrollbar pr-0.5">
          {/* Studio section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-3">
              <span className="text-[10px] font-black tracking-[0.13em] text-[#4b556b] uppercase">ALL STUDIO MODES</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
            </div>
            
            <div className="space-y-1">
              {studioModes.map((item) => {
                const IconComponent = item.icon;
                const isActive = currentMode === item.id;
                
                return (
                  <button
                    key={item.id}
                    onClick={() => setMode(item.id)}
                    className={`w-full group px-3.5 py-3 rounded-xl flex items-center justify-between text-left transition-all duration-300 relative ${
                      isActive 
                        ? 'bg-gradient-to-r from-indigo-600/15 to-purple-600/5 border border-indigo-500/30 text-white shadow-xl' 
                        : 'bg-transparent border border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-[#11141c]/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <IconComponent className={`w-4 h-4 transition-transform duration-300 group-hover:scale-110 ${
                        isActive ? 'text-indigo-400' : 'text-[#4b556b] group-hover:text-zinc-300'
                      }`} />
                      <div className="flex flex-col">
                        <span className={`text-xs font-black uppercase tracking-wide transition-colors ${
                          isActive ? 'text-white' : 'text-zinc-400 group-hover:text-zinc-200'
                        }`}>{item.name}</span>
                        <span className="text-[9px] text-zinc-500 leading-none mt-0.5 font-medium line-clamp-1">{item.desc}</span>
                      </div>
                    </div>
                    {isActive && (
                      <div className="absolute left-0 w-1 top-3 bottom-3 bg-indigo-500 rounded-full"></div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Explorer section */}
          <div className="space-y-2">
            <div className="px-3">
              <span className="text-[10px] font-black tracking-[0.13em] text-[#4b556b] uppercase">PLATFORM UTILITIES</span>
            </div>
            
            <div className="space-y-1">
              <a 
                href="#gallery"
                onClick={() => setMode(GenerationMode.IMAGE)}
                className="w-full px-3.5 py-2.5 rounded-xl flex items-center justify-between text-left transition-all bg-transparent text-zinc-400 hover:text-zinc-200 hover:bg-[#11141c]/50 border border-transparent"
              >
                <div className="flex items-center gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                  <span className="text-xs font-black uppercase tracking-wide">Gallery Archives</span>
                </div>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">Live</span>
              </a>
              
              <a 
                href="https://ai.google.dev/gemini-api/docs/billing" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-full px-3.5 py-2.5 rounded-xl flex items-center justify-between text-left transition-all bg-transparent text-zinc-400 hover:text-zinc-200 hover:bg-[#11141c]/50 border border-transparent"
              >
                <div className="flex items-center gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                  <span className="text-xs font-black uppercase tracking-wide">Pricing Docs</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />
              </a>
            </div>
          </div>
        </div>

      </div>

      {/* Footer / Account section precisely mirroring reference layout */}
      <div className="space-y-4 pt-4 border-t border-[#161920]">
        
        {/* CTA Upgrade Banner like Get Template button */}
        <a 
          href="https://ai.google.dev/gemini-api" 
          target="_blank" 
          rel="noopener noreferrer"
          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-black text-[10px] uppercase tracking-widest text-center flex items-center justify-center gap-2 transition-all shadow-[0_4px_20px_rgba(99,102,241,0.2)] hover:shadow-[0_4px_25px_rgba(99,102,241,0.35)] transform active:scale-[0.98]"
        >
          <span>Get Creator Pro</span>
          <ChevronRight className="w-3.5 h-3.5 stroke-[3px]" />
        </a>

        {/* User profile details matching style */}
        <div className="flex items-center justify-between p-1.5 rounded-xl hover:bg-[#11141c]/40 transition-colors cursor-pointer group">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 p-0.5 shadow-lg shadow-indigo-500/10">
              <div className="w-full h-full rounded-full bg-[#0a0c10] flex items-center justify-center text-xs font-black text-indigo-300">
                {userInitials}
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-black text-zinc-200 tracking-wide uppercase line-clamp-1 group-hover:text-white transition-colors">{userEmail.split('@')[0]}</span>
              <span className="text-[9px] text-[#4b556b] font-bold uppercase tracking-wider">CREATIVE DIRECTOR</span>
            </div>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-zinc-600 transition-colors group-hover:text-zinc-400 group-hover:translate-x-0.5 duration-200" />
        </div>

      </div>
    </aside>
  );
};

export default Sidebar;
