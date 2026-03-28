import { Info, Leaf, Menu, Wind } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface TopBarProps {
  showAirQuality: boolean;
  onToggleAirQuality: () => void;
  mobileSidebarContent: React.ReactNode;
}

export const TopBar = ({
  showAirQuality,
  onToggleAirQuality,
  mobileSidebarContent,
}: TopBarProps) => {
  return (
    <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between z-[500] relative">
      <div className="flex items-center gap-3">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="lg:hidden">
              <Menu size={20} />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[92vw] max-w-md p-0 overflow-y-auto">
            {mobileSidebarContent}
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
              onClick={onToggleAirQuality}
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
  );
};

export default TopBar;
