import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../firebaseClient';
import { useAuth } from '../context/AuthContext';

const TRIGGER_MESSAGES = {
    rainfall: { icon: '🌧️', event: 'Heavy Rainfall detected' },
    heat: { icon: '🌡️', event: 'Extreme Heat Wave declared' },
    flood: { icon: '🚨', event: 'Flood Alert issued' },
    platform_downtime: { icon: '📉', event: 'Platform downtime detected' },
    pollution: { icon: '😷', event: 'Hazardous Air Quality' },
};

export default function DisruptionAlert() {
    const { currentUser } = useAuth();
    const [alert, setAlert] = useState(null);
    const [visible, setVisible] = useState(false);
    const [seen, setSeen] = useState(new Set());

    useEffect(() => {
        console.log('[ALERT] Listener mounting for', currentUser?.uid);
        if (!currentUser || !db) return;

        // Listen for new GREEN payouts in real time
        const q = query(
            collection(db, 'payouts'),
            where('userId', '==', currentUser.uid),
            where('status', '==', 'paid'),
            orderBy('createdAt', 'desc'),
            limit(1)
        );

        const unsub = onSnapshot(q, (snapshot) => {
            if (snapshot.empty) return;

            const doc = snapshot.docs[0];
            const payout = { id: doc.id, ...doc.data() };

            // Only show if we haven't shown this payout before
            if (seen.has(payout.id)) return;

            const meta = TRIGGER_MESSAGES[payout.triggerType] || { icon: '⚡', event: 'Disruption detected' };

            setAlert({ ...payout, ...meta });
            setVisible(true);
            setSeen(prev => new Set([...prev, payout.id]));

            // Auto-dismiss after 8 seconds
            setTimeout(() => setVisible(false), 8000);
        });

        return () => unsub();
    }, [currentUser]);

    if (!visible || !alert) return null;

    return (
        <div className="fixed top-16 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
            <div className="pointer-events-auto w-full max-w-2xl"
                style={{ animation: 'slideDown 0.4s cubic-bezier(0.4,0,0.2,1)' }}>
                <div className="relative overflow-hidden rounded-2xl border border-green/40 shadow-2xl"
                    style={{ background: 'linear-gradient(135deg, #0a1f12, #0d2818)' }}>

                    {/* Animated top bar */}
                    <div className="h-0.5 bg-gradient-to-r from-green via-accent to-green
                          animate-pulse" />

                    <div className="flex items-center gap-4 px-5 py-4">
                        <div className="text-4xl flex-shrink-0">{alert.icon}</div>

                        <div className="flex-1 min-w-0">
                            <div className="font-mono text-xs text-green tracking-widest uppercase mb-1">
                // Auto-Payout Triggered
                            </div>
                            <div className="font-display text-lg font-bold text-white">
                                {alert.event} — {alert.city?.charAt(0).toUpperCase() + alert.city?.slice(1)}
                            </div>
                            <div className="text-sm text-gray-400 mt-0.5">
                                CLS verified · No claim required · Money moved automatically
                            </div>
                        </div>

                        <div className="text-right flex-shrink-0">
                            <div className="font-display text-3xl font-extrabold text-green">
                                +₹{alert.amount}
                            </div>
                            <div className="font-mono text-xs text-gray-500 mt-0.5">
                                CLS {alert.clsTier} · {alert.clsScore}/100
                            </div>
                        </div>

                        <button onClick={() => setVisible(false)}
                            className="text-gray-600 hover:text-white transition-colors ml-2 flex-shrink-0">
                            ✕
                        </button>
                    </div>
                </div>
            </div>

            <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-20px); }
          to   { opacity: 1; transform: none; }
        }
      `}</style>
        </div>
    );
}