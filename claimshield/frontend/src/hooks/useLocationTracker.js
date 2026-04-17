// Tracks worker's real-time location using browser Geolocation API.
// Saves lat/lng + detected pincode to Firestore every time they open the app.
// This enables mobility-based payout eligibility — coverage follows the worker.

import { useEffect, useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebaseClient';
import { useAuth } from '../context/AuthContext';

// Pincode boundaries — centre coordinates + radius in km
// Used to detect which zone the worker is currently in
const PINCODE_CENTRES = {
    // Chennai
    '600001': { lat: 13.0827, lng: 80.2707, name: 'Chennai Central' },
    '600014': { lat: 13.0012, lng: 80.2565, name: 'Adyar' },
    '600020': { lat: 13.0201, lng: 80.2210, name: 'Saidapet' },
    '600028': { lat: 13.0418, lng: 80.2341, name: 'T Nagar' },
    '600029': { lat: 12.9750, lng: 80.2200, name: 'Velachery' },
    '600032': { lat: 12.9990, lng: 80.2707, name: 'Besant Nagar' },
    '600040': { lat: 13.0850, lng: 80.2101, name: 'Anna Nagar' },
    '600041': { lat: 13.0827, lng: 80.1710, name: 'Mogappair' },
    '600045': { lat: 12.9249, lng: 80.1000, name: 'Tambaram' },
    '600050': { lat: 12.9010, lng: 80.2280, name: 'Sholinganallur' },
    '600096': { lat: 12.9483, lng: 80.1952, name: 'Perumbakkam' },
    '600097': { lat: 12.9279, lng: 80.1947, name: 'Medavakkam' },
    '600116': { lat: 12.9350, lng: 80.2150, name: 'Pallikaranai' },
    // Mumbai
    '400025': { lat: 19.0178, lng: 72.8478, name: 'Dadar' },
    '400050': { lat: 19.0596, lng: 72.8295, name: 'Bandra West' },
    '400051': { lat: 19.0544, lng: 72.8406, name: 'Bandra East' },
    '400070': { lat: 19.0728, lng: 72.8826, name: 'Kurla' },
    // Hyderabad
    '500029': { lat: 17.3850, lng: 78.4867, name: 'Hyderabad Central' },
    '500034': { lat: 17.4435, lng: 78.3772, name: 'Madhapur' },
    '500072': { lat: 17.4849, lng: 78.3942, name: 'Kukatpally' },
    '500081': { lat: 17.4474, lng: 78.3762, name: 'HITEC City' },
    // Bengaluru
    '560034': { lat: 12.9352, lng: 77.6245, name: 'Koramangala' },
    '560068': { lat: 12.9698, lng: 77.7499, name: 'Whitefield' },
    '560076': { lat: 12.9591, lng: 77.6974, name: 'Marathahalli' },
};

// Haversine distance in km between two lat/lng points
function haversineKm(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2
        + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180)
        * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Find the nearest pincode centre to a lat/lng
function detectPincode(lat, lng) {
    let nearest = null;
    let minDist = Infinity;

    for (const [pincode, centre] of Object.entries(PINCODE_CENTRES)) {
        const dist = haversineKm(lat, lng, centre.lat, centre.lng);
        if (dist < minDist) {
            minDist = dist;
            nearest = { pincode, ...centre, distanceKm: dist };
        }
    }

    // Only return if within 5km — otherwise "unknown zone"
    return minDist <= 5 ? nearest : null;
}

export function useLocationTracker() {
    const { currentUser } = useAuth();
    const [locationState, setLocationState] = useState({
        status: 'idle',    // idle | requesting | granted | denied | error
        lat: null,
        lng: null,
        pincode: null,
        ward: null,
        distanceKm: null,
        lastUpdated: null,
    });

    useEffect(() => {
        if (!currentUser || !db) return;
        if (!navigator.geolocation) {
            setLocationState(s => ({ ...s, status: 'error' }));
            return;
        }

        setLocationState(s => ({ ...s, status: 'requesting' }));

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude: lat, longitude: lng } = position.coords;
                const detected = detectPincode(lat, lng);
                const now = new Date().toISOString();

                const update = {
                    lastKnownLat: lat,
                    lastKnownLng: lng,
                    lastKnownPincode: detected?.pincode || null,
                    lastKnownWard: detected?.ward || detected?.name || null,
                    lastLocationAt: now,
                };

                setLocationState({
                    status: 'granted',
                    lat, lng,
                    pincode: detected?.pincode || null,
                    ward: detected?.ward || detected?.name || null,
                    distanceKm: detected?.distanceKm || null,
                    lastUpdated: now,
                });

                // Save to Firestore — trigger engine reads this at payout time
                try {
                    await updateDoc(doc(db, 'users', currentUser.uid), update);
                } catch (err) {
                    console.warn('[LOCATION] Failed to save location:', err.message);
                }
            },
            (err) => {
                console.warn('[LOCATION] GPS denied:', err.message);
                setLocationState(s => ({ ...s, status: 'denied' }));
            },
            { timeout: 8000, maximumAge: 300000 } // cache for 5 min
        );
    }, [currentUser?.uid]);

    return locationState;
}