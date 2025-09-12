import React, { useState, useEffect, ChangeEvent } from 'react';

// Type definitions
interface FormData {
  fullName: string;
  email: string;
  company: string;
  title: string;
  revenue: string;
  challenge: string;
  phone: string;
}

interface StatCardProps {
  number: string;
  label: string;
  color?: string;
}

interface ValuePropProps {
  icon: string;
  title: string;
  description: string;
}

interface ResultCardProps {
  company: string;
  metric: string;
  description: string;
  color?: string;
}

interface FormSubmission extends FormData {
  timestamp: string;
  source: string;
  utm_campaign: string;
  utm_medium: string;
  utm_source: string;
}

const LandingPage: React.FC = () => {
  const [formData, setFormData] = useState<FormData>({
    fullName: '',
    email: '',
    company: '',
    title: '',
    revenue: '',
    challenge: '',
    phone: ''
  });
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [scrolled, setScrolled] = useState<boolean>(false);

  useEffect(() => {
    const handleScroll = (): void => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>): void => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (): Promise<void> => {
    if (!formData.fullName || !formData.email || !formData.company || !formData.title || !formData.phone) {
      alert('Please fill in all required fields.');
      return;
    }

    setIsSubmitting(true);

    // Simulate API call
    await new Promise<void>(resolve => setTimeout(resolve, 1500));

    // Store form data (in real implementation, send to your CRM/backend)
    const submission: FormSubmission = {
      ...formData,
      timestamp: new Date().toISOString(),
      source: 'Google Ads - AI Strategy Campaign',
      utm_campaign: 'ai-strategy-consulting',
      utm_medium: 'cpc',
      utm_source: 'google'
    };

    console.log('Lead captured:', submission);
    
    setIsSubmitting(false);
    setIsSubmitted(true);
  };

  const StatCard: React.FC<StatCardProps> = ({ number, label, color = "text-blue-400" }) => (
    <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6 text-center transform hover:scale-105 transition-all duration-300">
      <div className={`text-3xl font-bold ${color} mb-2`}>{number}</div>
      <div className="text-slate-300 text-sm">{label}</div>
    </div>
  );

  const ValueProp: React.FC<ValuePropProps> = ({ icon, title, description }) => (
    <div className="bg-white rounded-2xl p-8 shadow-xl border border-slate-200 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300">
      <div className="text-4xl mb-6">{icon}</div>
      <h3 className="text-xl font-bold text-slate-900 mb-4">{title}</h3>
      <p className="text-slate-600 leading-relaxed">{description}</p>
    </div>
  );

  const ResultCard: React.FC<ResultCardProps> = ({ company, metric, description, color = "text-emerald-400" }) => (
    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-all duration-300">
      <h4 className="text-lg font-semibold text-blue-300 mb-3">{company}</h4>
      <div className={`text-4xl font-bold ${color} mb-3`}>{metric}</div>
      <p className="text-slate-300 leading-relaxed">{description}</p>
    </div>
  );

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-8 text-center">
          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-4">Thank You!</h2>
          <p className="text-slate-300 mb-6">We'll contact you within 24 hours to schedule your AI transformation strategy session.</p>
          <p className="text-sm text-slate-400">
            Our team will prepare a custom assessment based on your specific challenges and industry.
          </p>
        </div>
      </div>
    );
  }

  const clientLogos: string[] = ['BNY Mellon', 'MAPFRE', 'Wolters Kluwer', 'US Navy'];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero Section */}
      <section className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 pt-20 pb-32">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left Content */}
            <div className="space-y-8">
              <div className="inline-flex items-center space-x-2 bg-blue-500/20 border border-blue-400/30 rounded-full px-4 py-2 text-blue-300 text-sm font-medium">
                <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></span>
                <span>Trusted by Fortune 50 Companies</span>
              </div>

              <h1 className="text-5xl lg:text-6xl font-bold text-white leading-tight">
                Enterprise AI Strategy That Delivers 
                <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent"> Measurable Results</span>
              </h1>

              <p className="text-xl text-slate-300 leading-relaxed">
                Join BNY Mellon, MAPFRE, and other industry leaders who've achieved $150M+ in operational savings through our proven BluePrint methodology.
              </p>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-4">
                <StatCard number="$150M+" label="Projected Savings" color="text-emerald-400" />
                <StatCard number="8-16" label="Weeks to ROI" color="text-blue-400" />
                <StatCard number="Fortune 50" label="Enterprise Clients" color="text-purple-400" />
              </div>

              {/* Trust Indicators */}
              <div className="flex flex-wrap items-center gap-6 pt-6">
                <span className="text-slate-400 text-sm font-medium">Trusted by:</span>
                <div className="flex flex-wrap gap-4">
                  {clientLogos.map((client: string) => (
                    <span key={client} className="bg-white/10 border border-white/20 rounded-lg px-3 py-1 text-white text-sm font-medium">
                      {client}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Form */}
            <div className="lg:pl-8">
              <div className="bg-white/95 backdrop-blur-sm rounded-3xl p-8 shadow-2xl border border-white/20">
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">Get Your AI Strategy Blueprint</h3>
                  <p className="text-slate-600">Schedule a consultation with our AI transformation experts</p>
                </div>

                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Full Name *</label>
                      <input
                        type="text"
                        name="fullName"
                        value={formData.fullName}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-0 transition-colors"
                        placeholder="John Smith"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Phone *</label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-0 transition-colors"
                        placeholder="(555) 123-4567"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Business Email *</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-0 transition-colors"
                      placeholder="john.smith@company.com"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Company *</label>
                      <input
                        type="text"
                        name="company"
                        value={formData.company}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-0 transition-colors"
                        placeholder="Company Name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Job Title *</label>
                      <input
                        type="text"
                        name="title"
                        value={formData.title}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-0 transition-colors"
                        placeholder="Chief Technology Officer"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Annual Revenue</label>
                    <select
                      name="revenue"
                      value={formData.revenue}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-0 transition-colors"
                    >
                      <option value="">Select Revenue Range</option>
                      <option value="100M-500M">$100M - $500M</option>
                      <option value="500M-1B">$500M - $1B</option>
                      <option value="1B-5B">$1B - $5B</option>
                      <option value="5B+">$5B+</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Primary AI Challenge</label>
                    <textarea
                      name="challenge"
                      value={formData.challenge}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-0 transition-colors resize-none"
                      placeholder="What's your biggest AI implementation challenge?"
                    />
                  </div>

                  <button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold py-4 px-8 rounded-xl hover:from-blue-700 hover:to-purple-700 transform hover:scale-105 transition-all duration-200 shadow-lg disabled:opacity-70 disabled:transform-none"
                  >
                    {isSubmitting ? (
                      <div className="flex items-center justify-center space-x-2">
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <span>Scheduling...</span>
                      </div>
                    ) : (
                      'Schedule Strategy Session'
                    )}
                  </button>
                </div>

                <div className="text-center mt-6">
                  <p className="text-xs text-slate-500">
                    🔒 Your information is secure and will only be used to contact you about AI strategy consulting.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Value Propositions */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">Why Enterprise Leaders Choose Our AI Strategy Consulting</h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              We've helped Fortune 50 companies transform their operations with AI, delivering measurable results in weeks, not years.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <ValueProp
              icon="🎯"
              title="Proven BluePrint Methodology"
              description="Our structured 8-16 week approach identifies high-impact AI use cases, assesses organizational readiness, and delivers measurable ROI before full implementation."
            />
            <ValueProp
              icon="🏆"
              title="Fortune 50 Track Record"
              description="Successfully delivered AI transformations for BNY Mellon ($150M savings), MAPFRE (35% efficiency gains), and other industry leaders across financial services and insurance."
            />
            <ValueProp
              icon="⚡"
              title="End-to-End AI Strategy"
              description="From strategic roadmap to implementation guidance, we ensure your AI initiatives align with business objectives and deliver sustainable competitive advantages."
            />
          </div>
        </div>
      </section>

      {/* Results Section */}
      <section className="py-24 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">Real AI Strategy Results from Real Clients</h2>
            <p className="text-xl text-slate-300 max-w-3xl mx-auto">
              Our AI strategy consulting has generated hundreds of millions in value for enterprise clients.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <ResultCard
              company="Investment Bank - AI Strategy & Roadmap"
              metric="$150M"
              description="Projected 5-year savings through comprehensive AI strategy for $48T asset management firm, including contact center optimization and predictive analytics roadmap."
              color="text-emerald-400"
            />
            <ResultCard
              company="Insurance Leader - Operational AI Strategy"
              metric="$80M"
              description="Efficiency improvements through AI strategy across underwriting, claims, and customer service operations with 35% faster processing implementation plan."
              color="text-blue-400"
            />
            <ResultCard
              company="Entertainment Company - AI Marketing Strategy"
              metric="$1M"
              description="Annual marketing optimization through customer lifetime value AI strategy and intelligent churn prediction model implementation."
              color="text-purple-400"
            />
            <ResultCard
              company="Multi-Family Investment - Data AI Strategy"
              metric="40%"
              description="Data processing efficiency improvement through modern AI-enabled analytics strategy and cloud architecture transformation roadmap."
              color="text-amber-400"
            />
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-4xl mx-auto text-center px-6">
          <h3 className="text-3xl font-bold text-white mb-4">Ready to Develop Your AI Strategy?</h3>
          <p className="text-xl text-blue-100 mb-8">
            Join the Fortune 50 companies transforming their operations with our proven AI strategy methodology.
          </p>
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="bg-white text-blue-600 font-semibold py-4 px-8 rounded-xl hover:bg-blue-50 transform hover:scale-105 transition-all duration-200 shadow-lg"
          >
            Get Your Strategy Session Now
          </button>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;