import React, { useEffect, useState } from 'react';

const BUCKET_URL = "https://storage.googleapis.com/le-marais-intelligence-leads/daily_leads.json";

interface PELead {
  name: string;
  firm: string;
  role: string;
  ai_thesis: string;
  build_opportunity: string;
  linkedin_request: string;
}

interface BackendResponse {
  generated_at: string;
  lead_count: number;
  project_id: string;
  data: {
    leads: PELead[];
  };
}

const LeadsDashboard: React.FC = () => {
  const [report, setReport] = useState<BackendResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(BUCKET_URL)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch leads');
        return res.json();
      })
      .then(data => {
        setReport(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching PE leads:", err);
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Connection request copied!");
  };

  if (loading) return <div className="p-10 text-center">Scanning LinkedIn for PE Leaders...</div>;
  if (error) return <div className="p-10 text-center text-red-600">Error: {error}</div>;
  if (!report?.data?.leads) return <div className="p-10 text-center">No leads found</div>;

  return (
    <div className="max-w-6xl mx-auto p-6">
      <header className="mb-8 border-b pb-4 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Le Marais Intelligence</h1>
          <p className="text-slate-500 font-medium">Daily PE AI Prospecting Report</p>
        </div>
        <div className="text-right text-sm text-slate-400">
          <div>Last Scan: {new Date(report.generated_at).toLocaleString()}</div>
          <div className="text-xs mt-1">Total Leads: {report.lead_count}</div>
        </div>
      </header>

      <div className="grid gap-6">
        {report.data.leads.map((lead, idx) => (
          <div key={idx} className="bg-white border rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-indigo-600">{lead.name}</h3>
                  <p className="text-slate-700 font-semibold">{lead.role} @ {lead.firm}</p>
                </div>
                <span className="bg-indigo-50 text-indigo-700 text-xs font-bold px-3 py-1 rounded-full uppercase">
                  Operating Partner
                </span>
              </div>

              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div className="bg-slate-50 p-4 rounded-lg">
                  <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">AI Thesis</h4>
                  <p className="text-sm text-slate-600 italic">"{lead.ai_thesis}"</p>
                </div>
                <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-100">
                  <h4 className="text-xs font-bold text-emerald-600 uppercase mb-2">Build Opportunity</h4>
                  <p className="text-sm text-slate-700">{lead.build_opportunity}</p>
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-xs font-bold text-slate-400 uppercase">Personalized Connection Request</h4>
                  <button 
                    onClick={() => copyToClipboard(lead.linkedin_request)}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-bold hover:bg-indigo-50 px-3 py-1 rounded transition-colors"
                  >
                    COPY SCRIPT
                  </button>
                </div>
                <div className="bg-slate-900 text-slate-300 p-4 rounded text-sm font-mono leading-relaxed whitespace-pre-wrap">
                  {lead.linkedin_request}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LeadsDashboard;