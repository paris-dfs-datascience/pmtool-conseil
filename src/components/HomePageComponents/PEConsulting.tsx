import React, { useState } from 'react';

interface ServiceCard {
  id: string;
  title: string;
  icon: React.ReactNode;
  description: string;
  benefits: string[];
  targetAudience: 'portco' | 'pe' | 'both';
}

// Professional icon components
const StrategyIcon = () => (
  <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    <path d="M9 12h6m-6 4h6" />
  </svg>
);

const OperationsIcon = () => (
  <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
);

const DiligenceIcon = () => (
  <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8" />
    <path d="M21 21l-4.35-4.35" />
    <path d="M11 8v6l4 2" />
  </svg>
);

const GrowthIcon = () => (
  <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 3v18h18" />
    <path d="M18 17l-5-5-4 4-5-5" />
  </svg>
);

const ImplementationIcon = () => (
  <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
  </svg>
);

const PortfolioIcon = () => (
  <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="7" width="18" height="13" rx="2" />
    <path d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2" />
  </svg>
);

const AIConsultingSection: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'portco' | 'pe' | 'both'>('both');
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  const services: ServiceCard[] = [
    {
      id: 'ai-strategy',
      title: 'AI Strategy & Transformation',
      icon: <StrategyIcon />,
      description: 'Develop enterprise-grade AI strategies that align with business objectives and drive measurable outcomes across the investment lifecycle.',
      benefits: [
        'Comprehensive AI maturity assessments and capability mapping',
        'Multi-year transformation roadmaps with clear milestones',
        'Financial modeling and business case development'
      ],
      targetAudience: 'both'
    },
    {
      id: 'operational-excellence',
      title: 'Operational AI Integration',
      icon: <OperationsIcon />,
      description: 'Deploy AI-powered solutions that streamline operations, reduce costs, and create sustainable competitive advantages.',
      benefits: [
        'Process optimization and intelligent automation',
        'Operational efficiency improvement programs',
        'Cost structure optimization through AI enablement'
      ],
      targetAudience: 'portco'
    },
    {
      id: 'due-diligence',
      title: 'Technical Due Diligence',
      icon: <DiligenceIcon />,
      description: 'Rigorous technical assessment of AI capabilities, infrastructure, and strategic positioning for investment decisions.',
      benefits: [
        'Technology stack and architecture evaluation',
        'AI/ML capability and maturity assessment',
        'Risk analysis and mitigation strategy development'
      ],
      targetAudience: 'pe'
    },
    {
      id: 'value-creation',
      title: 'Value Creation Planning',
      icon: <GrowthIcon />,
      description: 'Design and execute AI-enabled value creation initiatives that accelerate growth and enhance enterprise value.',
      benefits: [
        'Revenue acceleration through AI-powered solutions',
        'Market positioning and differentiation strategies',
        'Margin expansion and efficiency opportunities'
      ],
      targetAudience: 'both'
    },
    {
      id: 'implementation',
      title: 'Implementation & Change Management',
      icon: <ImplementationIcon />,
      description: 'Full-cycle implementation support from vendor selection through deployment, adoption, and ongoing optimization.',
      benefits: [
        'Technology vendor evaluation and selection',
        'Enterprise change management and governance',
        'Executive and team capability development'
      ],
      targetAudience: 'portco'
    },
    {
      id: 'portfolio-optimization',
      title: 'Portfolio-Wide Optimization',
      icon: <PortfolioIcon />,
      description: 'Cross-portfolio insights and standardization to maximize return on AI investments and enable knowledge sharing.',
      benefits: [
        'Portfolio-wide AI benchmarking and analytics',
        'Center of excellence development and best practices',
        'Cross-portfolio synergy identification'
      ],
      targetAudience: 'pe'
    }
  ];

  const filteredServices = services.filter(
    service => activeTab === 'both' || service.targetAudience === activeTab || service.targetAudience === 'both'
  );

  return (
    <section className="py-24 px-4 bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-block mb-4">
            <span className="text-sm font-semibold text-blue-600 tracking-wide uppercase">
              Strategic AI Advisory
            </span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6 leading-tight">
            AI Advisory for Private Equity
          </h2>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto mb-10 leading-relaxed">
            Delivering strategic AI expertise to private equity firms and their portfolio companies, 
            driving operational excellence and sustainable value creation.
          </p>
          
          {/* Interactive Tabs */}
          <div className="inline-flex rounded-xl bg-white shadow-lg p-1.5 border border-slate-200">
            <button
              onClick={() => setActiveTab('pe')}
              className={`px-8 py-3.5 rounded-lg font-semibold transition-all duration-300 text-sm ${
                activeTab === 'pe'
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              PE Firms
            </button>
            <button
              onClick={() => setActiveTab('both')}
              className={`px-8 py-3.5 rounded-lg font-semibold transition-all duration-300 text-sm ${
                activeTab === 'both'
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              All Services
            </button>
            <button
              onClick={() => setActiveTab('portco')}
              className={`px-8 py-3.5 rounded-lg font-semibold transition-all duration-300 text-sm ${
                activeTab === 'portco'
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Portfolio Companies
            </button>
          </div>
        </div>

        {/* Services Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {filteredServices.map((service) => (
            <div
              key={service.id}
              onMouseEnter={() => setHoveredCard(service.id)}
              onMouseLeave={() => setHoveredCard(null)}
              className={`bg-white rounded-2xl p-8 border transition-all duration-300 cursor-pointer ${
                hoveredCard === service.id
                  ? 'border-slate-900 shadow-2xl transform -translate-y-2'
                  : 'border-slate-200 shadow-lg hover:shadow-xl'
              }`}
            >
              <div className={`w-16 h-16 rounded-xl flex items-center justify-center mb-6 transition-all duration-300 ${
                hoveredCard === service.id
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-700'
              }`}>
                {service.icon}
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3 leading-tight">
                {service.title}
              </h3>
              <p className="text-slate-600 mb-6 leading-relaxed">
                {service.description}
              </p>
              
              <div className={`overflow-hidden transition-all duration-500 ${
                hoveredCard === service.id ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
              }`}>
                <div className="border-t border-slate-200 pt-6">
                  <p className="text-sm font-semibold text-slate-900 mb-3 uppercase tracking-wide">
                    Key Deliverables
                  </p>
                  <ul className="space-y-3">
                    {service.benefits.map((benefit, idx) => (
                      <li key={idx} className="text-sm text-slate-600 flex items-start leading-relaxed">
                        <svg className="w-5 h-5 text-slate-900 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                        <span>{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              
              <div className="mt-6">
                <span className={`inline-block px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wide ${
                  service.targetAudience === 'pe'
                    ? 'bg-slate-100 text-slate-700'
                    : service.targetAudience === 'portco'
                    ? 'bg-slate-100 text-slate-700'
                    : 'bg-slate-100 text-slate-700'
                }`}>
                  {service.targetAudience === 'pe' ? 'PE Firms' : 
                   service.targetAudience === 'portco' ? 'Portfolio Companies' : 
                   'All Clients'}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* CTA Section */}
        <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-16 md:p-20 text-white shadow-2xl mb-20">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-40"></div>
          <div className="relative max-w-4xl mx-auto text-center">
            <div className="inline-block mb-6">
              <span className="text-sm font-semibold text-slate-400 tracking-wider uppercase">
                Strategic Partnership
              </span>
            </div>
            <h3 className="text-4xl md:text-5xl font-bold mb-8 leading-tight">
              Drive Value Through Strategic AI
            </h3>
            <p className="text-xl mb-12 text-slate-300 leading-relaxed max-w-2xl mx-auto">
              Partner with experienced advisors who understand both private equity dynamics 
              and enterprise AI transformation.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <button className="bg-white text-slate-900 px-10 py-5 rounded-xl font-semibold text-base hover:bg-slate-50 transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:-translate-y-1 w-full sm:w-auto">
                Schedule Consultation
              </button>
              <button className="border-2 border-white/20 text-white px-10 py-5 rounded-xl font-semibold text-base hover:bg-white/10 transition-all duration-300 w-full sm:w-auto">
                View Case Studies
              </button>
            </div>
          </div>
        </div>

        {/* Stats Section - Now at Bottom */}
        <div className="border-t border-slate-200 pt-16">
          <div className="text-center mb-12">
            <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Trusted by Leading Firms
            </h4>
            <p className="text-slate-600">Delivering measurable impact across the private equity ecosystem</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
            <div className="text-center p-6 rounded-xl bg-slate-50 border border-slate-100">
              <div className="text-5xl md:text-6xl font-bold text-slate-900 mb-3 tracking-tight">15</div>
              <div className="text-base font-semibold text-slate-700 mb-1">Portfolio Companies</div>
              <div className="text-sm text-slate-500">Successfully Advised</div>
            </div>
            <div className="text-center p-6 rounded-xl bg-slate-50 border border-slate-100">
              <div className="text-5xl md:text-6xl font-bold text-slate-900 mb-3 tracking-tight">$15B+</div>
              <div className="text-base font-semibold text-slate-700 mb-1">Average AUM</div>
              <div className="text-sm text-slate-500">Assets Under Management</div>
            </div>
            <div className="text-center p-6 rounded-xl bg-slate-50 border border-slate-100">
              <div className="text-5xl md:text-6xl font-bold text-slate-900 mb-3 tracking-tight">5</div>
              <div className="text-base font-semibold text-slate-700 mb-1">PE Partnerships</div>
              <div className="text-sm text-slate-500">Active Relationships</div>
            </div>
            <div className="text-center p-6 rounded-xl bg-slate-50 border border-slate-100">
              <div className="text-5xl md:text-6xl font-bold text-slate-900 mb-3 tracking-tight">92%</div>
              <div className="text-base font-semibold text-slate-700 mb-1">Client Retention</div>
              <div className="text-sm text-slate-500">Year-over-Year</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AIConsultingSection;