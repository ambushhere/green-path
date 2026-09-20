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
    // Pass the geometry, not just the endpoints. Without it Google re-plans the
    // trip its own way and the chosen corridor is lost at the last step.
    const url = buildGoogleMapsUrl(startPoint, endPoint, travelMode, selectedRoute.points);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleAppleMaps = () => {
    const url = buildAppleMapsUrl(startPoint, endPoint, travelMode);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <section className="rounded-lg bg-white p-4 shadow-md" aria-labelledby="share-heading">
      <h3 id="share-heading" className="mb-3 flex items-center gap-2 font-semibold text-gray-900">
        <Share2 size={16} aria-hidden />
        Take this route with you
      </h3>
      <div className="flex flex-col gap-2">
        <Button
          variant="outline"
          className="h-11 w-full justify-start gap-2"
          onClick={handleCopy}
        >
          {copied ? <Check size={16} className="text-green-700" aria-hidden /> : <Copy size={16} aria-hidden />}
          {copied ? 'Copied' : 'Copy route details'}
        </Button>

        <Button
          variant="outline"
          className="h-11 w-full justify-start gap-2"
          onClick={handleGoogleMaps}
        >
          <ExternalLink size={16} aria-hidden />
          Open in Google Maps
        </Button>

        <Button
          variant="outline"
          className="h-11 w-full justify-start gap-2"
          onClick={handleAppleMaps}
        >
          <ExternalLink size={16} aria-hidden />
          Open in Apple Maps
        </Button>
      </div>

      {/* Say plainly which handoff keeps the route and which does not, rather than
          letting the visitor assume both do. */}
      <p className="mt-3 text-[11px] leading-relaxed text-gray-600">
        Google Maps keeps the path Safe Path chose. Apple Maps supports only a start
        and an end, so it will plan its own way between them.
      </p>
    </section>
  );
};

export default ShareRouteMenu;
