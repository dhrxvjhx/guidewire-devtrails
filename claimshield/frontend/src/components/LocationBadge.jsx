// Shows worker's current detected zone in the navbar.
// Communicates that "coverage follows you" — key UX message.

import { useLocationTracker } from '../hooks/useLocationTracker';

export default function LocationBadge() {
    const location = useLocationTracker();

    if (location.status === 'idle' || location.status === 'requesting') {
        return (
            <div className="hidden sm:flex items-center gap-1.5 font-mono text-xs text-gray-600">
                <span className="animate-pulse">⊙</span> locating...
            </div>
        );
    }

    if (location.status === 'denied' || location.status === 'error') {
        return null; // silent fail — don't nag the user
    }

    if (!location.pincode) {
        return (
            <div className="hidden sm:flex items-center gap-1.5 font-mono text-xs text-gray-600">
                <span>⊙</span> outside coverage zone
            </div>
        );
    }

    return (
        <div className="hidden sm:flex items-center gap-1.5 font-mono text-xs text-green"
            title={`Your location: ${location.ward} (${location.pincode}) — coverage is active here`}>
            <span>⊙</span>
            <span>{location.ward}</span>
            <span className="text-gray-600">· {location.pincode}</span>
        </div>
    );
}