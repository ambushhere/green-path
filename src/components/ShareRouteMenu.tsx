import { useState } from 'react';
import { Check, Copy, ExternalLink, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import type { LatLng, Route, TravelMode } from '@/types';
import { buildAppleMapsUrl, buildGoogleMapsUrl, buildShareText } from '@/services/share';

interface ShareRouteMenuProps {
  startPoint: LatLng;
  endPoint: LatLng;
  startAddress: string;
  endAddress: string;
  selectedRoute: Route;
  travelMode: TravelMode;
}

export const ShareRouteMenu = ({
  startPoint,
  endPoint,
  startAddress,
  endAddress,
  selectedRoute,
  travelMode,
}: ShareRouteMenuProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const text = buildShareText(startAddress, endAddress, selectedRoute, travelMode);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('Route details copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy to clipboard');
    }
  };

  const handleGoogleMaps = () => {
    const url = buildGoogleMapsUrl(startPoint, endPoint, travelMode);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleAppleMaps = () => {
    const url = buildAppleMapsUrl(startPoint, endPoint, travelMode);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
        <Share2 size={16} />
        Share Route
      </h3>
      <div className="flex flex-col gap-2">
        <Button
          variant="outline"
          className="w-full justify-start gap-2"
          onClick={handleCopy}
        >
          {copied ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
          {copied ? 'Copied!' : 'Copy route details'}
        </Button>

        <Button
          variant="outline"
          className="w-full justify-start gap-2"
          onClick={handleGoogleMaps}
        >
          <ExternalLink size={16} />
          Open in Google Maps
        </Button>

        <Button
          variant="outline"
          className="w-full justify-start gap-2"
          onClick={handleAppleMaps}
        >
          <ExternalLink size={16} />
          Open in Apple Maps
        </Button>
      </div>
    </div>
  );
};

export default ShareRouteMenu;

