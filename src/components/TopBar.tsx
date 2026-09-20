import { Leaf, MapPin, Wind } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface TopBarProps {
  showAirQuality: boolean;
  onToggleAirQuality: () => void;
  /** City resolved from the visitor's IP, shown so the starting view is explained. */
  detectedCity?: string | null;
}

export const TopBar = ({
  showAirQuality,
  onToggleAirQuality,
  detectedCity,
}: TopBarProps) => {
  return (
    <header className="relative z-[500] flex items-center justify-between gap-3 border-b border-gray-200 bg-white px-4 py-3 safe-area-top">
      <div className="flex min-w-0 items-center gap-2">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-green-700">
          <Leaf className="text-white" size={22} aria-hidden />
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold text-gray-900">Safe Path</h1>
          {detectedCity ? (
            <p className="flex items-center gap-1 truncate text-xs text-gray-600">
              <MapPin size={11} aria-hidden />
              Showing {detectedCity}
            </p>
          ) : (
            <p className="truncate text-xs text-gray-600">Clean routes for a healthier commute</p>
          )}
        </div>
      </div>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            onClick={onToggleAirQuality}
            aria-pressed={showAirQuality}
            // The label is on the button itself, not only in the tooltip, because a
            // tooltip never opens on a touch device.
            aria-label={showAirQuality ? 'Hide air quality on the map' : 'Show air quality on the map'}
            className={`h-11 flex-shrink-0 px-3 ${showAirQuality ? 'border-green-400 bg-green-50 text-green-900' : ''}`}
          >
            <Wind size={16} className="sm:mr-2" aria-hidden />
            <span className="hidden sm:inline">
              {showAirQuality ? 'Hide' : 'Show'} air quality
            </span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Overlay measured air quality on the map</p>
        </TooltipContent>
      </Tooltip>
    </header>
  );
};

export default TopBar;
