import React, { useState, useMemo, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import { AlertCircle, Users, DollarSign, Zap, TrendingUp, MapPin } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

// Component to update map view when data changes
const MapUpdater = ({ center, zoom }: { center: [number, number]; zoom: number }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
};

const LeafletCompetitiveIntel = () => {
  const [selectedMetric, setSelectedMetric] = useState('competitiveIntensity');
  const [selectedSpeedTier, setSelectedSpeedTier] = useState('1000');
  const [hoveredZip, setHoveredZip] = useState<string | null>(null);
  const [marketData, setMarketData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Comprehensive city/coordinate mapping for all ZIP codes
  const cityMap: Record<string, { city: string; lat: number; lon: number }> = {
    // South Dakota ZIPs
    '57103': { city: 'Sioux Falls', lat: 43.5460, lon: -96.7313 },
    '57104': { city: 'Sioux Falls South', lat: 43.5200, lon: -96.7313 },
    '57108': { city: 'Sioux Falls West', lat: 43.5460, lon: -96.7800 },
    
    // Oklahoma ZIPs
    '73505': { city: 'Lawton', lat: 34.6036, lon: -98.3959 },
    '73507': { city: 'Lawton East', lat: 34.6100, lon: -98.3700 },
    '73703': { city: 'Enid', lat: 36.3956, lon: -97.8784 },
    '74023': { city: 'Coweta', lat: 35.9512, lon: -95.6505 },
    '74062': { city: 'Oologah', lat: 36.4451, lon: -95.7097 },
    '74074': { city: 'Stillwater', lat: 36.1156, lon: -97.0584 },
    '74076': { city: 'Stillwater North', lat: 36.1400, lon: -97.0584 },
    '74085': { city: 'Stillwater', lat: 36.1156, lon: -97.0584 },
    '74445': { city: 'Okemah', lat: 35.4318, lon: -96.3053 },
    '74447': { city: 'Okmulgee', lat: 35.6234, lon: -95.9608 },
    '74456': { city: 'Tahlequah', lat: 35.9151, lon: -94.9700 },
    '74632': { city: 'Sapulpa West', lat: 35.9950, lon: -96.1500 },
    '74646': { city: 'Stroud', lat: 35.7495, lon: -96.6586 }
  };

  // Load all JSON files from public/data folder
  useEffect(() => {
    const loadMarketData = async () => {
      try {
        setIsLoading(true);
        
        const dataFiles = Object.keys(cityMap).map(zip => `${zip}.json`);
        const allData = [];
        let successCount = 0;
        let errorCount = 0;

        for (const filename of dataFiles) {
          try {
            const response = await fetch(`/data/${filename}`);
            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }
            const jsonData = await response.json();
            
            const cityInfo = cityMap[jsonData.zip_code] || { 
              city: `ZIP ${jsonData.zip_code}`, 
              lat: 35.5, 
              lon: -96.5 
            };
            
            allData.push({
              ...jsonData,
              ...cityInfo
            });
            successCount++;
          } catch (fileError) {
            errorCount++;
            console.warn(`Could not load ${filename}`);
          }
        }

        if (allData.length === 0) {
          throw new Error('No market data files could be loaded from /data/ folder. Make sure JSON files are in public/data/ folder.');
        }

        console.log(`Successfully loaded ${successCount} market files (${errorCount} failed)`);
        setMarketData(allData);
        setLoadError(null);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('Error loading market data:', errorMessage);
        setLoadError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    loadMarketData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const speedTiers = [
    { label: '300 Mbps', value: '300' },
    { label: '500 Mbps', value: '500' },
    { label: '1 Gig', value: '1000' },
    { label: '2+ Gig', value: '2000' }
  ];

  const metrics = [
    { label: 'Competitive Intensity', value: 'competitiveIntensity', icon: Users, description: 'Market saturation & competitor density' },
    { label: 'Price Pressure', value: 'pricePressure', icon: DollarSign, description: 'Aggressive pricing threats' },
    { label: 'Promotional Activity', value: 'promoActivity', icon: Zap, description: 'Active promotional campaigns' },
    { label: 'Market Opportunity', value: 'opportunity', icon: TrendingUp, description: 'Low competition zones' }
  ];

  const calculateMarketMetrics = (market: any) => {
    const speedTierNum = parseInt(selectedSpeedTier);
    
    let relevantOffers = market.offers.filter((o: any) => {
      if (speedTierNum === 300) return o.speed_mbps <= 300;
      if (speedTierNum === 500) return o.speed_mbps === 500;
      if (speedTierNum === 1000) return o.speed_mbps >= 900 && o.speed_mbps <= 1000;
      if (speedTierNum === 2000) return o.speed_mbps >= 2000;
      return false;
    });

    // Competitive Intensity: Spread across full 0-100 range
    // Your data shows 7-11 competitors, let's map this to full spectrum
    const competitorCount = market.competitors_found.length;
    let competitiveIntensity = 0;
    if (competitorCount >= 11) competitiveIntensity = 95;
    else if (competitorCount === 10) competitiveIntensity = 75;
    else if (competitorCount === 9) competitiveIntensity = 55;
    else if (competitorCount === 8) competitiveIntensity = 35;
    else if (competitorCount === 7) competitiveIntensity = 15;
    else if (competitorCount <= 6) competitiveIntensity = 5;
    
    // Price Pressure: Based on actual price ranges in your data
    const validPrices = relevantOffers.filter((o: any) => o.price > 0).map((o: any) => o.price);
    const avgPrice = validPrices.length > 0 
      ? validPrices.reduce((sum: number, p: number) => sum + p, 0) / validPrices.length 
      : 100;
    
    // Price pressure: lower prices = higher pressure, spread across full range
    let pricePressure = 0;
    if (avgPrice >= 110) pricePressure = 5;        // $110+ = very low pressure (green)
    else if (avgPrice >= 90) pricePressure = 15;   // $90-110 = low pressure
    else if (avgPrice >= 70) pricePressure = 35;   // $70-90 = moderate-low
    else if (avgPrice >= 55) pricePressure = 55;   // $55-70 = moderate
    else if (avgPrice >= 45) pricePressure = 70;   // $45-55 = high
    else if (avgPrice >= 35) pricePressure = 85;   // $35-45 = very high (red)
    else pricePressure = 95;                        // <$35 = critical (dark red)
    
    // Promotional Activity: Already 0-100% naturally granular - keep as is
    const promoOffers = relevantOffers.filter((o: any) => o.price === 0 || o.price < 30).length;
    const promoActivity = relevantOffers.length > 0 
      ? (promoOffers / relevantOffers.length) * 100 
      : 0;
    
    // Market Opportunity: Inverse of competitive intensity (now also full 0-100 range)
    const opportunity = 100 - competitiveIntensity;
    
    // Debug logging
    console.log(`${market.zip_code}: competitors=${competitorCount}, intensity=${competitiveIntensity}, avgPrice=${avgPrice.toFixed(2)}, pressure=${pricePressure}, promo=${promoActivity.toFixed(0)}%, opportunity=${opportunity}`);
    
    return {
      competitiveIntensity,
      pricePressure,
      promoActivity,
      opportunity,
      lowestPrice: validPrices.length > 0 ? Math.min(...validPrices) : 0,
      avgPrice: avgPrice.toFixed(0),
      competitorCount: market.competitors_found.length,
      offerCount: relevantOffers.length
    };
  };

  const getHeatColor = (value: number) => {
    // More granular color spectrum for better differentiation
    if (value >= 90) return '#dc2626';  // Dark Red - Critical
    if (value >= 80) return '#ef4444';  // Red - Very High
    if (value >= 70) return '#f97316';  // Orange - High
    if (value >= 60) return '#fb923c';  // Light Orange
    if (value >= 50) return '#fbbf24';  // Amber
    if (value >= 40) return '#eab308';  // Yellow
    if (value >= 30) return '#a3e635';  // Yellow-Green
    if (value >= 20) return '#84cc16';  // Lime
    if (value >= 10) return '#22c55e';  // Green
    return '#10b981';                    // Emerald - Very Low
  };

  const marketsWithMetrics = useMemo(() => {
    if (!marketData || marketData.length === 0) return [];
    return marketData.map((market: any) => ({
      ...market,
      metrics: calculateMarketMetrics(market)
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSpeedTier, marketData]);

  const selectedMetricInfo = metrics.find(m => m.value === selectedMetric) || metrics[0];

  const overallStats = useMemo(() => {
    if (!marketsWithMetrics || marketsWithMetrics.length === 0) {
      return {
        avgCompetitors: '0',
        avgPrice: '0',
        highestThreat: '0',
        mostPromotional: '0'
      };
    }
    const allMetrics = marketsWithMetrics.map((m: any) => m.metrics);
    return {
      avgCompetitors: (allMetrics.reduce((sum: number, m: any) => sum + m.competitorCount, 0) / allMetrics.length).toFixed(1),
      avgPrice: (allMetrics.reduce((sum: number, m: any) => sum + parseFloat(m.avgPrice), 0) / allMetrics.length).toFixed(0),
      highestThreat: Math.max(...allMetrics.map((m: any) => m.competitiveIntensity)).toFixed(0),
      mostPromotional: Math.max(...allMetrics.map((m: any) => m.promoActivity)).toFixed(0)
    };
  }, [marketsWithMetrics]);

  // Calculate map center
  const mapCenter: [number, number] = useMemo(() => {
    if (marketData.length === 0) return [36.5, -96.5];
    const avgLat = marketData.reduce((sum, m) => sum + m.lat, 0) / marketData.length;
    const avgLon = marketData.reduce((sum, m) => sum + m.lon, 0) / marketData.length;
    return [avgLat, avgLon];
  }, [marketData]);

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Geographic Competitive Intelligence</h1>
          <p className="text-gray-300">Market pressure across {marketData.length} territories</p>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 text-lg mb-2">Loading market data...</p>
            <p className="text-sm text-gray-500">Loading JSON files from /data/</p>
          </div>
        )}

        {/* Error State */}
        {loadError && (
          <div className="bg-red-50 border border-red-200 rounded-lg shadow-lg p-6 mb-6">
            <div className="flex items-center gap-3 mb-3">
              <AlertCircle className="text-red-600" size={24} />
              <h3 className="text-lg font-bold text-red-900">Error Loading Market Data</h3>
            </div>
            <p className="text-red-700 mb-2">{loadError}</p>
            <p className="text-sm text-red-600">
              Make sure JSON files are in the public/data/ folder for deployment.
            </p>
          </div>
        )}

        {/* Main Content - Only show if data loaded */}
        {!isLoading && !loadError && marketData.length > 0 && (
          <>
            {/* Stats Bar */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-5">
                <p className="text-blue-100 text-sm mb-1">Markets Analyzed</p>
                <p className="text-4xl font-bold text-white">{marketData.length}</p>
              </div>
              <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg p-5">
                <p className="text-green-100 text-sm mb-1">Avg Competitors</p>
                <p className="text-4xl font-bold text-white">{overallStats.avgCompetitors}</p>
              </div>
              <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-lg shadow-lg p-5">
                <p className="text-red-100 text-sm mb-1">Highest Threat</p>
                <p className="text-4xl font-bold text-white">{overallStats.highestThreat}%</p>
              </div>
              <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-lg shadow-lg p-5">
                <p className="text-yellow-100 text-sm mb-1">Avg Price</p>
                <p className="text-4xl font-bold text-white">${overallStats.avgPrice}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Map Section */}
              <div className="lg:col-span-2 bg-white rounded-xl shadow-2xl overflow-hidden">
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-4">
                  <h2 className="text-xl font-bold text-white">Market Heat Map - {selectedMetricInfo.label}</h2>
                  <p className="text-blue-100 text-sm">{selectedMetricInfo.description}</p>
                </div>
                
                <div style={{ height: '600px', width: '100%' }}>
                  <MapContainer 
                    center={mapCenter} 
                    zoom={7} 
                    style={{ height: '100%', width: '100%' }}
                    scrollWheelZoom={true}
                  >
                    <MapUpdater center={mapCenter} zoom={7} />
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    {marketsWithMetrics.map((market) => {
                      const metricValue = market.metrics[selectedMetric];
                      const color = getHeatColor(metricValue);
                      
                      return (
                        <CircleMarker
                          key={market.zip_code}
                          center={[market.lat, market.lon]}
                          radius={15}
                          fillColor={color}
                          color="#ffffff"
                          weight={3}
                          fillOpacity={hoveredZip === market.zip_code ? 0.9 : 0.8}
                          eventHandlers={{
                            mouseover: () => setHoveredZip(market.zip_code),
                            mouseout: () => setHoveredZip(null),
                          }}
                        >
                          <Popup>
                            <div style={{ padding: '8px' }}>
                              <h3 style={{ margin: '0 0 8px 0', fontWeight: 'bold' }}>{market.city}</h3>
                              <p style={{ margin: 0, color: '#666', fontSize: '12px' }}>{market.zip_code}</p>
                              <div style={{ marginTop: '12px' }}>
                                <div style={{ margin: '4px 0', fontSize: '13px' }}>
                                  <strong>{selectedMetricInfo.label}:</strong> {metricValue.toFixed(0)}%
                                </div>
                                <div style={{ margin: '4px 0', fontSize: '13px' }}>
                                  <strong>Competitors:</strong> {market.metrics.competitorCount}
                                </div>
                                <div style={{ margin: '4px 0', fontSize: '13px' }}>
                                  <strong>Avg Price:</strong> ${market.metrics.avgPrice}
                                </div>
                                <div style={{ margin: '4px 0', fontSize: '13px' }}>
                                  <strong>Lowest Price:</strong> {market.metrics.lowestPrice > 0 ? `$${market.metrics.lowestPrice}` : 'N/A'}
                                </div>
                              </div>
                            </div>
                          </Popup>
                        </CircleMarker>
                      );
                    })}
                  </MapContainer>
                </div>

                {/* Legend */}
                <div className="p-4 bg-gray-50 border-t border-gray-200">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-medium text-gray-700">Intensity Scale:</span>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{backgroundColor: '#10b981'}}></div>
                        <span className="text-xs text-gray-600">0-10</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{backgroundColor: '#22c55e'}}></div>
                        <span className="text-xs text-gray-600">10-20</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{backgroundColor: '#84cc16'}}></div>
                        <span className="text-xs text-gray-600">20-30</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{backgroundColor: '#eab308'}}></div>
                        <span className="text-xs text-gray-600">40-50</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{backgroundColor: '#f97316'}}></div>
                        <span className="text-xs text-gray-600">70-80</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{backgroundColor: '#dc2626'}}></div>
                        <span className="text-xs text-gray-600">90+</span>
                      </div>
                    </div>
                    <span className="text-xs text-gray-500">Click markers for details</span>
                  </div>
                </div>
              </div>

              {/* Controls Panel */}
              <div className="space-y-6">
                {/* Metric Selection */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Analysis Metric</h3>
                  <div className="space-y-3">
                    {metrics.map(metric => {
                      const Icon = metric.icon;
                      return (
                        <button
                          key={metric.value}
                          onClick={() => setSelectedMetric(metric.value)}
                          className={`w-full flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${
                            selectedMetric === metric.value
                              ? 'border-blue-500 bg-blue-50 shadow-md'
                              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          <div className={`p-2 rounded-lg ${
                            selectedMetric === metric.value ? 'bg-blue-500' : 'bg-gray-200'
                          }`}>
                            <Icon className={selectedMetric === metric.value ? 'text-white' : 'text-gray-600'} size={20} />
                          </div>
                          <div className="text-left">
                            <div className={`font-medium ${
                              selectedMetric === metric.value ? 'text-blue-700' : 'text-gray-900'
                            }`}>
                              {metric.label}
                            </div>
                            <div className="text-xs text-gray-500">{metric.description}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Speed Tier Selection */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Speed Tier</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {speedTiers.map(tier => (
                      <button
                        key={tier.value}
                        onClick={() => setSelectedSpeedTier(tier.value)}
                        className={`p-3 rounded-lg border-2 font-medium transition-all ${
                          selectedSpeedTier === tier.value
                            ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-md'
                            : 'border-gray-200 hover:border-gray-300 text-gray-700'
                        }`}
                      >
                        {tier.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Market Detail Panel */}
                {hoveredZip && (
                  <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl shadow-lg p-6 text-white">
                    {(() => {
                      const market = marketsWithMetrics.find(m => m.zip_code === hoveredZip);
                      if (!market) return null;
                      return (
                        <>
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <h3 className="text-2xl font-bold">{market.city}</h3>
                              <p className="text-gray-300 text-sm">{market.zip_code}</p>
                            </div>
                            <MapPin className="text-blue-400" size={24} />
                          </div>
                          
                          <div className="space-y-3 mb-4">
                            <div className="flex justify-between">
                              <span className="text-gray-300">{selectedMetricInfo.label}:</span>
                              <span className="font-bold text-xl">{market.metrics[selectedMetric].toFixed(0)}%</span>
                            </div>
                            <div className="w-full bg-gray-700 rounded-full h-2">
                              <div
                                className="h-2 rounded-full transition-all duration-500"
                                style={{
                                  width: `${market.metrics[selectedMetric]}%`,
                                  backgroundColor: getHeatColor(market.metrics[selectedMetric])
                                }}
                              ></div>
                            </div>
                          </div>

                          <div className="space-y-2 pt-4 border-t border-gray-700">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-300">Competitors:</span>
                              <span className="font-semibold">{market.metrics.competitorCount}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-300">Avg Price:</span>
                              <span className="font-semibold">${market.metrics.avgPrice}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-300">Lowest Price:</span>
                              <span className={`font-semibold ${market.metrics.lowestPrice < 30 ? 'text-red-400' : ''}`}>
                                {market.metrics.lowestPrice > 0 ? `$${market.metrics.lowestPrice}` : 'N/A'}
                              </span>
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default LeafletCompetitiveIntel;