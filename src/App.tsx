import { useState, useCallback } from 'react';
import { MapPin, Wind, Info, Menu, X, Heart, Shield, Leaf } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Map } from '@/components/Map';
import { LocationSearch } from '@/components/LocationSearch';
import { RouteInfo } from '@/components/RouteInfo';
import { AirQualityPanel } from '@/components/AirQualityPanel';
import type { LatLng, Route, SearchLocation, TravelMode } from '@/types';
import { calculateMultipleRoutes } from '@/services/routing';
import { Toaster, toast } from 'sonner';

function App() {
  const [startPoint, setStartPoint] = useState<LatLng | null>(null);
  const [endPoint, setEndPoint] = useState<LatLng | null>(null);
  const [startAddress, setStartAddress] = useState('');
  const [endAddress, setEndAddress] = useState('');
  const [routes, setRoutes] = useState<Route[]>([]);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
  const [travelMode, setTravelMode] = useState<TravelMode>('foot');
  const [isCalculating, setIsCalculating] = useState(false);
  const [showAirQuality, setShowAirQuality] = useState(false);
  const [mapCenter, setMapCenter] = useState<LatLng>({ lat: 55.7558, lng: 37.6173 });
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const handleStartSelect = useCallback((location: SearchLocation) => {
    setStartPoint({ lat: location.lat, lng: location.lng });
    setMapCenter({ lat: location.lat, lng: location.lng });
  }, []);

  const handleEndSelect = useCallback((location: SearchLocation) => {
    setEndPoint({ lat: location.lat, lng: location.lng });
    setMapCenter({ lat: location.lat, lng: location.lng });
  }, []);

  const handleMapClick = useCallback((latlng: LatLng) => {
    if (!startPoint) {
      setStartPoint(latlng);
      setStartAddress(`${latlng.lat.toFixed(4)}, ${latlng.lng.toFixed(4)}`);
      toast.info('Point A set. Now select point B.');
    } else if (!endPoint) {
      setEndPoint(latlng);
      setEndAddress(`${latlng.lat.toFixed(4)}, ${latlng.lng.toFixed(4)}`);
      toast.success('Point B set!');
    }
  }, [startPoint, endPoint]);

  const calculateRoutes = useCallback(async () => {
    if (!startPoint || !endPoint) {
      toast.error('Please select point A and point B');
      return;
    }

    setIsCalculating(true);
    try {
      const calculatedRoutes = await calculateMultipleRoutes(startPoint, endPoint, travelMode);
      setRoutes(calculatedRoutes);
      setSelectedRouteIndex(0);

      if (calculatedRoutes.length > 0) {
        toast.success(`${calculatedRoutes.length} routes calculated`);
      }
    } catch (error) {
      toast.error('Failed to calculate routes');
      console.error(error);
    } finally {
      setIsCalculating(false);
    }
  }, [startPoint, endPoint, travelMode]);

  const clearRoute = useCallback(() => {
    setStartPoint(null);
    setEndPoint(null);
    setStartAddress('');
    setEndAddress('');
    setRoutes([]);
    setSelectedRouteIndex(0);
    toast.info('Route cleared');
  }, []);

  const swapPoints = useCallback(() => {
    const tempPoint = startPoint;
    const tempAddress = startAddress;
    setStartPoint(endPoint);
    setStartAddress(endAddress);
    setEndPoint(tempPoint);
    setEndAddress(tempAddress);
    if (routes.length > 0) {
      calculateRoutes();
    }
  }, [startPoint, endPoint, startAddress, endAddress, routes, calculateRoutes]);

  // Collect all air quality data from routes
  const allAirQualityData = routes.flatMap(r => 
    r.points.filter(p => p.airQuality).map(p => p.airQuality!)
  );

  return (
    <TooltipProvider>
      <div className="h-screen flex flex-col bg-gray-50">
        <Toaster position="top-center" />
        
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between z-[500] relative">
          <div className="flex items-center gap-3">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden">
                  <Menu size={20} />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80 p-0">
                <SidebarContent />
              </SheetContent>
            </Sheet>
            
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                <Leaf className="text-white" size={22} />
              </div>
              <div>
                <h1 className="font-bold text-xl text-gray-900">Safe Path</h1>
                <p className="text-xs text-gray-500">Clean routes for a healthier commute</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAirQuality(!showAirQuality)}
                  className={showAirQuality ? 'bg-green-50 border-green-300' : ''}
                >
                  <Wind size={16} className="mr-2" />
                  <span className="hidden sm:inline">
                    {showAirQuality ? 'Hide' : 'Show'} air quality
                  </span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Toggle air quality data on the map</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Info size={20} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Safe Path helps find routes with the best air quality</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </header>

        {/* Main content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar */}
          <aside className={`
            ${isSidebarOpen ? 'w-96' : 'w-0'}
            transition-all duration-300 ease-in-out
            bg-white border-r border-gray-200 overflow-y-auto
            hidden lg:block
          `}>
            <div className="p-4 space-y-4">
              {/* Route input */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <MapPin size={18} />
                  Route
                </h2>

                <div className="space-y-3">
                  <LocationSearch
                    label="From"
                    placeholder="Enter address or click on the map"
                    value={startAddress}
                    onChange={setStartAddress}
                    onSelect={handleStartSelect}
                    icon={<span className="text-green-600 font-bold">A</span>}
                  />

                  <div className="flex justify-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={swapPoints}
                      className="h-8 w-8 p-0 rounded-full"
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M4 6L8 2L12 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M12 10L8 14L4 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </Button>
                  </div>

                  <LocationSearch
                    label="To"
                    placeholder="Enter address or click on the map"
                    value={endAddress}
                    onChange={setEndAddress}
                    onSelect={handleEndSelect}
                    icon={<span className="text-red-600 font-bold">B</span>}
                  />
                </div>

                <div className="flex gap-2 mt-4">
                  <Button
                    onClick={calculateRoutes}
                    disabled={isCalculating || !startPoint || !endPoint}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    {isCalculating ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                        Calculating...
                      </>
                    ) : (
                      'Calculate Route'
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={clearRoute}
                    disabled={!startPoint && !endPoint}
                  >
                    Clear
                  </Button>
                </div>
              </div>

              {/* Route info */}
              <RouteInfo
                routes={routes}
                selectedIndex={selectedRouteIndex}
                onSelectRoute={setSelectedRouteIndex}
                travelMode={travelMode}
                onTravelModeChange={setTravelMode}
                isLoading={isCalculating}
              />

              {/* Air quality panel */}
              <AirQualityPanel location={startPoint || mapCenter} />

              {/* About */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4">
                <h3 className="font-semibold text-green-900 mb-2 flex items-center gap-2">
                  <Shield size={18} />
                  About Safe Path
                </h3>
                <p className="text-sm text-green-800 mb-3">
                  Safe Path analyzes real-time air quality and routes you through parks and
                  quiet streets, avoiding polluted highways.
                </p>
                <div className="flex items-center gap-2 text-xs text-green-700">
                  <Heart size={14} />
                  <span>Taking care of your health</span>
                </div>
              </div>
            </div>
          </aside>

          {/* Toggle sidebar button */}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="hidden lg:flex absolute left-0 top-1/2 -translate-y-1/2 z-[400] bg-white border border-gray-200 rounded-r-lg p-2 shadow-md hover:bg-gray-50"
            style={{ left: isSidebarOpen ? '24rem' : '0' }}
          >
            {isSidebarOpen ? <X size={16} /> : <Menu size={16} />}
          </button>

          {/* Map */}
          <main className="flex-1 relative">
            <Map
              center={mapCenter}
              zoom={13}
              startPoint={startPoint}
              endPoint={endPoint}
              routes={routes}
              selectedRouteIndex={selectedRouteIndex}
              onMapClick={handleMapClick}
              showAirQuality={showAirQuality}
              airQualityData={allAirQualityData}
            />

            {/* Mobile route info overlay */}
            {routes.length > 0 && (
              <div className="lg:hidden absolute bottom-4 left-4 right-4 z-[400]">
                <div className="bg-white rounded-lg shadow-lg p-4 max-h-48 overflow-y-auto">
                  <RouteInfo
                    routes={routes}
                    selectedIndex={selectedRouteIndex}
                    onSelectRoute={setSelectedRouteIndex}
                    travelMode={travelMode}
                    onTravelModeChange={setTravelMode}
                  />
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}

// Sidebar content for mobile
function SidebarContent() {
  return (
    <div className="p-4">
      <div className="flex items-center gap-2 mb-6">
        <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
          <Leaf className="text-white" size={22} />
        </div>
        <div>
          <h1 className="font-bold text-xl">Safe Path</h1>
          <p className="text-xs text-gray-500">Clean routes</p>
        </div>
      </div>
      <p className="text-sm text-gray-600">
        Use the desktop version for full functionality
      </p>
    </div>
  );
}

export default App;
