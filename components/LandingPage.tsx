
import React, { useEffect, useState, useRef } from 'react';
import { 
  Sparkles, Zap, ShieldCheck, ArrowRight, Play, Globe, Mic, 
  FileVideo, ImageIcon, BookOpen, Layers, Star, CheckCircle,
  Twitter, Instagram, Linkedin, Github, ChevronRight
} from './Icons';

interface LandingPageProps {
  onStart: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onStart }) => {
  const [scrolled, setScrolled] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#020203] text-zinc-100 selection:bg-indigo-500/30 selection:text-indigo-200 overflow-x-hidden font-sans">
      {/* Dynamic Background Pattern */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: `radial-gradient(#ffffff 1px, transparent 1px)`, backgroundSize: '40px 40px' }}></div>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[800px] opacity-20">
          <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-indigo-600/40 rounded-full blur-[160px] animate-pulse"></div>
          <div className="absolute top-[20%] right-[-10%] w-[500px] h-[500px] bg-purple-600/40 rounded-full blur-[140px] animate-pulse delay-1000"></div>
        </div>
      </div>

      {/* Navbar */}
      <nav className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-500 px-6 ${scrolled ? 'py-3' : 'py-8'}`}>
        <div className={`container mx-auto px-6 flex items-center justify-between transition-all duration-500 rounded-full border ${scrolled ? 'bg-black/60 backdrop-blur-2xl border-white/10 py-3 shadow-2xl' : 'bg-transparent border-transparent py-2'}`}>
          <div className="flex items-center gap-3 group cursor-pointer">
            <div className="bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 p-2 rounded-xl shadow-lg group-hover:rotate-12 transition-transform duration-500">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-500">LuminaGen</span>
          </div>
          
          <div className="hidden lg:flex items-center gap-10">
            {['Features', 'Workflow', 'Pricing', 'Community'].map((item) => (
              <a key={item} href={`#${item.toLowerCase()}`} className="text-[11px] font-black text-zinc-500 hover:text-white transition-all uppercase tracking-[0.2em]">{item}</a>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <button onClick={onStart} className="hidden sm:block text-[11px] font-black text-zinc-400 hover:text-white uppercase tracking-widest transition-colors">Sign In</button>
            <button 
              onClick={onStart}
              className="px-8 py-3 bg-white text-black text-[11px] font-black uppercase tracking-widest rounded-full hover:bg-indigo-50 transition-all transform active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.1)]"
            >
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section ref={heroRef} className="relative pt-52 pb-32 overflow-hidden z-10">
        <div className="container mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md text-indigo-400 text-[10px] font-black uppercase tracking-[0.3em] mb-10 animate-in fade-in slide-in-from-top-4 duration-1000">
            <Zap className="w-3.5 h-3.5 fill-current" /> v3.5 Master Engine is Live
          </div>
          
          <h1 className="text-6xl md:text-9xl font-black tracking-tighter text-white mb-10 max-w-6xl mx-auto leading-[0.85] animate-in fade-in slide-in-from-bottom-8 duration-1000">
            Generative Logic. <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 via-purple-400 to-pink-500">Creative Control.</span>
          </h1>
          
          <p className="text-zinc-400 text-lg md:text-2xl max-w-3xl mx-auto mb-14 font-medium leading-relaxed opacity-80 animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-200">
            Synchronize visual storytelling, cinematic motion, and neural cloning in a single, unified master interface.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 animate-in fade-in slide-in-from-bottom-16 duration-1000 delay-300">
            <button 
              onClick={onStart}
              className="w-full sm:w-auto px-12 py-6 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl shadow-2xl shadow-indigo-600/30 transition-all flex items-center justify-center gap-3 group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
              Initialize Studio <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
            <button className="w-full sm:w-auto px-12 py-6 bg-zinc-900 hover:bg-zinc-800 text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl border border-white/5 transition-all flex items-center justify-center gap-3">
              <Play className="w-4 h-4 fill-current" /> Watch Keynote
            </button>
          </div>

          {/* Social Proof Logotypes (Simulated) */}
          <div className="mt-24 pt-10 border-t border-white/5 opacity-30 flex flex-wrap justify-center items-center gap-12 grayscale animate-in fade-in duration-1000 delay-500">
             <span className="text-2xl font-black tracking-tighter">TECHRUM</span>
             <span className="text-2xl font-black tracking-tighter">DESIGN.CO</span>
             <span className="text-2xl font-black tracking-tighter">MOTION.PRO</span>
             <span className="text-2xl font-black tracking-tighter">VOX.AI</span>
             <span className="text-2xl font-black tracking-tighter">FUTURE.LAB</span>
          </div>

          {/* Large Mockup Reveal */}
          <div className="mt-32 relative max-w-7xl mx-auto group animate-in fade-in zoom-in-95 duration-1000 delay-700">
            <div className="absolute -inset-4 bg-gradient-to-r from-indigo-500/20 to-purple-600/20 rounded-[60px] blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>
            <div className="relative bg-zinc-900/80 backdrop-blur-xl rounded-[48px] p-3 border border-white/10 shadow-[0_40px_100px_rgba(0,0,0,0.8)] overflow-hidden">
                <div className="aspect-[21/9] bg-[#050505] rounded-[38px] overflow-hidden relative border border-white/5">
                    <img 
                      src="https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?auto=format&fit=crop&q=80&w=2000" 
                      className="w-full h-full object-cover opacity-40 group-hover:scale-105 transition-transform duration-[20s]"
                      alt="Interface Preview"
                    />
                    {/* Floating UI Elements Overlay */}
                    <div className="absolute top-10 left-10 w-64 p-5 bg-black/60 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl animate-bounce-subtle">
                         <div className="flex items-center gap-3 mb-4">
                             <div className="w-8 h-8 bg-indigo-500 rounded-lg"></div>
                             <div className="flex-1 h-2 bg-zinc-800 rounded-full"></div>
                         </div>
                         <div className="space-y-2">
                             <div className="h-1.5 w-full bg-zinc-900 rounded-full"></div>
                             <div className="h-1.5 w-3/4 bg-zinc-900 rounded-full"></div>
                         </div>
                    </div>
                    <div className="absolute bottom-10 right-10 w-72 p-6 bg-indigo-600/20 backdrop-blur-2xl border border-indigo-500/30 rounded-[32px] shadow-2xl animate-float">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-[10px] font-black uppercase text-indigo-400">Rendering Sequence</span>
                            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-ping"></div>
                        </div>
                        <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden">
                            <div className="h-full w-2/3 bg-indigo-500 rounded-full"></div>
                        </div>
                    </div>
                    
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                        <div className="w-24 h-24 bg-white text-black rounded-full flex items-center justify-center shadow-2xl cursor-pointer hover:scale-110 transition-transform">
                            <Play className="w-10 h-10 fill-current ml-1" />
                        </div>
                    </div>
                </div>
            </div>
          </div>
        </div>
      </section>

      {/* Bento Grid Features */}
      <section id="features" className="py-40 relative z-10">
        <div className="container mx-auto px-6">
          <div className="text-center mb-24">
            <h2 className="text-indigo-500 text-[11px] font-black uppercase tracking-[0.5em] mb-6">Core Capabilities</h2>
            <h3 className="text-5xl md:text-7xl font-black text-white tracking-tighter max-w-4xl mx-auto leading-none">
              A complete engine for the <span className="italic font-serif text-zinc-500">infinite</span> creator.
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            <div className="md:col-span-8 bg-zinc-900/40 border border-white/5 p-12 rounded-[48px] hover:border-indigo-500/20 transition-all group overflow-hidden relative">
               <div className="absolute top-0 right-0 p-12 opacity-5 group-hover:opacity-10 transition-opacity duration-700">
                   <ImageIcon className="w-64 h-64" />
               </div>
               <div className="relative z-10">
                  <div className="w-16 h-16 bg-indigo-600/10 text-indigo-500 rounded-2xl flex items-center justify-center mb-10 group-hover:rotate-6 transition-transform">
                    <ImageIcon className="w-8 h-8" />
                  </div>
                  <h4 className="text-3xl font-black text-white mb-6 tracking-tight">8K Visual Synthesis</h4>
                  <p className="text-zinc-500 text-lg leading-relaxed font-medium max-w-lg">
                    Generate production-ready imagery with unprecedented coherence. Our Flash 2.5 core handles complex geometry and lighting in milliseconds.
                  </p>
               </div>
            </div>
            
            <div className="md:col-span-4 bg-zinc-900/40 border border-white/5 p-12 rounded-[48px] hover:border-purple-500/20 transition-all group">
               <div className="w-16 h-16 bg-purple-600/10 text-purple-500 rounded-2xl flex items-center justify-center mb-10 group-hover:scale-110 transition-transform">
                <FileVideo className="w-8 h-8" />
              </div>
              <h4 className="text-3xl font-black text-white mb-6 tracking-tight">Veo Motion</h4>
              <p className="text-zinc-500 text-lg leading-relaxed font-medium">
                High-fidelity 10-second cinematic sequences from a single prompt or frame.
              </p>
            </div>

            <div className="md:col-span-4 bg-zinc-900/40 border border-white/5 p-12 rounded-[48px] hover:border-pink-500/20 transition-all group">
               <div className="w-16 h-16 bg-pink-600/10 text-pink-500 rounded-2xl flex items-center justify-center mb-10 group-hover:rotate-[-6deg] transition-transform">
                <Mic className="w-8 h-8" />
              </div>
              <h4 className="text-3xl font-black text-white mb-6 tracking-tight">Neural Cloning</h4>
              <p className="text-zinc-500 text-lg leading-relaxed font-medium">
                Instant high-fidelity vocal synthesis. Clone any voice with just 10 seconds of source audio.
              </p>
            </div>

            <div className="md:col-span-8 bg-zinc-900/40 border border-white/5 p-12 rounded-[48px] hover:border-blue-500/20 transition-all group overflow-hidden relative">
               <div className="absolute top-0 right-0 p-12 opacity-5 group-hover:opacity-10 transition-opacity">
                   <BookOpen className="w-64 h-64" />
               </div>
               <div className="relative z-10">
                  <div className="w-16 h-16 bg-blue-600/10 text-blue-500 rounded-2xl flex items-center justify-center mb-10 group-hover:scale-105 transition-transform">
                    <BookOpen className="w-8 h-8" />
                  </div>
                  <h4 className="text-3xl font-black text-white mb-6 tracking-tight">Story Pipeline</h4>
                  <p className="text-zinc-500 text-lg leading-relaxed font-medium max-w-lg">
                    Multi-scene consistency tools. Keep your characters and environments locked across an entire narrative storyboard.
                  </p>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats/Metrics Section */}
      <section className="py-20 relative bg-indigo-600/5 border-y border-white/5">
          <div className="container mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-12 text-center">
              <div>
                  <p className="text-4xl md:text-6xl font-black text-white mb-2">12M+</p>
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">Assets Synthesized</p>
              </div>
              <div>
                  <p className="text-4xl md:text-6xl font-black text-white mb-2">80k</p>
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">Active Creators</p>
              </div>
              <div>
                  <p className="text-4xl md:text-6xl font-black text-white mb-2">99.9%</p>
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">Neural Accuracy</p>
              </div>
              <div>
                  <p className="text-4xl md:text-6xl font-black text-white mb-2">14ms</p>
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">Avg. Latency</p>
              </div>
          </div>
      </section>

      {/* Testimonials */}
      <section id="community" className="py-40">
        <div className="container mx-auto px-6">
           <div className="max-w-4xl mx-auto text-center">
                <div className="flex justify-center gap-1 mb-8">
                    {[1,2,3,4,5].map(i => <Star key={i} className="w-5 h-5 text-indigo-500" />)}
                </div>
                <p className="text-3xl md:text-5xl font-black text-white mb-12 italic leading-tight tracking-tight">
                   "LuminaGen has completely rewired our creative pipeline. What used to take a week of manual rendering now happens in a single afternoon of visual logic."
                </p>
                <div className="flex items-center justify-center gap-4">
                    <div className="w-14 h-14 bg-zinc-800 rounded-full border border-white/10"></div>
                    <div className="text-left">
                        <p className="text-white font-black uppercase tracking-widest text-xs">Alexander Thorne</p>
                        <p className="text-zinc-600 text-[10px] font-bold uppercase tracking-widest">Director of AI @ FutureLab</p>
                    </div>
                </div>
           </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-40 border-t border-white/5">
        <div className="container mx-auto px-6">
          <div className="text-center mb-24">
            <h2 className="text-indigo-500 text-[11px] font-black uppercase tracking-[0.5em] mb-6">Tier Selection</h2>
            <h3 className="text-5xl md:text-7xl font-black text-white tracking-tighter max-w-4xl mx-auto leading-none">
              Simple plans for serious <br />scale.
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <PricingCard 
                title="Creator" 
                price="Free" 
                desc="Perfect for hobbyists exploring generative art."
                features={['Gemini Flash Access', 'Basic Story Studio', 'Standard Export (720p)', 'Cloud Save']}
            />
            <PricingCard 
                title="Professional" 
                price="$29" 
                featured
                desc="Advanced features for designers and artists."
                features={['Gemini Pro & Imagen 4', 'Veo 10s Motion', 'High-Res Export (4K)', 'Batch Processing', 'Vocal Cloning Pro']}
            />
            <PricingCard 
                title="Enterprise" 
                price="Custom" 
                desc="Scale neural synthesis across your entire studio."
                features={['API Endpoint Access', 'Dedicated Support', 'Custom Model Training', 'Unlimited Concurrent Rendering']}
            />
          </div>
        </div>
      </section>

      {/* Interactive CTA */}
      <section className="py-40">
        <div className="container mx-auto px-6">
          <div className="bg-gradient-to-br from-indigo-900/40 to-purple-900/40 border border-white/10 rounded-[64px] p-16 md:p-32 text-center relative overflow-hidden group shadow-2xl">
            <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/20 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-1000"></div>
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-pink-600/10 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2 group-hover:scale-150 transition-transform duration-1000"></div>
            
            <h2 className="text-5xl md:text-8xl font-black text-white tracking-tighter mb-10 leading-[0.9] relative z-10">
              The future of <br />creation is yours.
            </h2>
            <p className="text-zinc-400 text-xl mb-16 max-w-2xl mx-auto relative z-10 font-medium leading-relaxed">
              Synthesize your imagination with LuminaGen. Join 80,000+ pioneers redefining visual boundaries.
            </p>
            <button 
              onClick={onStart}
              className="relative z-10 px-16 py-7 bg-white text-black font-black text-xs uppercase tracking-[0.3em] rounded-2xl hover:bg-indigo-50 transition-all transform hover:-translate-y-2 active:scale-95 shadow-[0_30px_60px_rgba(255,255,255,0.1)]"
            >
              Start Generating for Free
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-32 border-t border-white/5 bg-black/40 backdrop-blur-3xl">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-20 mb-20">
            <div className="space-y-8">
              <div className="flex items-center gap-3">
                <div className="bg-zinc-800 p-2 rounded-xl">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-black tracking-tighter text-white">LuminaGen</span>
              </div>
              <p className="text-zinc-500 text-sm leading-relaxed font-medium">
                The world's most advanced neural pipeline for multi-modal creative synthesis. Engineered by artists, powered by Gemini.
              </p>
              <div className="flex gap-4">
                  <Twitter className="w-5 h-5 text-zinc-600 hover:text-indigo-400 cursor-pointer transition-colors" />
                  <Instagram className="w-5 h-5 text-zinc-600 hover:text-pink-400 cursor-pointer transition-colors" />
                  <Linkedin className="w-5 h-5 text-zinc-600 hover:text-blue-400 cursor-pointer transition-colors" />
                  <Github className="w-5 h-5 text-zinc-600 hover:text-white cursor-pointer transition-colors" />
              </div>
            </div>
            
            <div>
              <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-white mb-8">Platform</h4>
              <ul className="space-y-4">
                {['Showcase', 'Workflow', 'Neural Core', 'Updates', 'Status'].map(item => (
                  <li key={item}><a href="#" className="text-sm font-bold text-zinc-500 hover:text-white transition-colors">{item}</a></li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-white mb-8">Company</h4>
              <ul className="space-y-4">
                {['Our Story', 'Careers', 'Media Kit', 'Contact', 'Support'].map(item => (
                  <li key={item}><a href="#" className="text-sm font-bold text-zinc-500 hover:text-white transition-colors">{item}</a></li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-white mb-8">Newsletter</h4>
              <p className="text-sm text-zinc-500 mb-6 font-medium">Join the frontier of creative AI.</p>
              <div className="flex gap-2 p-1 bg-white/5 border border-white/10 rounded-xl">
                  <input type="text" placeholder="Email" className="flex-1 bg-transparent px-4 py-2 text-sm outline-none font-bold" />
                  <button className="px-4 py-2 bg-white text-black text-[10px] font-black uppercase tracking-widest rounded-lg">Join</button>
              </div>
            </div>
          </div>
          
          <div className="pt-10 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-700">© 2025 LuminaGen Neural Labs. All rights reserved.</p>
            <div className="flex gap-10">
              <a href="#" className="text-[10px] font-black uppercase tracking-widest text-zinc-700 hover:text-white transition-colors">Privacy Policy</a>
              <a href="#" className="text-[10px] font-black uppercase tracking-widest text-zinc-700 hover:text-white transition-colors">Terms of Service</a>
              <a href="#" className="text-[10px] font-black uppercase tracking-widest text-zinc-700 hover:text-white transition-colors">Cookie Settings</a>
            </div>
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes float {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-20px); }
        }
        @keyframes bounce-subtle {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
        }
        .animate-float {
            animation: float 6s ease-in-out infinite;
        }
        .animate-bounce-subtle {
            animation: bounce-subtle 4s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

const PricingCard = ({ title, price, desc, features, featured }: { title: string, price: string, desc: string, features: string[], featured?: boolean }) => (
    <div className={`p-12 rounded-[48px] border transition-all flex flex-col relative overflow-hidden ${featured ? 'bg-indigo-600 border-indigo-500 shadow-2xl scale-105 z-10' : 'bg-zinc-900/40 border-white/5 hover:border-white/20'}`}>
        {featured && (
            <div className="absolute top-0 right-0 px-6 py-2 bg-white text-black text-[10px] font-black uppercase tracking-[0.3em] rounded-bl-3xl">Popular</div>
        )}
        <h4 className={`text-xl font-black uppercase tracking-[0.2em] mb-4 ${featured ? 'text-white' : 'text-zinc-400'}`}>{title}</h4>
        <div className="flex items-baseline gap-1 mb-8">
            <span className="text-5xl font-black">{price}</span>
            {price !== 'Free' && price !== 'Custom' && <span className="text-sm font-bold opacity-60">/mo</span>}
        </div>
        <p className={`text-sm mb-10 font-medium leading-relaxed ${featured ? 'text-indigo-100' : 'text-zinc-500'}`}>{desc}</p>
        
        <ul className="space-y-5 mb-12 flex-1">
            {features.map(f => (
                <li key={f} className="flex items-center gap-3 text-xs font-bold tracking-tight">
                    <CheckCircle className={`w-4 h-4 ${featured ? 'text-white' : 'text-indigo-500'}`} />
                    <span className={featured ? 'text-white' : 'text-zinc-300'}>{f}</span>
                </li>
            ))}
        </ul>

        <button className={`w-full py-5 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] transition-all transform active:scale-95 ${featured ? 'bg-white text-black hover:bg-indigo-50 shadow-xl' : 'bg-zinc-800 text-white hover:bg-zinc-700 border border-white/5'}`}>
            {price === 'Custom' ? 'Contact Sales' : 'Get Started'}
        </button>
    </div>
);

const FeatureCard = ({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) => (
  <div className="bg-zinc-900/40 border border-zinc-800 p-10 rounded-[40px] hover:border-indigo-500/30 transition-all group">
    <div className="w-14 h-14 bg-indigo-600/10 text-indigo-500 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-500">
      {icon}
    </div>
    <h4 className="text-xl font-black text-white mb-4 tracking-tight">{title}</h4>
    <p className="text-zinc-500 text-sm leading-relaxed font-medium">
      {desc}
    </p>
  </div>
);

export default LandingPage;
