import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from 'sonner';
import { Map } from '@/components/Map';
import { RouteInfo } from '@/components/RouteInfo';
import { Sidebar } from '@/components/Sidebar';
import { TopBar } from '@/components/TopBar';
import { useRoutePlanner } from '@/hooks/useRoutePlanner';

function PlannerSidebar(props: {
  startAddress: string;
  endAddress: string;
  startPoint: { lat: number; lng: number } | null;
  endPoint: { lat: number; lng: number } | null;
  routes: ReturnType<typeof useRoutePlanner>['routes'];
  selectedRouteIndex: number;
  travelMode: ReturnType<typeof useRoutePlanner>['travelMode'];
  isCalculating: boolean;
  routeError: string | null;
  onStartAddressChange: (value: string) => void;
  onEndAddressChange: (value: string) => void;
  onStartSelect: ReturnType<typeof useRoutePlanner>['handleStartSelect'];
  onEndSelect: ReturnType<typeof useRoutePlanner>['handleEndSelect'];
  onCalculateRoutes: () => void;
  onClearRoute: () => void;
  onSwapPoints: () => void;
  onSelectRoute: (index: number) => void;
  onTravelModeChange: ReturnType<typeof useRoutePlanner>['handleTravelModeChange'];
}) {
  return (
    <Sidebar
      startAddress={props.startAddress}
      endAddress={props.endAddress}
      startPoint={props.startPoint}
      endPoint={props.endPoint}
      routes={props.routes}
      selectedRouteIndex={props.selectedRouteIndex}
      travelMode={props.travelMode}
      isCalculating={props.isCalculating}
      routeError={props.routeError}
      onStartAddressChange={props.onStartAddressChange}
      onEndAddressChange={props.onEndAddressChange}
      onStartSelect={props.onStartSelect}
      onEndSelect={props.onEndSelect}
      onCalculateRoutes={props.onCalculateRoutes}
      onClearRoute={props.onClearRoute}
      onSwapPoints={props.onSwapPoints}
      onSelectRoute={props.onSelectRoute}
      onTravelModeChange={props.onTravelModeChange}
    />
  );
}

function App() {
  const [showAirQuality, setShowAirQuality] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const {
    startPoint,
    endPoint,
    startAddress,
    endAddress,
    routes,
    selectedRouteIndex,
    travelMode,
    isCalculating,
    mapCenter,
    routeError,
    allAirQualityData,
    setStartAddress,
    setEndAddress,
    setSelectedRouteIndex,
    handleTravelModeChange,
    handleStartSelect,
    handleEndSelect,
    handleMapClick,
    calculateRoutes,
    clearRoute,
    swapPoints,
  } = useRoutePlanner();

  return (
    <TooltipProvider>
      <div className="h-screen flex flex-col bg-gray-50">
        <Toaster position="top-center" />

        <TopBar
          showAirQuality={showAirQuality}
          onToggleAirQuality={() => setShowAirQuality((value) => !value)}
          mobileSidebarContent={(
            <PlannerSidebar
              startAddress={startAddress}
              endAddress={endAddress}
              startPoint={startPoint}
              endPoint={endPoint}
              routes={routes}
              selectedRouteIndex={selectedRouteIndex}
              travelMode={travelMode}
              isCalculating={isCalculating}
              routeError={routeError}
              onStartAddressChange={setStartAddress}
              onEndAddressChange={setEndAddress}
              onStartSelect={handleStartSelect}
              onEndSelect={handleEndSelect}
              onCalculateRoutes={calculateRoutes}
              onClearRoute={clearRoute}
              onSwapPoints={swapPoints}
              onSelectRoute={setSelectedRouteIndex}
              onTravelModeChange={handleTravelModeChange}
            />
          )}
        />

        <div className="flex-1 flex overflow-hidden">
          <aside
            className={`${
              isSidebarOpen ? 'w-96' : 'w-0'
            } transition-all duration-300 ease-in-out bg-white border-r border-gray-200 overflow-y-auto hidden lg:block`}
          >
            <PlannerSidebar
              startAddress={startAddress}
              endAddress={endAddress}
              startPoint={startPoint}
              endPoint={endPoint}
              routes={routes}
              selectedRouteIndex={selectedRouteIndex}
              travelMode={travelMode}
              isCalculating={isCalculating}
              routeError={routeError}
              onStartAddressChange={setStartAddress}
              onEndAddressChange={setEndAddress}
              onStartSelect={handleStartSelect}
              onEndSelect={handleEndSelect}
              onCalculateRoutes={calculateRoutes}
              onClearRoute={clearRoute}
              onSwapPoints={swapPoints}
              onSelectRoute={setSelectedRouteIndex}
              onTravelModeChange={handleTravelModeChange}
            />
          </aside>

          <button
            onClick={() => setIsSidebarOpen((value) => !value)}
            className="hidden lg:flex absolute left-0 top-1/2 -translate-y-1/2 z-[400] bg-white border border-gray-200 rounded-r-lg p-2 shadow-md hover:bg-gray-50"
            style={{ left: isSidebarOpen ? '24rem' : '0' }}
          >
            {isSidebarOpen ? <X size={16} /> : <Menu size={16} />}
          </button>

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

            {routes.length > 0 && (
              <div className="lg:hidden absolute bottom-4 left-4 right-4 z-[400]">
                <div className="bg-white rounded-lg shadow-lg p-4 max-h-56 overflow-y-auto">
                  <RouteInfo
                    routes={routes}
                    selectedIndex={selectedRouteIndex}
                    onSelectRoute={setSelectedRouteIndex}
                    travelMode={travelMode}
                    onTravelModeChange={handleTravelModeChange}
                    isLoading={isCalculating}
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

export default App;
