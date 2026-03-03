import { useEffect, useRef, useState } from 'react';


const GEOJSON_URL = 'https://storage.googleapis.com/dqe-public-maps/sales-map.geojson';
const BATTLE_CARDS_URL = 'https://storage.googleapis.com/dqe-fiber-data/csv-battle-cards/dqe_prospects.json';

const getScoreColor = (score: number) => {
  if (score >= 80) return '#00C853';
  if (score >= 60) return '#FFD600';
  if (score >= 40) return '#FF6D00';
  return '#D32F2F';
};

const getScoreLabel = (score: number) => {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Fair';
  return 'Poor';
};

function useGoogleMaps(apiKey: string) {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (window.google?.maps?.Map) {
      setLoaded(true);
      return;
    }

    if (document.querySelector('script[src*="maps.googleapis.com"]')) {
      const check = setInterval(() => {
        if (window.google?.maps?.Map) { setLoaded(true); clearInterval(check); }
      }, 100);
      return () => clearInterval(check);
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&loading=async`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      const check = setInterval(() => {
        if (window.google?.maps?.Map) { setLoaded(true); clearInterval(check); }
      }, 50);
    };
    script.onerror = () => console.error('Failed to load Google Maps');
    document.head.appendChild(script);

    return () => { if (document.head.contains(script)) document.head.removeChild(script); };
  }, [apiKey]);

  return loaded;
}

export default function DQEBattleCardMap() {
  const mapRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [allBattleCards, setAllBattleCards] = useState<any[]>([]);
  const [scoreFilter, setScoreFilter] = useState<number[]>([0, 100]);
  const [showFiberRoutes, setShowFiberRoutes] = useState(true);
  const [scoreCounts, setScoreCounts] = useState({ excellent: 0, good: 0, fair: 0, poor: 0 });
  const [showJsonInput, setShowJsonInput] = useState(false);
  const [jsonInput, setJsonInput] = useState('');
  const battleCardMarkersRef = useRef<google.maps.Marker[]>([]);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const isUpdatingMarkersRef = useRef(false);
  const activeInfoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const mapsLoaded = useGoogleMaps(process.env.REACT_APP_GOOGLE_MAPS_API_KEY || '');

  const updateMarkersForViewport = (map: google.maps.Map, cards: any[], currentScoreFilter: number[]) => {
    if (isUpdatingMarkersRef.current || activeInfoWindowRef.current) return;

    isUpdatingMarkersRef.current = true;

    const bounds = map.getBounds();
    if (!bounds) {
      isUpdatingMarkersRef.current = false;
      return;
    }

    const filteredCards = cards.filter((card: any) => {
      const analysis = card.llm_analysis || {};
      const geocode = card.geocode_data || {};
      const score = analysis.overall_score || 0;

      if (score === 0 || score < currentScoreFilter[0] || score > currentScoreFilter[1]) return false;
      if (!geocode.latitude || !geocode.longitude) return false;

      return bounds.contains({ lat: geocode.latitude, lng: geocode.longitude });
    });

    const topCards = filteredCards
      .sort((a, b) => (b.llm_analysis?.overall_score || 0) - (a.llm_analysis?.overall_score || 0))
      .slice(0, 100);

    battleCardMarkersRef.current.forEach(m => m.setMap(null));
    battleCardMarkersRef.current = [];

    const markers: google.maps.Marker[] = [];

    for (const card of topCards) {
      const eyData = card.ey_file_data || {};
      const analysis = card.llm_analysis || {};
      const geocode = card.geocode_data || {};
      const score = analysis.overall_score || 0;

      const marker = new google.maps.Marker({
        position: { lat: geocode.latitude, lng: geocode.longitude },
        map,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: score >= 80 ? 10 : score >= 60 ? 8 : 6,
          fillColor: getScoreColor(score),
          fillOpacity: 0.9,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
        title: `${eyData.Name} - Score: ${score}`,
        zIndex: score >= 80 ? 1000 : score >= 60 ? 900 : 800,
      });

      marker.addListener('click', () => showBattleCardInfo(marker, card, map));
      markers.push(marker);
    }

    battleCardMarkersRef.current = markers;
    isUpdatingMarkersRef.current = false;
    console.log(`Showing ${markers.length} markers in current viewport (filtered from ${filteredCards.length} in view)`);
  };

  const showBattleCardInfo = (marker: google.maps.Marker, card: any, map: google.maps.Map) => {
    if (activeInfoWindowRef.current) activeInfoWindowRef.current.close();

    const eyData = card.ey_file_data || {};
    const analysis = card.llm_analysis || {};
    const geocode = card.geocode_data || {};
    const score = analysis.overall_score || 0;
    const cbData = card.connectbase_data || {};
    const dataConfidence = analysis.data_confidence || {};
    const icpFit = analysis.icp_fit || {};
    const businessAssessment = icpFit.business_assessment || {};
    const sales = analysis.sales_intelligence || {};
    const hubspot = card.hubspot_match || {};

    const infoContent = `
      <div style="max-width: 500px; max-height: 600px; overflow-y: auto; font-family: Arial, sans-serif;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 16px; margin: -12px -12px 12px -12px; border-radius: 4px 4px 0 0;">
          <h2 style="margin: 0 0 8px 0; font-size: 18px;">${eyData.Name || 'Unknown'}</h2>
          <div style="font-size: 32px; font-weight: bold; margin: 8px 0;">${score}/100</div>
          <div style="font-size: 13px; opacity: 0.9;">
            ${getScoreLabel(score)} • Priority: ${sales.priority_level?.toUpperCase() || 'N/A'}
          </div>
          <div style="font-size: 11px; opacity: 0.8; margin-top: 4px;">
            Confidence: ${(dataConfidence.confidence_score * 100).toFixed(0)}% × ICP: ${icpFit.icp_fit_score || 0}
          </div>
        </div>

        <details open style="margin-bottom: 12px; border: 1px solid #ddd; border-radius: 4px;">
          <summary style="background: #f5f5f5; padding: 10px; cursor: pointer; font-weight: bold; font-size: 14px;">📊 Location & Basic Info</summary>
          <div style="padding: 12px; font-size: 12px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 4px; font-weight: bold; width: 45%;">Address:</td><td style="padding: 4px;">${geocode.formatted_address || eyData.Address || 'N/A'}</td></tr>
              <tr><td style="padding: 4px; font-weight: bold;">Coordinates:</td><td style="padding: 4px; font-family: monospace; font-size: 11px;">${geocode.latitude?.toFixed(6)}, ${geocode.longitude?.toFixed(6)}</td></tr>
              <tr><td style="padding: 4px; font-weight: bold;">Geocode Status:</td><td style="padding: 4px;">
                <span style="background: ${geocode.geocode_status === 'success' ? '#4CAF50' : '#FF9800'}; color: white; padding: 2px 6px; border-radius: 3px; font-size: 10px;">
                  ${geocode.geocode_status || 'N/A'}
                </span>
              </td></tr>
              <tr><td style="padding: 4px; font-weight: bold;">Website:</td><td style="padding: 4px;"><a href="${eyData.Website}" target="_blank">${eyData.Website || 'N/A'}</a></td></tr>
              <tr><td style="padding: 4px; font-weight: bold;">Phone:</td><td style="padding: 4px;">${eyData.Phone || 'N/A'}</td></tr>
              <tr><td style="padding: 4px; font-weight: bold;">EY Employees:</td><td style="padding: 4px;">${eyData['No Of Employees'] || 'N/A'}</td></tr>
              <tr><td style="padding: 4px; font-weight: bold;">Est Telco Spend:</td><td style="padding: 4px; color: green; font-weight: bold;">${Number(eyData['Est Telco Spend'] || 0).toLocaleString()}</td></tr>
            </table>
          </div>
        </details>

        <details open style="margin-bottom: 12px; border: 1px solid #ddd; border-radius: 4px;">
          <summary style="background: #f5f5f5; padding: 10px; cursor: pointer; font-weight: bold; font-size: 14px;">✅ Data Confidence: ${(dataConfidence.confidence_score * 100).toFixed(0)}%</summary>
          <div style="padding: 12px; font-size: 12px;">
            <div style="background: #f9f9f9; padding: 8px; border-radius: 4px; margin-bottom: 8px;">
              <strong>Score Breakdown:</strong>
              <div style="margin-top: 4px;">
                <div style="display: flex; justify-content: space-between; margin: 4px 0;"><span>Business Status:</span><span style="font-weight: bold;">${(dataConfidence.business_status_points || 0).toFixed(2)}/0.40</span></div>
                <div style="display: flex; justify-content: space-between; margin: 4px 0;"><span>Employee Validation:</span><span style="font-weight: bold;">${(dataConfidence.employee_validation_points || 0).toFixed(2)}/0.40</span></div>
                <div style="display: flex; justify-content: space-between; margin: 4px 0;"><span>Source Quality:</span><span style="font-weight: bold;">${(dataConfidence.source_quality_points || 0).toFixed(2)}/0.20</span></div>
              </div>
            </div>
            <table style="width: 100%; margin-bottom: 8px;">
              <tr>
                <td style="padding: 4px; font-weight: bold; width: 50%;">Business Status:</td>
                <td style="padding: 4px;">
                  <span style="background: ${dataConfidence.business_status === 'operating' ? '#4CAF50' : '#FF9800'}; color: white; padding: 2px 8px; border-radius: 3px; font-size: 11px; text-transform: uppercase;">
                    ${dataConfidence.business_status || 'N/A'}
                  </span>
                </td>
              </tr>
              <tr><td style="padding: 4px; font-weight: bold;">Validated Employees:</td><td style="padding: 4px; font-weight: bold; color: #667eea;">${dataConfidence.validated_employee_count?.toLocaleString() || 'N/A'}</td></tr>
              <tr><td style="padding: 4px; font-weight: bold;">Employee Confidence:</td><td style="padding: 4px; text-transform: uppercase; font-size: 11px;">${dataConfidence.employee_count_confidence || 'N/A'}</td></tr>
              <tr><td style="padding: 4px; font-weight: bold;">Data Basis:</td><td style="padding: 4px; font-size: 11px;">${dataConfidence.employee_count_basis || 'N/A'}</td></tr>
              <tr><td style="padding: 4px; font-weight: bold;">Location Type:</td><td style="padding: 4px; text-transform: capitalize;">${dataConfidence.location_type || 'N/A'}</td></tr>
            </table>
            ${dataConfidence.business_status_evidence ? `<div style="margin-bottom: 8px; padding: 8px; background: #E3F2FD; border-left: 3px solid #2196F3;"><strong style="font-size: 11px;">Evidence:</strong><p style="margin: 4px 0 0 0; font-size: 11px; color: #555;">${dataConfidence.business_status_evidence}</p></div>` : ''}
            ${dataConfidence.employee_comparison ? `<div style="margin-bottom: 8px; padding: 8px; background: #F3E5F5; border-left: 3px solid #9C27B0;"><strong style="font-size: 11px;">Employee Count Comparison:</strong><p style="margin: 4px 0 0 0; font-size: 11px; color: #555;">${dataConfidence.employee_comparison}</p></div>` : ''}
            ${dataConfidence.employee_count_sources?.length > 0 ? `<div style="margin-top: 8px;"><strong style="font-size: 11px;">Sources:</strong><div style="margin-top: 4px;">${dataConfidence.employee_count_sources.map((s: string) => `<span style="display: inline-block; background: #E8F5E9; padding: 2px 6px; margin: 2px; border-radius: 3px; font-size: 10px;">${s}</span>`).join('')}</div></div>` : ''}
            ${dataConfidence.data_quality_notes ? `<div style="margin-top: 8px; padding: 8px; background: #FFF3E0; border-left: 3px solid #FF9800; font-size: 11px;"><strong>Data Quality Notes:</strong><br/>${dataConfidence.data_quality_notes}</div>` : ''}
          </div>
        </details>

        <details open style="margin-bottom: 12px; border: 1px solid #ddd; border-radius: 4px;">
          <summary style="background: #f5f5f5; padding: 10px; cursor: pointer; font-weight: bold; font-size: 14px;">🌐 DQE Network Data</summary>
          <div style="padding: 12px; font-size: 12px;">
            ${cbData.DQE_Site_Distance && cbData.DQE_Site_Distance !== 'NOT_FOUND' && cbData.DQE_Site_Distance !== 'N/A' ? `
              <table style="width: 100%; margin-bottom: 8px;">
                <tr><td style="padding: 4px; font-weight: bold; width: 50%;">Distance:</td><td style="padding: 4px;">${cbData.DQE_Site_Distance} feet</td></tr>
                <tr><td style="padding: 4px; font-weight: bold;">Connection Status:</td><td style="padding: 4px;">${cbData.DQE_Connection_Status || 'N/A'}</td></tr>
                <tr><td style="padding: 4px; font-weight: bold;">Network Status:</td><td style="padding: 4px;">${cbData.DQE_Network_Status || 'N/A'}</td></tr>
                <tr><td style="padding: 4px; font-weight: bold;">Access Medium:</td><td style="padding: 4px;">${cbData.DQE_Access_Medium || 'N/A'}</td></tr>
              </table>
              ${cbData.SITE_All_Competitors && cbData.SITE_All_Competitors !== 'N/A' ? `<div style="margin-top: 12px;"><strong style="font-size: 11px;">Competitors at Site:</strong><div style="margin-top: 4px; padding: 8px; background: #FFF3E0; border-radius: 4px; font-size: 11px;">${cbData.SITE_All_Competitors}</div></div>` : ''}
            ` : `<p style="color: #999; font-style: italic;">No DQE network data available</p>`}
          </div>
        </details>

        <details style="margin-bottom: 12px; border: 1px solid #ddd; border-radius: 4px;">
          <summary style="background: #f5f5f5; padding: 10px; cursor: pointer; font-weight: bold; font-size: 14px;">🎯 Business Assessment: ${icpFit.business_scale_need_points || 0}/80 pts</summary>
          <div style="padding: 12px; font-size: 12px;">
            <table style="width: 100%; margin-bottom: 8px;">
              <tr>
                <td style="padding: 4px; font-weight: bold; width: 50%;">Criticality:</td>
                <td style="padding: 4px;">
                  <span style="background: ${businessAssessment.business_criticality === 'high' ? '#D32F2F' : businessAssessment.business_criticality === 'moderate' ? '#FF9800' : '#666'}; color: white; padding: 2px 8px; border-radius: 3px; font-size: 11px; text-transform: uppercase; font-weight: bold;">
                    ${businessAssessment.business_criticality || 'N/A'}
                  </span>
                </td>
              </tr>
              <tr><td style="padding: 4px; font-weight: bold;">Bandwidth Need:</td><td style="padding: 4px; text-transform: uppercase;">${businessAssessment.bandwidth_requirements || 'N/A'}</td></tr>
              <tr><td style="padding: 4px; font-weight: bold;">Est. Monthly Spend:</td><td style="padding: 4px; font-weight: bold; color: green;">${businessAssessment.estimated_monthly_spend ? '$' + businessAssessment.estimated_monthly_spend.toLocaleString() : 'N/A'}</td></tr>
            </table>
            ${businessAssessment.criticality_reasoning ? `<div style="margin-bottom: 12px; padding: 10px; background: #F3E5F5; border-left: 3px solid #9C27B0; font-size: 11px; line-height: 1.5;"><strong>Why This Criticality:</strong><br/>${businessAssessment.criticality_reasoning}</div>` : ''}
            ${businessAssessment.infrastructure_needs?.length > 0 ? `<div style="margin-top: 8px;"><strong style="font-size: 11px;">Infrastructure Needs:</strong><ul style="margin: 4px 0; padding-left: 20px; font-size: 11px; line-height: 1.5;">${businessAssessment.infrastructure_needs.map((n: string) => `<li>${n}</li>`).join('')}</ul></div>` : ''}
            ${icpFit.icp_fit_summary ? `<div style="margin-top: 12px; padding: 10px; background: #E8EAF6; border-left: 3px solid #3F51B5; font-size: 11px; line-height: 1.5;"><strong>ICP Fit Summary:</strong><br/>${icpFit.icp_fit_summary}</div>` : ''}
          </div>
        </details>

        <details open style="margin-bottom: 12px; border: 1px solid #ddd; border-radius: 4px;">
          <summary style="background: #f5f5f5; padding: 10px; cursor: pointer; font-weight: bold; font-size: 14px;">💼 Sales Intelligence</summary>
          <div style="padding: 12px; font-size: 12px;">
            ${sales.priority_reasoning ? `<div style="margin-bottom: 12px; padding: 10px; background: #E3F2FD; border-left: 3px solid #2196F3; font-size: 11px; line-height: 1.5;"><strong>Priority Reasoning:</strong><br/>${sales.priority_reasoning}</div>` : ''}
            ${sales.key_selling_points?.length > 0 ? `<div style="margin-bottom: 12px;"><strong style="font-size: 11px;">Key Selling Points:</strong><ul style="margin: 4px 0; padding-left: 20px; font-size: 11px; line-height: 1.5;">${sales.key_selling_points.map((p: string) => `<li>${p}</li>`).join('')}</ul></div>` : ''}
            ${sales.likely_pain_points?.length > 0 ? `<div style="margin-bottom: 12px;"><strong style="font-size: 11px;">Likely Pain Points:</strong><ul style="margin: 4px 0; padding-left: 20px; font-size: 11px; line-height: 1.5; color: #d32f2f;">${sales.likely_pain_points.map((p: string) => `<li>${p}</li>`).join('')}</ul></div>` : ''}
            ${sales.competitive_angles?.length > 0 ? `<div style="margin-bottom: 12px;"><strong style="font-size: 11px;">Competitive Angles:</strong><ul style="margin: 4px 0; padding-left: 20px; font-size: 11px; line-height: 1.5;">${sales.competitive_angles.map((a: string) => `<li>${a}</li>`).join('')}</ul></div>` : ''}
            ${sales.data_gaps_to_resolve?.length > 0 ? `<div style="margin-bottom: 12px; padding: 8px; background: #FFF3E0; border-left: 3px solid #FF9800;"><strong style="font-size: 11px;">Data Gaps to Resolve:</strong><ul style="margin: 4px 0; padding-left: 20px; font-size: 11px;">${sales.data_gaps_to_resolve.map((g: string) => `<li>${g}</li>`).join('')}</ul></div>` : ''}
            ${sales.recommended_approach ? `<div style="margin-bottom: 12px;"><strong style="font-size: 11px;">Recommended Approach:</strong><p style="margin: 4px 0; font-size: 11px; line-height: 1.5; color: #555;">${sales.recommended_approach}</p></div>` : ''}
            ${sales.recommended_services?.length > 0 ? `<div style="margin-bottom: 12px;"><strong style="font-size: 11px;">Recommended Services:</strong><br/><div style="margin-top: 4px;">${sales.recommended_services.map((s: string) => `<span style="display: inline-block; background: #E3F2FD; padding: 4px 8px; margin: 2px; border-radius: 3px; font-size: 10px; font-weight: 500;">${s}</span>`).join('')}</div></div>` : ''}
            ${sales.next_best_actions?.length > 0 ? `<div style="margin-top: 12px; padding: 10px; background: #E8F5E9; border-left: 3px solid #4CAF50;"><strong style="font-size: 11px; color: #2E7D32;">Next Best Actions:</strong><ul style="margin: 4px 0; padding-left: 20px; font-size: 11px;">${sales.next_best_actions.map((a: string) => `<li>${a}</li>`).join('')}</ul></div>` : ''}
          </div>
        </details>

        <details style="margin-bottom: 12px; border: 1px solid #ddd; border-radius: 4px;">
          <summary style="background: #f5f5f5; padding: 10px; cursor: pointer; font-weight: bold; font-size: 14px;">🔌 ConnectBase Data</summary>
          <div style="padding: 12px; font-size: 12px;">
            ${cbData.API_EntityName === 'N/A' ? '<p style="color: #999; font-style: italic;">No ConnectBase data available</p>' : `
              <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 4px; font-weight: bold; width: 45%;">Entity:</td><td style="padding: 4px;">${cbData.API_EntityName || 'N/A'}</td></tr>
                <tr><td style="padding: 4px; font-weight: bold;">CB Employees:</td><td style="padding: 4px;">${Number(cbData.API_NoOfEmployees || 0).toLocaleString()}</td></tr>
                <tr><td style="padding: 4px; font-weight: bold;">Monthly Network Spend:</td><td style="padding: 4px; color: green; font-weight: bold;">${cbData.API_MonthlyNetworkSpend !== 'N/A' ? '$' + Number(cbData.API_MonthlyNetworkSpend || 0).toLocaleString() : 'N/A'}</td></tr>
                <tr><td style="padding: 4px; font-weight: bold;">Revenue:</td><td style="padding: 4px;">${cbData.API_Revenue !== 'N/A' ? '$' + Number(cbData.API_Revenue || 0).toLocaleString() : 'N/A'}</td></tr>
                <tr><td style="padding: 4px; font-weight: bold;">Industry:</td><td style="padding: 4px;">${cbData.API_Industry || 'N/A'}</td></tr>
                <tr><td style="padding: 4px; font-weight: bold;">Location Type:</td><td style="padding: 4px;">${cbData.API_LocationType || 'N/A'}</td></tr>
                <tr><td style="padding: 4px; font-weight: bold;">Total Locations:</td><td style="padding: 4px;">${cbData.API_LocationCount || 'N/A'}</td></tr>
              </table>
            `}
          </div>
        </details>

        ${card.additional_tenants?.length > 0 ? `
          <details style="margin-bottom: 12px; border: 1px solid #ddd; border-radius: 4px;">
            <summary style="background: #f5f5f5; padding: 10px; cursor: pointer; font-weight: bold; font-size: 14px;">🏢 Additional Tenants (${card.additional_tenants.length})</summary>
            <div style="padding: 12px; font-size: 11px;">
              <ul style="margin: 0; padding-left: 20px;">
                ${card.additional_tenants.slice(0, 10).map((t: string) => `<li>${t}</li>`).join('')}
                ${card.additional_tenants.length > 10 ? `<li style="color: #999;">... and ${card.additional_tenants.length - 10} more</li>` : ''}
              </ul>
            </div>
          </details>
        ` : ''}

        <details style="margin-bottom: 12px; border: 1px solid #ddd; border-radius: 4px;">
          <summary style="background: ${hubspot.matched ? '#E8F5E9' : '#f5f5f5'}; padding: 10px; cursor: pointer; font-weight: bold; font-size: 14px;">
            🟠 HubSpot CRM
            ${hubspot.matched
              ? `<span style="margin-left: 8px; background: #4CAF50; color: white; padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: bold;">MATCHED</span>`
              : `<span style="margin-left: 8px; background: #9E9E9E; color: white; padding: 2px 8px; border-radius: 10px; font-size: 10px;">NOT IN CRM</span>`
            }
          </summary>
          <div style="padding: 12px; font-size: 12px;">
            ${hubspot.matched ? `
              <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 4px; font-weight: bold; width: 45%;">CRM Name:</td><td style="padding: 4px;">${hubspot.hubspot_name || 'N/A'}</td></tr>
                <tr><td style="padding: 4px; font-weight: bold;">HubSpot ID:</td><td style="padding: 4px; font-family: monospace; font-size: 11px; color: #666;">${hubspot.hubspot_id || 'N/A'}</td></tr>
                <tr><td style="padding: 4px; font-weight: bold;">Owner ID:</td><td style="padding: 4px;">${hubspot.hubspot_owner_id || 'N/A'}</td></tr>
                <tr>
                  <td style="padding: 4px; font-weight: bold;">NetSuite Status:</td>
                  <td style="padding: 4px;">
                    ${hubspot.netsuite_status
                      ? `<span style="background: #E3F2FD; color: #1565C0; padding: 2px 8px; border-radius: 3px; font-size: 11px; font-weight: bold;">${hubspot.netsuite_status}</span>`
                      : '<span style="color: #999;">N/A</span>'
                    }
                  </td>
                </tr>
                <tr><td style="padding: 4px; font-weight: bold;">Last Contacted:</td><td style="padding: 4px;">${hubspot.notes_last_contacted ? new Date(hubspot.notes_last_contacted).toLocaleDateString() : 'N/A'}</td></tr>
                <tr><td style="padding: 4px; font-weight: bold;">Lead Source:</td><td style="padding: 4px;">${hubspot.lead_source || 'N/A'}</td></tr>
                <tr><td style="padding: 4px; font-weight: bold;">Lead Source Type:</td><td style="padding: 4px;">${hubspot.lead_source_type || 'N/A'}</td></tr>
                <tr>
                  <td style="padding: 4px; font-weight: bold;">Match Confidence:</td>
                  <td style="padding: 4px;">
                    <span style="background: ${hubspot.match_confidence === 'high' ? '#4CAF50' : '#FF9800'}; color: white; padding: 2px 8px; border-radius: 3px; font-size: 10px; text-transform: uppercase;">${hubspot.match_confidence || 'N/A'}</span>
                  </td>
                </tr>
              </table>
              ${hubspot.match_reason ? `<div style="margin-top: 8px; padding: 8px; background: #F1F8E9; border-left: 3px solid #8BC34A; font-size: 11px; color: #555;"><strong>Match Reason:</strong> ${hubspot.match_reason}</div>` : ''}
            ` : `
              <p style="color: #999; font-style: italic; margin: 0;">This company was not found in HubSpot CRM.</p>
              ${hubspot.match_reason ? `<p style="color: #bbb; font-size: 11px; margin: 6px 0 0 0;">${hubspot.match_reason}</p>` : ''}
            `}
          </div>
        </details>

      </div>
    `;

    const infowindow = new google.maps.InfoWindow({ content: infoContent, maxWidth: 550 });
    activeInfoWindowRef.current = infowindow;
    infowindow.addListener('closeclick', () => { activeInfoWindowRef.current = null; });
    infowindow.open(map, marker);
  };

  const loadBattleCards = async (map: google.maps.Map, data: any) => {
    console.log('Processing battle cards:', data.summary?.total_records || 0);
    const cards = data.battle_cards || [];
    setAllBattleCards(cards);

    const counts = { excellent: 0, good: 0, fair: 0, poor: 0 };
    cards.forEach((card: any) => {
      const score = card.llm_analysis?.overall_score || 0;
      if (score >= 80) counts.excellent++;
      else if (score >= 60) counts.good++;
      else if (score >= 40) counts.fair++;
      else if (score > 0) counts.poor++;
    });
    setScoreCounts(counts);

    updateMarkersForViewport(map, cards, scoreFilter);
    map.addListener('idle', () => updateMarkersForViewport(map, cards, scoreFilter));
    setLoading(false);
    console.log(`Battle cards loaded: ${cards.length} total`);
  };

  const initMap = (data?: any) => {
    if (!mapRef.current || !window.google?.maps?.Map) return;

    const map = new google.maps.Map(mapRef.current, {
      center: { lat: 40.4406, lng: -79.9959 },
      zoom: 10,
      mapTypeId: 'roadmap',
      mapTypeControl: true,
      streetViewControl: false,
      fullscreenControl: true,
    });

    mapInstanceRef.current = map;

    if (showFiberRoutes) {
      fetch(GEOJSON_URL)
        .then(r => r.json())
        .then(geojson => {
          map.data.addGeoJson(geojson);
          map.data.setStyle({ strokeColor: '#1967D2', strokeOpacity: 0.6, strokeWeight: 2, clickable: false });
        })
        .catch(err => console.error('Failed to load fiber routes:', err));
    }

    return map;
  };

  const handleJsonSubmit = () => {
    try {
      const data = JSON.parse(jsonInput);
      setShowJsonInput(false);
      setError(null);
      const map = initMap();
      if (map) loadBattleCards(map, data);
    } catch (err: any) {
      setError(`Invalid JSON: ${err.message}`);
    }
  };

  useEffect(() => {
    if (!mapsLoaded || !mapRef.current) return;

    console.log('Initializing map...');

    try {
      const map = initMap();
      if (!map) return;

      fetch(BATTLE_CARDS_URL)
        .then(response => {
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          return response.json();
        })
        .then(data => loadBattleCards(map, data))
        .catch(err => {
          console.error('Failed to load battle cards:', err);
          setError(`CORS Error: Cannot load from GCS bucket. Click "Load JSON Manually" to paste data.`);
          setLoading(false);
          setShowJsonInput(true);
        });

    } catch (err: any) {
      console.error('Map initialization error:', err);
      setError(`Map initialization failed: ${err.message}`);
      setLoading(false);
    }
  }, [mapsLoaded, showFiberRoutes]);

  const filterByScore = (min: number, max: number) => {
    setScoreFilter([min, max]);
    if (activeInfoWindowRef.current) {
      activeInfoWindowRef.current.close();
      activeInfoWindowRef.current = null;
    }
    if (mapInstanceRef.current && allBattleCards.length > 0) {
      updateMarkersForViewport(mapInstanceRef.current, allBattleCards, [min, max]);
    }
  };

  return (
    <div style={{ width: '100%', height: '100vh', position: 'relative' }}>
      {loading && !showJsonInput && (
        <div style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          zIndex: 1000, background: 'white', padding: '24px', borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)', textAlign: 'center'
        }}>
          <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px' }}>Loading Battle Cards...</div>
          <div style={{ fontSize: '13px', color: '#666' }}>Processing geocoded data and scoring...</div>
        </div>
      )}

      {showJsonInput && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', zIndex: 2000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
        }}>
          <div style={{ background: 'white', borderRadius: '8px', padding: '24px', maxWidth: '800px', width: '100%', maxHeight: '90vh', overflow: 'auto' }}>
            <h2 style={{ margin: '0 0 16px 0' }}>Load Battle Cards JSON</h2>
            <p style={{ marginBottom: '16px', color: '#666', fontSize: '14px' }}>
              Paste your JSON data from the dqe_prospects.json file below:
            </p>
            <textarea
              value={jsonInput}
              onChange={e => setJsonInput(e.target.value)}
              placeholder='{"summary": {...}, "battle_cards": [...]}'
              style={{
                width: '100%', height: '400px', padding: '12px',
                fontFamily: 'monospace', fontSize: '12px',
                border: '2px solid #ddd', borderRadius: '4px',
                resize: 'vertical', marginBottom: '16px'
              }}
            />
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={handleJsonSubmit}
                disabled={!jsonInput}
                style={{
                  flex: 1, padding: '12px',
                  background: jsonInput ? '#4CAF50' : '#ccc',
                  color: 'white', border: 'none', borderRadius: '4px',
                  fontSize: '14px', fontWeight: 'bold',
                  cursor: jsonInput ? 'pointer' : 'not-allowed'
                }}
              >
                Load Data
              </button>
              <button
                onClick={() => { setShowJsonInput(false); setError(null); }}
                style={{ padding: '12px 24px', background: '#666', color: 'white', border: 'none', borderRadius: '4px', fontSize: '14px', cursor: 'pointer' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {error && !showJsonInput && (
        <div style={{
          position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)',
          background: '#f44336', color: 'white', padding: '12px 24px',
          borderRadius: '4px', zIndex: 1000, boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
          maxWidth: '80%', textAlign: 'center'
        }}>
          <div>⚠️ {error}</div>
          <button
            onClick={() => setShowJsonInput(true)}
            style={{ marginTop: '8px', padding: '6px 12px', background: 'white', color: '#f44336', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
          >
            Load JSON Manually
          </button>
        </div>
      )}

      {!loading && !error && (
        <div style={{
          position: 'absolute', top: 20, right: 20, background: 'white',
          padding: '16px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          fontSize: '13px', zIndex: 1000, minWidth: '280px'
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '12px', fontSize: '16px', borderBottom: '2px solid #667eea', paddingBottom: '8px' }}>
            DQE Battle Cards
          </div>
          <div style={{ marginBottom: '12px', fontSize: '12px', color: '#666' }}>
            Total Prospects: <strong>{allBattleCards.length}</strong>
          </div>
          <div style={{ marginBottom: '12px', fontSize: '12px' }}><strong>Filter by Score:</strong></div>

          {[
            { label: 'Excellent (80-100)', min: 80, max: 100, color: '#00C853', bg: '#E8F5E9', count: scoreCounts.excellent, textColor: '#00C853' },
            { label: 'Good (60-79)', min: 60, max: 79, color: '#FFD600', bg: '#FFFDE7', count: scoreCounts.good, textColor: '#F57F17' },
            { label: 'Fair (40-59)', min: 40, max: 59, color: '#FF6D00', bg: '#FFF3E0', count: scoreCounts.fair, textColor: '#FF6D00' },
            { label: 'Poor (0-39)', min: 1, max: 39, color: '#D32F2F', bg: '#FFEBEE', count: scoreCounts.poor, textColor: '#D32F2F' },
          ].map(({ label, min, max, color, bg, count, textColor }) => (
            <div
              key={label}
              onClick={() => filterByScore(min, max)}
              style={{ display: 'flex', alignItems: 'center', padding: '8px', marginBottom: '6px', cursor: 'pointer', borderRadius: '4px', background: bg, border: `2px solid ${color}` }}
            >
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: color, marginRight: '10px', border: '2px solid white', boxShadow: '0 0 0 1px rgba(0,0,0,0.2)' }} />
              <span style={{ flex: 1 }}>{label}</span>
              <span style={{ fontWeight: 'bold', color: textColor }}>{count}</span>
            </div>
          ))}

          <button
            onClick={() => filterByScore(0, 100)}
            style={{ width: '100%', padding: '8px', background: '#667eea', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold', marginBottom: '12px' }}
          >
            Show All
          </button>

          <div
            onClick={() => setShowFiberRoutes(!showFiberRoutes)}
            style={{ display: 'flex', alignItems: 'center', padding: '8px', cursor: 'pointer', borderRadius: '4px', background: showFiberRoutes ? '#E3F2FD' : '#f5f5f5', border: `2px solid ${showFiberRoutes ? '#1967D2' : '#ddd'}` }}
          >
            <input type="checkbox" checked={showFiberRoutes} readOnly style={{ marginRight: '8px' }} />
            <span style={{ fontSize: '12px' }}>Show Fiber Routes</span>
          </div>
        </div>
      )}

      <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}