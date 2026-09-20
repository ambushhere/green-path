import { useState } from 'react';
import { ChevronDown, ChevronUp, MapPin, Menu, X } from 'lucide-react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from 'sonner';
import { Map } from '@/components/Map';
import { Sidebar } from '@/components/Sidebar';
import { TopBar } from '@/components/TopBar';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useRoutePlanner } from '@/hooks/useRoutePlanner';
import { useIsDesktop } from '@/hooks/use-mobile';

function App() {
  const [showAirQuality, setShowAirQuality] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  // Collapsed by default. Expanded, the sheet covered two thirds of the map the
  // panel itself tells you to tap.
  const [isMobilePanelOpen, setIsMobilePanelOpen] = useState(false);

  const isDesktop = useIsDesktop();

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
    mapZoom,
    routeError,
    allAirQualityData,
    isAirQualityUnavailable,
    currentLocation,
    isLocating,
    detectedCity,
    setStartAddress,
    setEndAddress,
    setSelectedRouteIndex,
    handleTravelModeChange,
    handleStartSelect,
    handleEndSelect,
    handleMapClick,
    handleMarkerDrag,
    locateMe,
    useCurrentLocationAsStart,
    markMapMovedByUser,
    calculateRoutes,
    clearRoute,
    swapPoints,
  } = useRoutePlanner();

  // One instance only. Rendering the panel for both layouts at once duplicated
  // every air-quality request and gave mobile two separate gestures onto the same
  // content.
  const plannerPanel = (
    <Sidebar
      startAddress={startAddress}
      endAddress={endAddress}
      startPoint={startPoint}
      endPoint={endPoint}
      routes={routes}
      selectedRouteIndex={selectedRouteIndex}
      travelMode={travelMode}
      isCalculating={isCalculating}
      routeError={routeError}
      isAirQualityUnavailable={isAirQualityUnavailable}
      currentLocation={currentLocation}
      isLocating={isLocating}
      onStartAddressChange={setStartAddress}
      onEndAddressChange={setEndAddress}
      onStartSelect={handleStartSelect}
      onEndSelect={handleEndSelect}
      onCalculateRoutes={calculateRoutes}
      onClearRoute={clearRoute}
      onSwapPoints={swapPoints}
      onSelectRoute={setSelectedRouteIndex}
      onTravelModeChange={handleTravelModeChange}
      onUseCurrentLocation={useCurrentLocationAsStart}
      onLocate={locateMe}
    />
  );

  const sheetSummary = routes.length > 0
    ? `${routes.length} route${routes.length > 1 ? 's' : ''} found`
    : startPoint && endPoint
      ? 'Ready to find routes'
      : 'Plan your route';

  return (
    <ErrorBoundary>
      <TooltipProvider>
        <div className="flex h-dvh flex-col bg-gray-50">
          {/* Offset clears the header, which previously clipped the toast that
              carries the app's main piece of guidance. */}
          <Toaster position="top-center" offset={80} />

          <TopBar
            showAirQuality={showAirQuality}
            onToggleAirQuality={() => setShowAirQuality((value) => !value)}
            detectedCity={detectedCity}
          />

          <div className="flex flex-1 overflow-hidden">
            {isDesktop && (
              <aside
                className={`${
                  isSidebarOpen ? 'w-96' : 'w-0'
                } overflow-y-auto border-r border-gray-200 bg-white transition-all duration-300 ease-in-out`}
                aria-label="Route planner"
              >
                {plannerPanel}
              </aside>
            )}

            {isDesktop && (
              <button
                onClick={() => setIsSidebarOpen((value) => !value)}
                aria-label={isSidebarOpen ? 'Collapse the route planner' : 'Expand the route planner'}
                aria-expanded={isSidebarOpen}
                className="absolute top-1/2 z-[400] flex h-11 w-8 -translate-y-1/2 items-center justify-center rounded-r-lg border border-gray-300 bg-white shadow-md hover:bg-gray-50"
                style={{ left: isSidebarOpen ? '24rem' : '0' }}
              >
                {isSidebarOpen ? <X size={16} aria-hidden /> : <Menu size={16} aria-hidden />}
              </button>
            )}

            <main className="relative flex-1">
              <Map
                center={mapCenter}
                zoom={mapZoom}
                startPoint={startPoint}
                endPoint={endPoint}
                routes={routes}
                selectedRouteIndex={selectedRouteIndex}
                onMapClick={handleMapClick}
                onMarkerDrag={handleMarkerDrag}
                onUserMovedMap={markMapMovedByUser}
                showAirQuality={showAirQuality}
                airQualityData={allAirQualityData}
                currentLocation={currentLocation}
                onLocate={locateMe}
                isLocating={isLocating}
              />

              {!isDesktop && (
                <div className="absolute bottom-0 left-0 right-0 z-[400]">
                  <div className="safe-area-bottom rounded-t-2xl border-t border-gray-200 bg-white shadow-lg">
                    <button
                      onClick={() => setIsMobilePanelOpen((v) => !v)}
                      aria-expanded={isMobilePanelOpen}
                      aria-label={isMobilePanelOpen ? 'Collapse route planning panel' : 'Expand route planning panel'}
                      className="flex min-h-14 w-full items-center justify-between px-4 py-3"
                    >
                      <span className="flex items-center gap-2 text-gray-900">
                        <MapPin size={16} className="text-green-700" aria-hidden />
                        <span className="text-sm font-medium">{sheetSummary}</span>
                      </span>
                      {isMobilePanelOpen
                        ? <ChevronDown size={20} className="text-gray-600" aria-hidden />
                        : <ChevronUp size={20} className="text-gray-600" aria-hidden />}
                    </button>

                    {isMobilePanelOpen && (
                      <div className="max-h-[60vh] overflow-y-auto border-t border-gray-100">
                        {plannerPanel}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </main>
          </div>
        </div>
      </TooltipProvider>
    </ErrorBoundary>
  );
}

export default App;
