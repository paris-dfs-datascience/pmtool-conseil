import React, { useState } from 'react';
import { ArrowRight, CheckCircle, Clock, Target, Users, Zap, Mail, Building, Phone, Briefcase, Calendar, TrendingUp, ShieldCheck, ChevronLeft, ChevronRight } from 'lucide-react';

// Note: Import your DemoSignup and Bio components at the top of your file
import DemoSignup from '../components/HomePageComponents/demoblueprint';
import Bio from '../components/HomePageComponents/bio';

const WorkProductsCarousel = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  
  // Replace these placeholder images with your actual work product images
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
    description: 'Building sophiscated AI solutions'
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
      {/* Carousel Container */}
      <div className="relative overflow-hidden rounded-2xl shadow-2xl bg-white border border-gray-200">
        {/* Slides */}
        <div className="relative h-96 md:h-[500px]">
          {slides.map((slide, index) => (
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

        {/* Navigation Arrows */}
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

      {/* Indicators */}
      <div className="flex justify-center gap-2 mt-6">
        {slides.map((_, index) => (
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

export default function AIBluePrintLanding() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-5 flex justify-between items-center">
          <div className="text-2xl font-bold text-gray-900">Our Proven Approach</div>
          <button 
            onClick={() => {
              const element = document.getElementById('contact');
              if (element) {
                element.scrollIntoView({ behavior: 'smooth' });
              }
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-all font-semibold"
          >
            Get Started
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <div className="inline-block bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm font-semibold mb-6">
            2-Week Strategic Sprint • Complimentary Engagement • No Risk
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            Your AI BluePrint in
            <span className="text-blue-600"> Just 2 Weeks</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            Get answers to key questions to create an AI blueprint focused on value, vision, risk, and adoption. Le Marais Advisory will invest in this engagement to help you get your AI strategy started.
          </p>
        </div>

        {/* Value Props Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-8 rounded-2xl border border-blue-200 hover:shadow-lg transition-all">
            <div className="bg-blue-600 w-14 h-14 rounded-xl flex items-center justify-center mb-4">
              <Target className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Strategic Assessment</h3>
            <p className="text-gray-700">
              Identify high-impact AI opportunities aligned with your business goals through stakeholder interviews and use case analysis.
            </p>
          </div>
          
          <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 p-8 rounded-2xl border border-cyan-200 hover:shadow-lg transition-all">
            <div className="bg-cyan-600 w-14 h-14 rounded-xl flex items-center justify-center mb-4">
              <Briefcase className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Readiness Evaluation</h3>
            <p className="text-gray-700">
              Assess your data, technology infrastructure, and organizational readiness for successful AI adoption.
            </p>
          </div>
          
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-8 rounded-2xl border border-purple-200 hover:shadow-lg transition-all">
            <div className="bg-purple-600 w-14 h-14 rounded-xl flex items-center justify-center mb-4">
              <Calendar className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Clear Roadmap</h3>
            <p className="text-gray-700">
              Receive a prioritized action plan with KPIs, timelines, and clear next steps for AI implementation.
            </p>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-gradient-to-r from-blue-600 to-cyan-600 py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            {[
              { number: '2 Weeks', label: 'To Complete BluePrint' },
              { number: '50+', label: 'Successful Engagements' },
              { number: '18+', label: 'Years of AI Experience' },
              { number: '$50M+', label: 'In Projects Led' }
            ].map((stat, idx) => (
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
              'Business Goals Analysis Document',
              'AI Opportunity Assessment Report',
              'Data & Technology Readiness Evaluation',
              'Prioritized Use Case Recommendations',
              'Risk & Compliance Analysis',
              'Organizational Change Management Plan',
              'Detailed Implementation Roadmap with KPIs',
              'Executive Presentation Materials'
            ].map((item, idx) => (
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

      {/* Demo Form and Bio Section */}
      <section id="contact" className="bg-gray-50 py-20" data-section="demo_and_bio">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex">
            <div className="w-1/2 p-4">
              <DemoSignup />
            </div>
            <div className="w-1/2 p-4">
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
}