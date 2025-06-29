import React, { useState } from 'react';
import { ChevronRight, CheckCircle, TrendingUp, Users, Zap, Shield, Clock, Target, ArrowRight } from 'lucide-react';

const ConsultingOverview = () => {
  const [activePhase, setActivePhase] = useState(0);

  const challenges = [
    {
      title: "Deployment Challenge",
      description: "Organizations struggle to move AI from theoretical concepts to actual implementation, facing technical obstacles, integration issues, and adoption barriers.",
      solution: "Our proven BluePrint-to-MVP methodology ensures successful implementation with defined checkpoints and measurable outcomes at each stage.",
      icon: <Zap className="w-8 h-8" />
    },
    {
      title: "Future of Work Challenge", 
      description: "Companies need guidance on how AI will transform roles, skills, and organizational structures while embracing automation impact.",
      solution: "Our comprehensive talent and operating model frameworks help clients navigate workforce transitions with minimal disruption and maximum upskilling.",
      icon: <Users className="w-8 h-8" />
    },
    {
      title: "Responsible AI Challenge",
      description: "Organizations need to implement AI ethically with proper governance, risk management, and compliance frameworks.",
      solution: "Our AI governance framework embeds ethics, compliance, and risk mitigation throughout the transformation journey.",
      icon: <Shield className="w-8 h-8" />
    }
  ];

  const clientJourney = [
    {
      phase: "Blueprint",
      duration: "4-12 weeks",
      description: "Get answers to key questions to create an AI blueprint that focuses on value, vision, risk and adoption.",
      deliverables: ["AI Readiness Scorecard", "Opportunity Heat Map", "Strategic Roadmap", "Use Case Portfolio"],
      color: "bg-blue-500"
    },
    {
      phase: "MVP",
      duration: "4-12 weeks", 
      description: "Build MVP and launch with small group of users. Test and iterate solution to prove value.",
      deliverables: ["Working Prototype", "Value Validation", "Product Backlog", "Implementation Plan"],
      color: "bg-green-500"
    },
    {
      phase: "Production",
      duration: "4-12 months",
      description: "Expand rapidly. Set up scalable solutions for growth and sophisticate current solutions.",
      deliverables: ["Scaled Solution", "Performance Monitoring", "User Training", "Change Management"],
      color: "bg-purple-500"
    },
    {
      phase: "Expansion", 
      duration: "1+ years",
      description: "Refine product. Add additional use cases and establish enterprise-wide AI capabilities.",
      deliverables: ["Additional Use Cases", "Center of Excellence", "Governance Framework", "Continuous Innovation"],
      color: "bg-orange-500"
    }
  ];

  const keyMetrics = [
    { label: "Revenue Impact", value: "$200M+", description: "Generated across client engagements" },
    { label: "Operational Savings", value: "$85M+", description: "Identified through AI roadmaps" },
    { label: "Project Success Rate", value: "95%", description: "From strategy to production" },
    { label: "Fortune 50 Clients", value: "20+", description: "Successful transformations" }
  ];

  const clientLogos = [
    "BNY Mellon", "Wolters Kluwer", "Penn Entertainment", "MAPFRE", 
    "CVS Pharmacy", "BlackRock", "McKesson", "Protective Life"
  ];

  const industries = [
    "Financial Services", "Healthcare", "Retail & E-commerce", 
    "Insurance", "Government", "Private Equity"
  ];

  return (
    <div className="w-full bg-slate-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Accelerate Your AI Journey
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-slate-300 max-w-4xl mx-auto">
              From strategy to production, we help organizations overcome AI challenges and achieve measurable results in 45 days or less.
            </p>
            <div className="text-lg text-blue-300">
              <span className="font-semibold">$3-6 million</span> is lost in growth potential every 6 months delaying AI strategy
            </div>
          </div>
        </div>
      </div>

      {/* Problem-Solution Section */}
      <div className="py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              Three Critical Challenges Companies Face
            </h2>
            <p className="text-lg text-slate-600">
              We've identified the key barriers preventing successful AI adoption and developed proven solutions
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {challenges.map((challenge, index) => (
              <div key={index} className="bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-shadow">
                <div className="text-blue-600 mb-4">
                  {challenge.icon}
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-4">
                  {challenge.title}
                </h3>
                <p className="text-slate-600 mb-6">
                  {challenge.description}
                </p>
                <div className="border-t pt-6">
                  <h4 className="font-semibold text-green-700 mb-2">Our Solution:</h4>
                  <p className="text-slate-700 text-sm">
                    {challenge.solution}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Client Journey Timeline */}
      <div className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              Your AI Transformation Journey
            </h2>
            <p className="text-lg text-slate-600">
              Our proven methodology takes you from strategy to scaled implementation
            </p>
          </div>

          {/* Timeline Navigation */}
          <div className="flex flex-col lg:flex-row gap-8">
            <div className="lg:w-1/3">
              <div className="space-y-4">
                {clientJourney.map((phase, index) => (
                  <button
                    key={index}
                    onClick={() => setActivePhase(index)}
                    className={`w-full text-left p-4 rounded-lg transition-all ${
                      activePhase === index 
                        ? 'bg-blue-50 border-2 border-blue-500 shadow-md' 
                        : 'bg-slate-50 border-2 border-transparent hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-bold text-lg">{phase.phase}</h3>
                      <span className={`px-3 py-1 rounded-full text-sm text-white ${phase.color}`}>
                        {phase.duration}
                      </span>
                    </div>
                    <p className="text-slate-600 text-sm">{phase.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Timeline Content */}
            <div className="lg:w-2/3">
              <div className="bg-slate-50 rounded-xl p-8">
                <div className="flex items-center mb-6">
                  <div className={`w-12 h-12 rounded-full ${clientJourney[activePhase].color} flex items-center justify-center text-white font-bold text-lg mr-4`}>
                    {activePhase + 1}
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900">
                      {clientJourney[activePhase].phase}
                    </h3>
                    <p className="text-slate-600">
                      {clientJourney[activePhase].duration}
                    </p>
                  </div>
                </div>
                
                <p className="text-slate-700 mb-6 text-lg">
                  {clientJourney[activePhase].description}
                </p>

                <div>
                  <h4 className="font-semibold text-slate-900 mb-4">Key Deliverables:</h4>
                  <div className="grid md:grid-cols-2 gap-3">
                    {clientJourney[activePhase].deliverables.map((deliverable, idx) => (
                      <div key={idx} className="flex items-center">
                        <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                        <span className="text-slate-700">{deliverable}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Results Dashboard */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Proven Results Across Industries
            </h2>
            <p className="text-xl text-slate-300">
              19+ years delivering measurable AI transformations
            </p>
          </div>

          {/* Key Metrics */}
          <div className="grid md:grid-cols-4 gap-8 mb-16">
            {keyMetrics.map((metric, index) => (
              <div key={index} className="text-center">
                <div className="text-4xl md:text-5xl font-bold text-blue-400 mb-2">
                  {metric.value}
                </div>
                <div className="text-lg font-semibold mb-1">
                  {metric.label}
                </div>
                <div className="text-sm text-slate-400">
                  {metric.description}
                </div>
              </div>
            ))}
          </div>

          {/* Client Logos */}
          <div className="mb-12">
            <h3 className="text-xl font-semibold text-center mb-8">Trusted by Leading Organizations</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {clientLogos.map((client, index) => (
                <div key={index} className="bg-white bg-opacity-10 rounded-lg p-4 text-center">
                  <span className="text-white font-medium">{client}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Industries */}
          <div className="text-center">
            <h3 className="text-xl font-semibold mb-6">Industry Expertise</h3>
            <div className="flex flex-wrap justify-center gap-3">
              {industries.map((industry, index) => (
                <span key={index} className="bg-blue-600 px-4 py-2 rounded-full text-sm">
                  {industry}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConsultingOverview;