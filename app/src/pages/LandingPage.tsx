import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Link } from 'react-router-dom';
import { ArrowRight, Calendar, Users, Trophy, Code, ChevronRight, Star, Quote } from 'lucide-react';
import SponsorCarousel from '../components/ui/SponsorCarousel';
// app\src\components\ui\SponsorCarousel.tsx
gsap.registerPlugin(ScrollTrigger);

export default function LandingPage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const eventsRef = useRef<HTMLDivElement>(null);
  const featuresRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const testimonialsRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo('.hero-title',
        { opacity: 0, y: 50 },
        { opacity: 1, y: 0, duration: 1, ease: 'power3.out', delay: 0.3 }
      );
      gsap.fromTo('.hero-subtitle',
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out', delay: 0.6 }
      );
      gsap.fromTo('.hero-cta',
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out', delay: 0.9 }
      );
      gsap.fromTo('.hero-cross',
        { opacity: 0, scale: 0 },
        { opacity: 1, scale: 1, duration: 0.6, stagger: 0.1, delay: 1.1 }
      );

      ScrollTrigger.create({
        trigger: eventsRef.current, start: 'top 80%',
        onEnter: () => {
          gsap.fromTo('.events-title', { opacity: 0, x: -50 }, { opacity: 1, x: 0, duration: 0.8, ease: 'power3.out' });
          gsap.fromTo('.event-card', { opacity: 0, x: 100, rotateY: 15 }, { opacity: 1, x: 0, rotateY: 0, duration: 0.8, stagger: 0.15, ease: 'power3.out', delay: 0.3 });
        }, once: true,
      });

      ScrollTrigger.create({
        trigger: featuresRef.current, start: 'top 80%',
        onEnter: () => {
          gsap.fromTo('.feature-item', { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.6, stagger: 0.1, ease: 'power3.out' });
        }, once: true,
      });

      ScrollTrigger.create({
        trigger: statsRef.current, start: 'top 80%',
        onEnter: () => {
          gsap.fromTo('.stat-item', { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1, duration: 0.6, stagger: 0.1, ease: 'back.out(1.7)' });
        }, once: true,
      });

      ScrollTrigger.create({
        trigger: testimonialsRef.current, start: 'top 80%',
        onEnter: () => {
          gsap.fromTo('.testimonial-card', { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.6, stagger: 0.1, ease: 'power3.out' });
        }, once: true,
      });

      ScrollTrigger.create({
        trigger: ctaRef.current, start: 'top 80%',
        onEnter: () => {
          gsap.fromTo('.cta-content', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' });
        }, once: true,
      });
    });
    return () => ctx.revert();
  }, []);

  const events = [
    { id: 1, title: 'AI for Earth', duration: '48 hrs', category: 'Sustainability', image: '/event_ai_earth.jpg', participants: 234 },
    { id: 2, title: 'Neon Buildathon', duration: '72 hrs', category: 'Open Innovation', image: '/event_neon_build.jpg', participants: 512 },
    { id: 3, title: 'Cyber Defense', duration: '48 hrs', category: 'Security', image: '/event_cyber_defense.jpg', participants: 189 },
  ];

  const features = [
    { icon: Calendar, title: 'Discover Events', description: 'Browse hackathons by category, date, and skill level. Find the perfect challenge for you.' },
    { icon: Users, title: 'Form Teams', description: 'Connect with like-minded developers, designers, and innovators from around the world.' },
    { icon: Code, title: 'Collaborate', description: 'Work together in real-time with built-in chat, file sharing, and project management.' },
    { icon: Trophy, title: 'Win Prizes', description: 'Showcase your skills, get judged by industry experts, and win amazing prizes.' },
  ];

  const stats = [
    { value: '500+', label: 'Hackathons' },
    { value: '50K+', label: 'Participants' },
    { value: '10K+', label: 'Teams Formed' },
    { value: '$2M+', label: 'Prizes Awarded' },
  ];

  const testimonials = [
    {
      name: 'Alex Chen', role: 'Full Stack Developer', avatar: '/avatar1.jpg', rating: 5,
      quote: 'Hackverse completely transformed how I approach hackathons. The team matching feature helped me find the perfect collaborators.'
    },
    {
      name: 'Sarah Martinez', role: 'UX Designer', avatar: '/avatar2.jpg', rating: 5,
      quote: 'The platform is incredibly intuitive. From registration to submission, everything flows seamlessly. Highly recommended!'
    },
    {
      name: 'David Kim', role: 'AI Engineer', avatar: '/avatar3.jpg', rating: 5,
      quote: 'Won my first hackathon thanks to Hackverse! The judging criteria are transparent and the community is amazing.'
    },
  ];

  return (
    <div className="relative">
      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section ref={heroRef} className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyber-cyan/5 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
        </div>
        <div className="absolute left-[6vw] top-[10vh] w-px h-[80vh] bg-gradient-to-b from-transparent via-cyber-cyan/30 to-transparent animate-pulse-slow" />

        {['top-[30%] left-[20%]', 'top-[25%] right-[25%]', 'bottom-[30%] left-[30%]', 'bottom-[25%] right-[20%]'].map((pos, i) => (
          <div key={i} className={`hero-cross absolute ${pos} w-6 h-6`}>
            <div className="absolute top-1/2 left-0 w-full h-px bg-cyber-cyan/70" />
            <div className="absolute top-0 left-1/2 w-px h-full bg-cyber-cyan/70" />
          </div>
        ))}

        <div className="relative z-10 text-center px-4">
          <p className="font-mono-label text-cyber-cyan mb-4">SEASON 2026</p>
          <h1 className="hero-title text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-heading font-bold text-white neon-glow mb-6">
            HACK<span className="text-cyber-cyan">VERSE</span>
          </h1>
          <p className="hero-subtitle text-xl sm:text-2xl md:text-3xl text-cyber-gray mb-4">Where Code Meets Cosmos</p>
          <p className="hero-subtitle text-base sm:text-lg text-cyber-gray/70 max-w-2xl mx-auto mb-10">
            Discover hackathons, build teams, ship projects, and climb the leaderboard — all in one neon-lit arena.
          </p>
          <div className="hero-cta flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/events" className="cyber-button-primary flex items-center space-x-2">
              <span>Explore Events</span><ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/auth/signup" className="cyber-button flex items-center space-x-2">
              <span>Get Started</span><ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        <div className="absolute bottom-[6vh] left-[6vw] max-w-xs">
          <p className="text-sm text-cyber-gray/60">Join 50,000+ developers, designers, and innovators in the ultimate hackathon platform.</p>
        </div>
      </section>

      {/* ── Sponsor Carousel (right below hero) ───────────────────────── */}
      <SponsorCarousel />

      {/* ── Events Horizon ───────────────────────────────────────────── */}
      <section ref={eventsRef} className="relative py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="events-title">
              <p className="font-mono-label text-cyber-cyan mb-4">FEATURED</p>
              <h2 className="text-4xl sm:text-5xl font-heading font-bold text-white mb-6">Events Horizon</h2>
              <p className="text-lg text-cyber-gray mb-8">
                Pick a mission. Form a squad. Build the future. Our curated hackathons span every technology and domain.
              </p>
              <Link to="/events" className="inline-flex items-center text-cyber-cyan hover:underline group">
                <span>View all events</span>
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
            <div className="relative">
              <div className="grid sm:grid-cols-3 gap-4">
                {events.map((event, index) => (
                  <div key={event.id}
                    className={`event-card cyber-card overflow-hidden group cursor-pointer transition-all duration-300 hover:shadow-neon-lg ${index === 1 ? 'sm:scale-110 sm:z-10' : ''}`}>
                    <div className="relative h-32 overflow-hidden">
                      <img src={event.image} alt={event.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                      <div className="absolute inset-0 bg-gradient-to-t from-cyber-darker to-transparent" />
                    </div>
                    <div className="p-4">
                      <span className="text-xs font-mono-label text-cyber-cyan">{event.category}</span>
                      <h3 className="text-lg font-heading font-semibold text-white mt-1">{event.title}</h3>
                      <div className="flex items-center justify-between mt-3">
                        <span className="text-sm text-cyber-gray">{event.duration}</span>
                        <span className="text-sm text-cyber-gray">{event.participants} joined</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ──────────────────────────────────────────────────── */}
      <section ref={featuresRef} className="relative py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <p className="font-mono-label text-cyber-cyan mb-4">PLATFORM</p>
            <h2 className="text-4xl sm:text-5xl font-heading font-bold text-white mb-4">Everything You Need</h2>
            <p className="text-lg text-cyber-gray max-w-2xl mx-auto">
              From discovery to submission, Hackverse provides all the tools you need to succeed.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, i) => (
              <div key={i} className="feature-item cyber-card p-6 group hover:shadow-neon transition-all duration-300">
                <div className="w-12 h-12 border border-cyber-cyan/30 rounded-lg flex items-center justify-center mb-4 group-hover:border-cyber-cyan group-hover:bg-cyber-cyan/10 transition-all">
                  <feature.icon className="w-6 h-6 text-cyber-cyan" />
                </div>
                <h3 className="text-xl font-heading font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-cyber-gray text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats ─────────────────────────────────────────────────────── */}
      <section ref={statsRef} className="relative py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="cyber-card p-8 sm:p-12">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
              {stats.map((stat, i) => (
                <div key={i} className="stat-item text-center">
                  <p className="text-4xl sm:text-5xl font-heading font-bold text-cyber-cyan mb-2">{stat.value}</p>
                  <p className="text-cyber-gray">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Testimonials ──────────────────────────────────────────────── */}
      <section ref={testimonialsRef} className="relative py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <p className="font-mono-label text-cyber-cyan mb-4">TESTIMONIALS</p>
            <h2 className="text-4xl sm:text-5xl font-heading font-bold text-white mb-4">Voices from the Community</h2>
            <p className="text-lg text-cyber-gray max-w-2xl mx-auto">
              Hear from developers, designers, and innovators who've experienced the Hackverse.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <div key={i} className="testimonial-card cyber-card p-6 relative">
                <Quote className="absolute top-4 right-4 w-8 h-8 text-cyber-cyan/20" />
                <div className="flex items-center mb-4">
                  <img src={t.avatar} alt={t.name} className="w-12 h-12 rounded-full object-cover border-2 border-cyber-cyan/30" />
                  <div className="ml-3">
                    <p className="text-white font-semibold">{t.name}</p>
                    <p className="text-cyber-gray text-sm">{t.role}</p>
                  </div>
                </div>
                <div className="flex mb-4">
                  {[...Array(t.rating)].map((_, j) => (
                    <Star key={j} className="w-4 h-4 text-cyber-cyan fill-cyber-cyan" />
                  ))}
                </div>
                <p className="text-cyber-gray">{t.quote}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Sponsor Carousel (second occurrence before CTA) ───────────── */}
      <div className="border-t border-cyber-cyan/10">
        <SponsorCarousel />
      </div>

      {/* ── CTA ───────────────────────────────────────────────────────── */}
      <section ref={ctaRef} className="relative py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center cta-content">
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-heading font-bold text-white mb-6">
            Ready to <span className="text-cyber-cyan">Hack</span>?
          </h2>
          <p className="text-xl text-cyber-gray mb-10 max-w-2xl mx-auto">
            Join the next generation of innovators. Sign up today and start your hackathon journey.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/auth/signup" className="cyber-button-primary flex items-center space-x-2">
              <span>Get Started Free</span><ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/events" className="cyber-button flex items-center space-x-2">
              <span>Browse Events</span><ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────── */}
      <footer className="relative py-12 px-4 sm:px-6 lg:px-8 border-t border-cyber-cyan/20">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div className="md:col-span-2">
              <Link to="/" className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 border border-cyber-cyan flex items-center justify-center">
                  <span className="text-cyber-cyan font-bold text-lg">H</span>
                </div>
                <span className="text-xl font-heading font-bold text-white">HACK<span className="text-cyber-cyan">VERSE</span></span>
              </Link>
              <p className="text-cyber-gray max-w-sm">
                Where Code Meets Cosmos. The ultimate platform for hackathon discovery, team formation, and project submission.
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Platform</h4>
              <ul className="space-y-2">
                <li><Link to="/events" className="text-cyber-gray hover:text-cyber-cyan transition-colors">Events</Link></li>
                <li><Link to="/leaderboard" className="text-cyber-gray hover:text-cyber-cyan transition-colors">Leaderboard</Link></li>
                <li><Link to="/auth/signup" className="text-cyber-gray hover:text-cyber-cyan transition-colors">Sign Up</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Support</h4>
              <ul className="space-y-2">
                <li><Link to="/help" className="text-cyber-gray hover:text-cyber-cyan transition-colors">Help Center</Link></li>
                <li><Link to="/contact" className="text-cyber-gray hover:text-cyber-cyan transition-colors">Contact Us</Link></li>
                <li><Link to="/privacy" className="text-cyber-gray hover:text-cyber-cyan transition-colors">Privacy Policy</Link></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-cyber-cyan/10 flex flex-col sm:flex-row items-center justify-between">
            <p className="text-cyber-gray text-sm">© 2026 Hackverse. All rights reserved.</p>
            <div className="flex items-center space-x-4 mt-4 sm:mt-0">
              {/* Twitter */}
              <a href="#" className="text-cyber-gray hover:text-cyber-cyan transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z" />
                </svg>
              </a>
              {/* GitHub */}
              <a href="#" className="text-cyber-gray hover:text-cyber-cyan transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
              </a>
              {/* LinkedIn */}
              <a href="#" className="text-cyber-gray hover:text-cyber-cyan transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}



// import { useEffect, useRef } from 'react';
// import { gsap } from 'gsap';
// import { ScrollTrigger } from 'gsap/ScrollTrigger';
// import { Link } from 'react-router-dom';
// import { ArrowRight, Calendar, Users, Trophy, Code, ChevronRight, Star, Quote } from 'lucide-react';

// gsap.registerPlugin(ScrollTrigger);

// export default function LandingPage() {
//   const heroRef = useRef<HTMLDivElement>(null);
//   const eventsRef = useRef<HTMLDivElement>(null);
//   const featuresRef = useRef<HTMLDivElement>(null);
//   const statsRef = useRef<HTMLDivElement>(null);
//   const testimonialsRef = useRef<HTMLDivElement>(null);
//   const ctaRef = useRef<HTMLDivElement>(null);

//   useEffect(() => {
//     const ctx = gsap.context(() => {
//       // Hero Animation
//       gsap.fromTo('.hero-title', 
//         { opacity: 0, y: 50 },
//         { opacity: 1, y: 0, duration: 1, ease: 'power3.out', delay: 0.3 }
//       );
//       gsap.fromTo('.hero-subtitle',
//         { opacity: 0, y: 30 },
//         { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out', delay: 0.6 }
//       );
//       gsap.fromTo('.hero-cta',
//         { opacity: 0, y: 20 },
//         { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out', delay: 0.9 }
//       );
//       gsap.fromTo('.hero-cross',
//         { opacity: 0, scale: 0 },
//         { opacity: 1, scale: 1, duration: 0.6, stagger: 0.1, delay: 1.1 }
//       );

//       // Events Section
//       ScrollTrigger.create({
//         trigger: eventsRef.current,
//         start: 'top 80%',
//         onEnter: () => {
//           gsap.fromTo('.events-title',
//             { opacity: 0, x: -50 },
//             { opacity: 1, x: 0, duration: 0.8, ease: 'power3.out' }
//           );
//           gsap.fromTo('.event-card',
//             { opacity: 0, x: 100, rotateY: 15 },
//             { opacity: 1, x: 0, rotateY: 0, duration: 0.8, stagger: 0.15, ease: 'power3.out', delay: 0.3 }
//           );
//         },
//         once: true
//       });

//       // Features Section
//       ScrollTrigger.create({
//         trigger: featuresRef.current,
//         start: 'top 80%',
//         onEnter: () => {
//           gsap.fromTo('.feature-item',
//             { opacity: 0, y: 40 },
//             { opacity: 1, y: 0, duration: 0.6, stagger: 0.1, ease: 'power3.out' }
//           );
//         },
//         once: true
//       });

//       // Stats Section
//       ScrollTrigger.create({
//         trigger: statsRef.current,
//         start: 'top 80%',
//         onEnter: () => {
//           gsap.fromTo('.stat-item',
//             { opacity: 0, scale: 0.9 },
//             { opacity: 1, scale: 1, duration: 0.6, stagger: 0.1, ease: 'back.out(1.7)' }
//           );
//         },
//         once: true
//       });

//       // Testimonials Section
//       ScrollTrigger.create({
//         trigger: testimonialsRef.current,
//         start: 'top 80%',
//         onEnter: () => {
//           gsap.fromTo('.testimonial-card',
//             { opacity: 0, y: 40 },
//             { opacity: 1, y: 0, duration: 0.6, stagger: 0.1, ease: 'power3.out' }
//           );
//         },
//         once: true
//       });

//       // CTA Section
//       ScrollTrigger.create({
//         trigger: ctaRef.current,
//         start: 'top 80%',
//         onEnter: () => {
//           gsap.fromTo('.cta-content',
//             { opacity: 0, y: 30 },
//             { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }
//           );
//         },
//         once: true
//       });
//     });

//     return () => ctx.revert();
//   }, []);

//   const events = [
//     {
//       id: 1,
//       title: 'AI for Earth',
//       duration: '48 hrs',
//       category: 'Sustainability',
//       image: '/event_ai_earth.jpg',
//       participants: 234,
//     },
//     {
//       id: 2,
//       title: 'Neon Buildathon',
//       duration: '72 hrs',
//       category: 'Open Innovation',
//       image: '/event_neon_build.jpg',
//       participants: 512,
//     },
//     {
//       id: 3,
//       title: 'Cyber Defense',
//       duration: '48 hrs',
//       category: 'Security',
//       image: '/event_cyber_defense.jpg',
//       participants: 189,
//     },
//   ];

//   const features = [
//     {
//       icon: Calendar,
//       title: 'Discover Events',
//       description: 'Browse hackathons by category, date, and skill level. Find the perfect challenge for you.',
//     },
//     {
//       icon: Users,
//       title: 'Form Teams',
//       description: 'Connect with like-minded developers, designers, and innovators from around the world.',
//     },
//     {
//       icon: Code,
//       title: 'Collaborate',
//       description: 'Work together in real-time with built-in chat, file sharing, and project management.',
//     },
//     {
//       icon: Trophy,
//       title: 'Win Prizes',
//       description: 'Showcase your skills, get judged by industry experts, and win amazing prizes.',
//     },
//   ];

//   const stats = [
//     { value: '500+', label: 'Hackathons' },
//     { value: '50K+', label: 'Participants' },
//     { value: '10K+', label: 'Teams Formed' },
//     { value: '$2M+', label: 'Prizes Awarded' },
//   ];

//   const testimonials = [
//     {
//       name: 'Alex Chen',
//       role: 'Full Stack Developer',
//       avatar: '/avatar1.jpg',
//       quote: 'Hackverse completely transformed how I approach hackathons. The team matching feature helped me find the perfect collaborators.',
//       rating: 5,
//     },
//     {
//       name: 'Sarah Martinez',
//       role: 'UX Designer',
//       avatar: '/avatar2.jpg',
//       quote: 'The platform is incredibly intuitive. From registration to submission, everything flows seamlessly. Highly recommended!',
//       rating: 5,
//     },
//     {
//       name: 'David Kim',
//       role: 'AI Engineer',
//       avatar: '/avatar3.jpg',
//       quote: 'Won my first hackathon thanks to Hackverse! The judging criteria are transparent and the community is amazing.',
//       rating: 5,
//     },
//   ];

//   return (
//     <div className="relative">
//       {/* Hero Section */}
//       <section ref={heroRef} className="relative min-h-screen flex items-center justify-center overflow-hidden">
//         {/* Background Effects */}
//         <div className="absolute inset-0">
//           <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyber-cyan/5 rounded-full blur-3xl animate-float" />
//           <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
//         </div>

//         {/* Vertical Line */}
//         <div className="absolute left-[6vw] top-[10vh] w-px h-[80vh] bg-gradient-to-b from-transparent via-cyber-cyan/30 to-transparent animate-pulse-slow" />

//         {/* Cross Markers */}
//         <div className="hero-cross absolute top-[30%] left-[20%] w-6 h-6">
//           <div className="absolute top-1/2 left-0 w-full h-px bg-cyber-cyan/70" />
//           <div className="absolute top-0 left-1/2 w-px h-full bg-cyber-cyan/70" />
//         </div>
//         <div className="hero-cross absolute top-[25%] right-[25%] w-6 h-6">
//           <div className="absolute top-1/2 left-0 w-full h-px bg-cyber-cyan/70" />
//           <div className="absolute top-0 left-1/2 w-px h-full bg-cyber-cyan/70" />
//         </div>
//         <div className="hero-cross absolute bottom-[30%] left-[30%] w-6 h-6">
//           <div className="absolute top-1/2 left-0 w-full h-px bg-cyber-cyan/70" />
//           <div className="absolute top-0 left-1/2 w-px h-full bg-cyber-cyan/70" />
//         </div>
//         <div className="hero-cross absolute bottom-[25%] right-[20%] w-6 h-6">
//           <div className="absolute top-1/2 left-0 w-full h-px bg-cyber-cyan/70" />
//           <div className="absolute top-0 left-1/2 w-px h-full bg-cyber-cyan/70" />
//         </div>

//         {/* Content */}
//         <div className="relative z-10 text-center px-4">
//           <p className="font-mono-label text-cyber-cyan mb-4">SEASON 2026</p>
//           <h1 className="hero-title text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-heading font-bold text-white neon-glow mb-6">
//             HACK<span className="text-cyber-cyan">VERSE</span>
//           </h1>
//           <p className="hero-subtitle text-xl sm:text-2xl md:text-3xl text-cyber-gray mb-4">
//             Where Code Meets Cosmos
//           </p>
//           <p className="hero-subtitle text-base sm:text-lg text-cyber-gray/70 max-w-2xl mx-auto mb-10">
//             Discover hackathons, build teams, ship projects, and climb the leaderboard—all in one neon-lit arena.
//           </p>
//           <div className="hero-cta flex flex-col sm:flex-row items-center justify-center gap-4">
//             <Link to="/events" className="cyber-button-primary flex items-center space-x-2">
//               <span>Explore Events</span>
//               <ArrowRight className="w-4 h-4" />
//             </Link>
//             <Link to="/auth/signup" className="cyber-button flex items-center space-x-2">
//               <span>Get Started</span>
//               <ChevronRight className="w-4 h-4" />
//             </Link>
//           </div>
//         </div>

//         {/* Bottom Info */}
//         <div className="absolute bottom-[6vh] left-[6vw] max-w-xs">
//           <p className="text-sm text-cyber-gray/60">
//             Join 50,000+ developers, designers, and innovators in the ultimate hackathon platform.
//           </p>
//         </div>
//       </section>

//       {/* Events Horizon Section */}
//       <section ref={eventsRef} className="relative py-24 px-4 sm:px-6 lg:px-8">
//         <div className="max-w-7xl mx-auto">
//           <div className="grid lg:grid-cols-2 gap-12 items-center">
//             {/* Left Content */}
//             <div className="events-title">
//               <p className="font-mono-label text-cyber-cyan mb-4">FEATURED</p>
//               <h2 className="text-4xl sm:text-5xl font-heading font-bold text-white mb-6">
//                 Events Horizon
//               </h2>
//               <p className="text-lg text-cyber-gray mb-8">
//                 Pick a mission. Form a squad. Build the future. Our curated hackathons span every technology and domain.
//               </p>
//               <Link to="/events" className="inline-flex items-center text-cyber-cyan hover:underline group">
//                 <span>View all events</span>
//                 <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
//               </Link>
//             </div>

//             {/* Right Content - Event Cards */}
//             <div className="relative">
//               <div className="grid sm:grid-cols-3 gap-4">
//                 {events.map((event, index) => (
//                   <div
//                     key={event.id}
//                     className={`event-card cyber-card overflow-hidden group cursor-pointer transition-all duration-300 hover:shadow-neon-lg ${
//                       index === 1 ? 'sm:scale-110 sm:z-10' : ''
//                     }`}
//                   >
//                     <div className="relative h-32 overflow-hidden">
//                       <img
//                         src={event.image}
//                         alt={event.title}
//                         className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
//                       />
//                       <div className="absolute inset-0 bg-gradient-to-t from-cyber-darker to-transparent" />
//                     </div>
//                     <div className="p-4">
//                       <span className="text-xs font-mono-label text-cyber-cyan">{event.category}</span>
//                       <h3 className="text-lg font-heading font-semibold text-white mt-1">{event.title}</h3>
//                       <div className="flex items-center justify-between mt-3">
//                         <span className="text-sm text-cyber-gray">{event.duration}</span>
//                         <span className="text-sm text-cyber-gray">{event.participants} joined</span>
//                       </div>
//                     </div>
//                   </div>
//                 ))}
//               </div>
//             </div>
//           </div>
//         </div>
//       </section>

//       {/* Features Section */}
//       <section ref={featuresRef} className="relative py-24 px-4 sm:px-6 lg:px-8">
//         <div className="max-w-7xl mx-auto">
//           <div className="text-center mb-16">
//             <p className="font-mono-label text-cyber-cyan mb-4">PLATFORM</p>
//             <h2 className="text-4xl sm:text-5xl font-heading font-bold text-white mb-4">
//               Everything You Need
//             </h2>
//             <p className="text-lg text-cyber-gray max-w-2xl mx-auto">
//               From discovery to submission, Hackverse provides all the tools you need to succeed.
//             </p>
//           </div>

//           <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
//             {features.map((feature, index) => (
//               <div
//                 key={index}
//                 className="feature-item cyber-card p-6 group hover:shadow-neon transition-all duration-300"
//               >
//                 <div className="w-12 h-12 border border-cyber-cyan/30 rounded-lg flex items-center justify-center mb-4 group-hover:border-cyber-cyan group-hover:bg-cyber-cyan/10 transition-all">
//                   <feature.icon className="w-6 h-6 text-cyber-cyan" />
//                 </div>
//                 <h3 className="text-xl font-heading font-semibold text-white mb-2">{feature.title}</h3>
//                 <p className="text-cyber-gray text-sm">{feature.description}</p>
//               </div>
//             ))}
//           </div>
//         </div>
//       </section>

//       {/* Stats Section */}
//       <section ref={statsRef} className="relative py-24 px-4 sm:px-6 lg:px-8">
//         <div className="max-w-7xl mx-auto">
//           <div className="cyber-card p-8 sm:p-12">
//             <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
//               {stats.map((stat, index) => (
//                 <div key={index} className="stat-item text-center">
//                   <p className="text-4xl sm:text-5xl font-heading font-bold text-cyber-cyan mb-2">
//                     {stat.value}
//                   </p>
//                   <p className="text-cyber-gray">{stat.label}</p>
//                 </div>
//               ))}
//             </div>
//           </div>
//         </div>
//       </section>

//       {/* Testimonials Section */}
//       <section ref={testimonialsRef} className="relative py-24 px-4 sm:px-6 lg:px-8">
//         <div className="max-w-7xl mx-auto">
//           <div className="text-center mb-16">
//             <p className="font-mono-label text-cyber-cyan mb-4">TESTIMONIALS</p>
//             <h2 className="text-4xl sm:text-5xl font-heading font-bold text-white mb-4">
//               Voices from the Community
//             </h2>
//             <p className="text-lg text-cyber-gray max-w-2xl mx-auto">
//               Hear from developers, designers, and innovators who've experienced the Hackverse.
//             </p>
//           </div>

//           <div className="grid md:grid-cols-3 gap-6">
//             {testimonials.map((testimonial, index) => (
//               <div
//                 key={index}
//                 className="testimonial-card cyber-card p-6 relative"
//               >
//                 <Quote className="absolute top-4 right-4 w-8 h-8 text-cyber-cyan/20" />
//                 <div className="flex items-center mb-4">
//                   <img
//                     src={testimonial.avatar}
//                     alt={testimonial.name}
//                     className="w-12 h-12 rounded-full object-cover border-2 border-cyber-cyan/30"
//                   />
//                   <div className="ml-3">
//                     <p className="text-white font-semibold">{testimonial.name}</p>
//                     <p className="text-cyber-gray text-sm">{testimonial.role}</p>
//                   </div>
//                 </div>
//                 <div className="flex mb-4">
//                   {[...Array(testimonial.rating)].map((_, i) => (
//                     <Star key={i} className="w-4 h-4 text-cyber-cyan fill-cyber-cyan" />
//                   ))}
//                 </div>
//                 <p className="text-cyber-gray">{testimonial.quote}</p>
//               </div>
//             ))}
//           </div>
//         </div>
//       </section>

//       {/* CTA Section */}
//       <section ref={ctaRef} className="relative py-24 px-4 sm:px-6 lg:px-8">
//         <div className="max-w-4xl mx-auto text-center cta-content">
//           <h2 className="text-4xl sm:text-5xl md:text-6xl font-heading font-bold text-white mb-6">
//             Ready to <span className="text-cyber-cyan">Hack</span>?
//           </h2>
//           <p className="text-xl text-cyber-gray mb-10 max-w-2xl mx-auto">
//             Join the next generation of innovators. Sign up today and start your hackathon journey.
//           </p>
//           <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
//             <Link to="/auth/signup" className="cyber-button-primary flex items-center space-x-2">
//               <span>Get Started Free</span>
//               <ArrowRight className="w-4 h-4" />
//             </Link>
//             <Link to="/events" className="cyber-button flex items-center space-x-2">
//               <span>Browse Events</span>
//               <ChevronRight className="w-4 h-4" />
//             </Link>
//           </div>
//         </div>
//       </section>

//       {/* Footer */}
//       <footer className="relative py-12 px-4 sm:px-6 lg:px-8 border-t border-cyber-cyan/20">
//         <div className="max-w-7xl mx-auto">
//           <div className="grid md:grid-cols-4 gap-8 mb-8">
//             {/* Brand */}
//             <div className="md:col-span-2">
//               <Link to="/" className="flex items-center space-x-2 mb-4">
//                 <div className="w-8 h-8 border border-cyber-cyan flex items-center justify-center">
//                   <span className="text-cyber-cyan font-bold text-lg">H</span>
//                 </div>
//                 <span className="text-xl font-heading font-bold text-white">
//                   HACK<span className="text-cyber-cyan">VERSE</span>
//                 </span>
//               </Link>
//               <p className="text-cyber-gray max-w-sm">
//                 Where Code Meets Cosmos. The ultimate platform for hackathon discovery, team formation, and project submission.
//               </p>
//             </div>

//             {/* Links */}
//             <div>
//               <h4 className="text-white font-semibold mb-4">Platform</h4>
//               <ul className="space-y-2">
//                 <li><Link to="/events" className="text-cyber-gray hover:text-cyber-cyan transition-colors">Events</Link></li>
//                 <li><Link to="/leaderboard" className="text-cyber-gray hover:text-cyber-cyan transition-colors">Leaderboard</Link></li>
//                 <li><Link to="/auth/signup" className="text-cyber-gray hover:text-cyber-cyan transition-colors">Sign Up</Link></li>
//               </ul>
//             </div>

//             <div>
//               <h4 className="text-white font-semibold mb-4">Support</h4>
//               <ul className="space-y-2">
//                 <li><Link to="/help" className="text-cyber-gray hover:text-cyber-cyan transition-colors">Help Center</Link></li>
//                 <li><Link to="/contact" className="text-cyber-gray hover:text-cyber-cyan transition-colors">Contact Us</Link></li>
//                 <li><Link to="/privacy" className="text-cyber-gray hover:text-cyber-cyan transition-colors">Privacy Policy</Link></li>
//               </ul>
//             </div>
//           </div>

//           <div className="pt-8 border-t border-cyber-cyan/10 flex flex-col sm:flex-row items-center justify-between">
//             <p className="text-cyber-gray text-sm">
//               © 2026 Hackverse. All rights reserved.
//             </p>
//             <div className="flex items-center space-x-4 mt-4 sm:mt-0">
//               <a href="#" className="text-cyber-gray hover:text-cyber-cyan transition-colors">
//                 <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
//                   <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/>
//                 </svg>
//               </a>
//               <a href="#" className="text-cyber-gray hover:text-cyber-cyan transition-colors">
//                 <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
//                   <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
//                 </svg>
//               </a>
//               <a href="#" className="text-cyber-gray hover:text-cyber-cyan transition-colors">
//                 <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
//                   <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
//                 </svg>
//               </a>
//             </div>
//           </div>
//         </div>
//       </footer>
//     </div>
//   );
// }
