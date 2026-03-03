import React, { useState, useEffect } from 'react';
import { ArrowRight, CheckCircle, Clock, Target, Users, Zap, Mail, Building, Phone, Briefcase, Calendar, TrendingUp, ShieldCheck, ChevronLeft, ChevronRight } from 'lucide-react';
import LoomVideo from '../components/LoomVideo';
import DemoSignup from '../components/HomePageComponents/demoblueprint';
import Bio from '../components/HomePageComponents/bio';

// Declare gtag for TypeScript
declare global {
  interface Window {
    gtag: (command: string, targetId: string, config?: any) => void;
    dataLayer: any[];
  }
}

// Utility function to track conversions
const trackConversion = (eventName: string, eventData?: any) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, eventData);
    console.log(`${eventName} conversion tracked`, eventData);
  }

  if (typeof window !== 'undefined' && window.dataLayer) {
    window.dataLayer.push({
      event: eventName,
      ...eventData
    });
  }
};

const InteractiveAssessment = () => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [showResults, setShowResults] = useState(false);

  const questions = [
    {
      id: 'strategy',
      question: 'Does your organization have a clear AI strategy?',
      options: [
        { value: 3, label: 'Yes, well-defined and documented' },
        { value: 2, label: 'Partially, but needs refinement' },
        { value: 1, label: 'No, just exploring options' }
      ]
    },
    {
      id: 'data',
      question: 'How would you rate your data readiness?',
      options: [
        { value: 3, label: 'Data is organized and accessible' },
        { value: 2, label: 'Some data available, needs work' },
        { value: 1, label: 'Data is siloed or unstructured' }
      ]
    },
    {
      id: 'team',
      question: 'Do you have AI/ML expertise in-house?',
      options: [
        { value: 3, label: 'Yes, dedicated AI team' },
        { value: 2, label: 'Some technical staff, limited AI experience' },
        { value: 1, label: 'No AI expertise currently' }
      ]
    },
    {
      id: 'urgency',
      question: 'How urgent is AI adoption for your business?',
      options: [
        { value: 3, label: 'Critical for competitive advantage' },
        { value: 2, label: 'Important but not immediate' },
        { value: 1, label: 'Exploring for future consideration' }
      ]
    }
  ];

  const handleAnswer = (value: number) => {
    const newAnswers = { ...answers, [questions[currentQuestion].id]: value };
    setAnswers(newAnswers);
    
    if (currentQuestion < questions.length - 1) {
      setTimeout(() => setCurrentQuestion(currentQuestion + 1), 300);
    } else {
      setTimeout(() => {
        setShowResults(true);
        // Track assessment completion
        const score = Object.values(newAnswers).reduce((sum: number, val: number) => sum + val, 0);
        trackConversion('Assessment_Completed', {
          value: 250,
          currency: 'USD',
          assessment_score: score,
          transaction_id: `assessment_${Date.now()}`
        });
      }, 300);
    }
  };

  const calculateScore = (): number => {
    return Object.values(answers).reduce((sum: number, val: number) => sum + val, 0);
  };

  const getRecommendation = (score: number) => {
    if (score >= 10) {
      return {
        title: 'Ready to Accelerate',
        message: 'Your organization has strong foundations. A BluePrint will help you prioritize and execute quickly.',
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200'
      };
    } else if (score >= 7) {
      return {
        title: 'Building Momentum',
        message: 'You have key pieces in place. A BluePrint will identify gaps and create a clear path forward.',
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200'
      };
    } else {
      return {
        title: 'Starting Your Journey',
        message: 'Perfect timing to get started. A BluePrint will establish your foundation and roadmap for success.',
        color: 'text-purple-600',
        bgColor: 'bg-purple-50',
        borderColor: 'border-purple-200'
      };
    }
  };

  const resetAssessment = () => {
    setCurrentQuestion(0);
    setAnswers({});
    setShowResults(false);
  };

  if (showResults) {
    const score = calculateScore();
    const recommendation = getRecommendation(score);

    return (
      <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-200">
        <div className={`${recommendation.bgColor} ${recommendation.borderColor} border-2 rounded-xl p-6 mb-6`}>
          <div className="flex items-center gap-3 mb-4">
            <Target className={`w-8 h-8 ${recommendation.color}`} />
            <h3 className={`text-2xl font-bold ${recommendation.color}`}>
              {recommendation.title}
            </h3>
          </div>
          <p className="text-gray-700 text-lg mb-4">
            {recommendation.message}
          </p>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Zap className="w-5 h-5" />
            <span>Your readiness score: {score}/12</span>
          </div>
        </div>

        <div className="space-y-4 mb-6">
          <h4 className="font-semibold text-gray-900">Your BluePrint will include:</h4>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-gray-700">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span>Customized AI strategy aligned to your goals</span>
            </div>
            <div className="flex items-center gap-2 text-gray-700">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span>Prioritized use cases with ROI projections</span>
            </div>
            <div className="flex items-center gap-2 text-gray-700">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span>2-week timeline to actionable roadmap</span>
            </div>
          </div>
        </div>

        <DemoSignup />
        
        <button
          onClick={resetAssessment}
          className="w-full mt-4 text-blue-600 hover:text-blue-700 text-sm font-medium"
        >
          Retake Assessment
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-200">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <span className="text-sm font-semibold text-blue-600">
            Question {currentQuestion + 1} of {questions.length}
          </span>
          <div className="flex gap-1">
            {questions.map((_, idx: number) => (
              <div
                key={idx}
                className={`h-2 w-8 rounded-full ${
                  idx <= currentQuestion ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-6">
          {questions[currentQuestion].question}
        </h3>
      </div>

      <div className="space-y-3">
        {questions[currentQuestion].options.map((option, idx: number) => (
          <button
            key={idx}
            onClick={() => handleAnswer(option.value)}
            className="w-full text-left p-4 rounded-xl border-2 border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-all group"
          >
            <div className="flex items-center justify-between">
              <span className="text-gray-900 font-medium group-hover:text-blue-700">
                {option.label}
              </span>
              <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
            </div>
          </button>
        ))}
      </div>

      <div className="mt-8 pt-6 border-t border-gray-200">
        <p className="text-sm text-gray-600 text-center">
          This quick assessment helps us understand your starting point
        </p>
      </div>
    </div>
  );
};

const VideoTracker = ({ children }: { children: React.ReactNode }) => {
  const [hasTrackedEngagement, setHasTrackedEngagement] = useState(false);

  useEffect(() => {
    // Track engagement after user stays on page for 30 seconds (indicating video watch)
    const engagementTimer = setTimeout(() => {
      if (!hasTrackedEngagement) {
        setHasTrackedEngagement(true);
        trackConversion('Video_Engagement', {
          value: 250,
          currency: 'USD',
          video_title: 'AI BluePrint Framework Video',
          engagement_time: 30,
          transaction_id: `video_engagement_${Date.now()}`
        });
      }
    }, 30000); // 30 seconds

    return () => {
      clearTimeout(engagementTimer);
    };
  }, [hasTrackedEngagement]);

  return <>{children}</>;
};

const WorkProductsCarousel = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  
  const slides = [
    {
      image: '/images/BluePrintDemo/framework.png',
      title: 'AI Strategy Framework',
      description: 'Comprehensive framework showing AI transformation roadmap'
    },
    {
      image: '/images/BluePrintDemo/usecase.png',
      title: 'Use Case Analysis',
      description: 'Prioritized use cases with impact assessment'
    },
    {
      image: '/images/BluePrintDemo/roadmap.png',
      title: 'Implementation Roadmap',
      description: 'Detailed timeline and milestones for AI adoption'
    },
    {
      image: '/images/BluePrintDemo/timeline.png',
      title: 'Executive Presentation',
      description: 'Board-ready presentation materials'
    },
    {
      image: '/images/BluePrintDemo/solution_edgar.png',
      title: 'Automating Complex Processes',
      description: 'Leveraging APIs and AI to automate work'
    },
    {
      image: '/images/BluePrintDemo/solution_UNFPA.png',
      title: 'Enterprise Grade RAG systems',
      description: 'Building sophisticated AI solutions'
    },
    {
      image: '/images/BluePrintDemo/solution_npa.png',
      title: 'Lightweight Bespoke AI',
      description: 'Automated solutions in weeks, not months'
    },
  ];

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  return (
    <div className="relative max-w-5xl mx-auto">
      <div className="relative overflow-hidden rounded-2xl shadow-2xl bg-white border border-gray-200">
        <div className="relative h-96 md:h-[500px]">
          {slides.map((slide, index: number) => (
            <div
              key={index}
              className={`absolute inset-0 transition-opacity duration-500 ${
                index === currentSlide ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <img
                src={slide.image}
                alt={slide.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-8">
                <h3 className="text-2xl font-bold text-white mb-2">{slide.title}</h3>
                <p className="text-gray-200">{slide.description}</p>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={prevSlide}
          className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-800 p-3 rounded-full shadow-lg transition-all hover:scale-110"
          aria-label="Previous slide"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <button
          onClick={nextSlide}
          className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-800 p-3 rounded-full shadow-lg transition-all hover:scale-110"
          aria-label="Next slide"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>

      <div className="flex justify-center gap-2 mt-6">
        {slides.map((_, index: number) => (
          <button
            key={index}
            onClick={() => setCurrentSlide(index)}
            className={`h-2 rounded-full transition-all ${
              index === currentSlide 
                ? 'w-8 bg-blue-600' 
                : 'w-2 bg-gray-300 hover:bg-gray-400'
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
};

const WorkBoardLanding: React.FC = () => {
  return (
    <div className="min-h-screen bg-white">
      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          
          {/* Left Column - Video and Quote */}
          <div className="space-y-8">
            {/* Heading */}
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-8">
              Watch: 2 Minute Summary of our AI BluePrint
            </h1>
            
            {/* Video Section with Tracking */}
            <div data-section="video" className="w-full">
              <VideoTracker>
                <LoomVideo 
                  videoId="8ab897bc013a47c7a934a43d813a2ebc"
                  sid="d8b1df42-5bb6-4758-8225-0a1fa8da2bf1"
                  height="500px"
                  aspectRatio="fixed"
                  maxHeight="80vh"
                />
              </VideoTracker>
            </div>

            {/* Quote Section */}
            <div className="flex gap-4 items-start mt-12">
              <img 
                src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop" 
                alt="Dan Webster"
                className="w-24 h-24 rounded-full object-cover flex-shrink-0"
              />
              <div className="flex-1">
                <blockquote className="text-base md:text-lg font-medium text-gray-900 mb-3">
                  "With everything accelerating, you must think about risk differently, and the winners and losers are going to shake out much faster."
                </blockquote>
                <p className="text-sm text-gray-700 font-medium">
                  —Dan Webster, Managing Director, Portfolio Operations
                </p>
              </div>
            </div>

            {/* Company Logos */}
            <div className="flex flex-wrap items-center justify-start gap-8 pt-8 opacity-60">
              <div className="text-3xl font-bold">Booz Allen</div>
              <div className="text-3xl font-bold text-blue-600">BNY Mellon</div>
              <div className="text-2xl font-bold text-blue-500">GI Partners</div>
              <div className="w-20">
                <svg viewBox="0 0 80 40" className="w-full">
                  <ellipse cx="40" cy="20" rx="38" ry="18" fill="none" stroke="#003478" strokeWidth="2"/>
                  <text x="40" y="25" textAnchor="middle" fill="#003478" fontSize="14" fontWeight="bold">Ford</text>
                </svg>
              </div>
              <div className="text-2xl font-bold">
                Insight<br/>
                <span className="text-sm">Partners</span>
              </div>
              <div className="text-2xl font-bold text-pink-600">Protective Life</div>
            </div>
          </div>

          {/* Right Column - Form */}
          <div className="lg:sticky lg:top-8">
            <DemoSignup />
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <section className="bg-gradient-to-r from-blue-600 to-cyan-600 py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            {[
              { number: '2 Weeks', label: 'To Complete BluePrint' },
              { number: '50+', label: 'Successful Engagements' },
              { number: '18+', label: 'Years of AI Experience' },
              { number: '$50M+', label: 'In Projects Led' }
            ].map((stat, idx: number) => (
              <div key={idx} className="text-center">
                <div className="text-4xl font-bold text-white mb-2">
                  {stat.number}
                </div>
                <div className="text-blue-100">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* The BluePrint Process */}
      <section className="max-w-7xl mx-auto px-4 py-20">
        <h2 className="text-4xl font-bold text-gray-900 text-center mb-4">
          The BluePrint Process
        </h2>
        <p className="text-xl text-gray-600 text-center mb-16 max-w-3xl mx-auto">
          A condensed 2-week engagement to help you experience our methodology and get started with confidence
        </p>
        
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 hover:shadow-xl transition-all">
            <div className="bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm font-semibold mb-4 inline-block">
              Assessment
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Discovery & Analysis</h3>
            <ul className="space-y-3 mb-6">
              <li className="flex items-start">
                <CheckCircle className="w-5 h-5 text-green-500 mr-3 mt-1 flex-shrink-0" />
                <span className="text-gray-700">Stakeholder interviews on current processes</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="w-5 h-5 text-green-500 mr-3 mt-1 flex-shrink-0" />
                <span className="text-gray-700">AI opportunity identification</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="w-5 h-5 text-green-500 mr-3 mt-1 flex-shrink-0" />
                <span className="text-gray-700">Operational challenges mapping</span>
              </li>
            </ul>
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <p className="text-sm font-semibold text-gray-900 mb-1">Deliverable:</p>
              <p className="text-sm text-gray-600">Strategy Framework & Use Case Catalog</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 hover:shadow-xl transition-all">
            <div className="bg-cyan-100 text-cyan-700 px-4 py-2 rounded-full text-sm font-semibold mb-4 inline-block">
              Strategy
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Business Alignment</h3>
            <ul className="space-y-3 mb-6">
              <li className="flex items-start">
                <CheckCircle className="w-5 h-5 text-green-500 mr-3 mt-1 flex-shrink-0" />
                <span className="text-gray-700">Business goals analysis</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="w-5 h-5 text-green-500 mr-3 mt-1 flex-shrink-0" />
                <span className="text-gray-700">AI opportunity assessment</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="w-5 h-5 text-green-500 mr-3 mt-1 flex-shrink-0" />
                <span className="text-gray-700">Readiness evaluation (data, tech, process)</span>
              </li>
            </ul>
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <p className="text-sm font-semibold text-gray-900 mb-1">Deliverable:</p>
              <p className="text-sm text-gray-600">Acceleration Framework & Priorities</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 hover:shadow-xl transition-all">
            <div className="bg-purple-100 text-purple-700 px-4 py-2 rounded-full text-sm font-semibold mb-4 inline-block">
              Roadmap
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Implementation Plan</h3>
            <ul className="space-y-3 mb-6">
              <li className="flex items-start">
                <CheckCircle className="w-5 h-5 text-green-500 mr-3 mt-1 flex-shrink-0" />
                <span className="text-gray-700">Prioritized use cases with KPIs</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="w-5 h-5 text-green-500 mr-3 mt-1 flex-shrink-0" />
                <span className="text-gray-700">Risk assessment and mitigation</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="w-5 h-5 text-green-500 mr-3 mt-1 flex-shrink-0" />
                <span className="text-gray-700">Go/no-go criteria and next steps</span>
              </li>
            </ul>
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <p className="text-sm font-semibold text-gray-900 mb-1">Deliverable:</p>
              <p className="text-sm text-gray-600">Complete AI BluePrint & Action Plan</p>
            </div>
          </div>
        </div>
      </section>

      {/* What's Included */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-4xl font-bold text-gray-900 text-center mb-16">
            Complete BluePrint Deliverables
          </h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            {[
              'AI Opportunity Assessment Report',
              'Data & Technology Readiness Evaluation',
              'Prioritized Use Case Recommendations',
              'Executive Presentation Materials'
            ].map((item, idx: number) => (
              <div key={idx} className="flex items-start space-x-4 bg-white p-6 rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all">
                <CheckCircle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                <span className="text-gray-800 text-lg font-medium">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Work Products Carousel */}
      <section className="max-w-7xl mx-auto px-4 py-20">
        <h2 className="text-4xl font-bold text-gray-900 text-center mb-4">
          Our Work Products
        </h2>
        <p className="text-xl text-gray-600 text-center mb-12">
          Examples of deliverables from our AI BluePrint engagements
        </p>
        
        <WorkProductsCarousel />
      </section>

      {/* Interactive Assessment and Bio Section */}
      <section id="contact" className="bg-gradient-to-br from-blue-50 to-cyan-50 py-20" data-section="demo_and_bio">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-4xl font-bold text-gray-900 text-center mb-4">
            Is Your Organization Ready for AI?
          </h2>
          <p className="text-xl text-gray-600 text-center mb-12">
            Take our quick assessment to see where you stand
          </p>
          
          <div className="grid lg:grid-cols-2 gap-12">
            {/* Interactive Assessment */}
            <InteractiveAssessment />
            
            {/* Bio Section */}
            <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-200">
              <Bio />
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center">
            <div className="text-2xl font-bold mb-4">AI BluePrint</div>
            <p className="text-gray-400 mb-6">
              Accelerating AI transformation for forward-thinking organizations
            </p>
            <div className="text-gray-500 text-sm">
              © 2025 Le Marais Advisory. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default WorkBoardLanding;