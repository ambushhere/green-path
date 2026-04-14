import { useState } from 'react';
import { ChevronDown, ChevronUp, MapPin, Menu, X } from 'lucide-react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from 'sonner';
import { Map } from '@/components/Map';
import { Sidebar } from '@/components/Sidebar';
import { TopBar } from '@/components/TopBar';
import { ErrorBoundary } from '@/components/ErrorBoundary';
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
  const [isMobilePanelOpen, setIsMobilePanelOpen] = useState(true);

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
    <ErrorBoundary>
    <TooltipProvider>
      <div className="h-dvh flex flex-col bg-gray-50">
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

            {/* Mobile bottom sheet – always visible, collapses/expands */}
            <div className="lg:hidden absolute bottom-0 left-0 right-0 z-[400]">
              <div className="bg-white rounded-t-2xl shadow-lg border-t border-gray-100 safe-area-bottom">
                {/* Drag-handle indicator */}
                <div className="flex justify-center pt-2 pb-0">
                  <div className="w-8 h-1 bg-gray-300 rounded-full" />
                </div>

                {/* Toggle bar */}
                <button
                  onClick={() => setIsMobilePanelOpen((v) => !v)}
                  aria-expanded={isMobilePanelOpen}
                  aria-label={isMobilePanelOpen ? 'Collapse route planning panel' : 'Expand route planning panel'}
                  className="w-full px-4 py-2 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2 text-gray-800">
                    <MapPin size={16} className="text-green-600" />
                    <span className="font-medium text-sm">
                      {routes.length > 0
                        ? `${routes.length} route${routes.length > 1 ? 's' : ''} found`
                        : startPoint && endPoint
                          ? 'Ready to calculate'
                          : 'Plan your route'}
                    </span>
                  </div>
                  {isMobilePanelOpen
                    ? <ChevronDown size={18} className="text-gray-500" aria-label="Collapse" />
                    : <ChevronUp size={18} className="text-gray-500" aria-label="Expand" />}
                </button>

                {/* Collapsible body */}
                {isMobilePanelOpen && (
                  <div className="overflow-y-auto max-h-[60vh] border-t border-gray-100">
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
                  </div>
                )}
              </div>
            </div>
          </main>
        </div>
      </div>
    </TooltipProvider>
    </ErrorBoundary>
  );
}

export default App;
