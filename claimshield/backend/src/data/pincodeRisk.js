// Hyper-local pincode risk profiles for parametric insurance pricing.
//
// Risk data sourced from:
// - NDMA flood vulnerability reports (2015, 2021 Chennai floods)
// - IMD district rainfall data
// - Municipal corporation ward-level drainage assessments
// - Historical claim frequency (modelled)
//
// Each pincode has:
//   riskMultiplier  : premium adjustment factor (0.7x – 1.8x)
//   floodRisk       : LOW / MEDIUM / HIGH / VERY_HIGH
//   avgRainfallDays : historical rainy days per year
//   drainageScore   : 1 (poor) – 5 (excellent)
//   ward            : municipal ward name
//   knownHazards    : specific risks for this area

const PINCODE_RISK = {

  // ── CHENNAI ──────────────────────────────────────────────────────────────
  '600001': { city: 'chennai', ward: 'Chennai Central',    riskMultiplier: 1.05, floodRisk: 'LOW',       avgRainfallDays: 48, drainageScore: 4, knownHazards: []                          },
  '600002': { city: 'chennai', ward: 'Royapettah',         riskMultiplier: 1.15, floodRisk: 'MEDIUM',    avgRainfallDays: 52, drainageScore: 3, knownHazards: ['waterlogging']             },
  '600004': { city: 'chennai', ward: 'Nungambakkam',       riskMultiplier: 1.10, floodRisk: 'MEDIUM',    avgRainfallDays: 50, drainageScore: 3, knownHazards: []                          },
  '600010': { city: 'chennai', ward: 'Kodambakkam',        riskMultiplier: 1.20, floodRisk: 'MEDIUM',    avgRainfallDays: 54, drainageScore: 3, knownHazards: ['waterlogging']             },
  '600011': { city: 'chennai', ward: 'Mylapore',           riskMultiplier: 1.20, floodRisk: 'MEDIUM',    avgRainfallDays: 55, drainageScore: 3, knownHazards: ['coastal', 'waterlogging'] },
  '600014': { city: 'chennai', ward: 'Adyar',              riskMultiplier: 1.45, floodRisk: 'HIGH',      avgRainfallDays: 62, drainageScore: 2, knownHazards: ['river_proximity', 'flooding_2015'] },
  '600017': { city: 'chennai', ward: 'Alwarpet',           riskMultiplier: 1.15, floodRisk: 'MEDIUM',    avgRainfallDays: 51, drainageScore: 3, knownHazards: []                          },
  '600020': { city: 'chennai', ward: 'Saidapet',           riskMultiplier: 1.40, floodRisk: 'HIGH',      avgRainfallDays: 60, drainageScore: 2, knownHazards: ['low_lying', 'flooding_2015'] },
  '600024': { city: 'chennai', ward: 'Guindy',             riskMultiplier: 1.25, floodRisk: 'MEDIUM',    avgRainfallDays: 56, drainageScore: 3, knownHazards: ['industrial_runoff']        },
  '600028': { city: 'chennai', ward: 'T Nagar',            riskMultiplier: 1.20, floodRisk: 'MEDIUM',    avgRainfallDays: 53, drainageScore: 3, knownHazards: ['waterlogging']             },
  '600029': { city: 'chennai', ward: 'Velachery',          riskMultiplier: 1.70, floodRisk: 'VERY_HIGH', avgRainfallDays: 68, drainageScore: 1, knownHazards: ['flooding_2015', 'lake_overflow', 'low_lying'] },
  '600032': { city: 'chennai', ward: 'Besant Nagar',       riskMultiplier: 1.30, floodRisk: 'HIGH',      avgRainfallDays: 58, drainageScore: 2, knownHazards: ['coastal', 'cyclone_exposure'] },
  '600040': { city: 'chennai', ward: 'Anna Nagar',         riskMultiplier: 0.90, floodRisk: 'LOW',       avgRainfallDays: 44, drainageScore: 4, knownHazards: []                          },
  '600041': { city: 'chennai', ward: 'Mogappair',          riskMultiplier: 0.85, floodRisk: 'LOW',       avgRainfallDays: 42, drainageScore: 4, knownHazards: []                          },
  '600045': { city: 'chennai', ward: 'Tambaram',           riskMultiplier: 1.20, floodRisk: 'MEDIUM',    avgRainfallDays: 54, drainageScore: 3, knownHazards: ['waterlogging']             },
  '600050': { city: 'chennai', ward: 'Sholinganallur',     riskMultiplier: 1.50, floodRisk: 'HIGH',      avgRainfallDays: 63, drainageScore: 2, knownHazards: ['IT_corridor_flooding', 'lake_overflow'] },
  '600053': { city: 'chennai', ward: 'Perungudi',          riskMultiplier: 1.45, floodRisk: 'HIGH',      avgRainfallDays: 62, drainageScore: 2, knownHazards: ['lake_proximity']           },
  '600078': { city: 'chennai', ward: 'Ambattur',           riskMultiplier: 1.15, floodRisk: 'MEDIUM',    avgRainfallDays: 50, drainageScore: 3, knownHazards: ['industrial_area']          },
  '600083': { city: 'chennai', ward: 'Avadi',              riskMultiplier: 1.10, floodRisk: 'MEDIUM',    avgRainfallDays: 48, drainageScore: 3, knownHazards: []                          },
  '600096': { city: 'chennai', ward: 'Perumbakkam',        riskMultiplier: 1.75, floodRisk: 'VERY_HIGH', avgRainfallDays: 70, drainageScore: 1, knownHazards: ['flooding_2015', 'lake_overflow', 'poor_drainage'] },
  '600097': { city: 'chennai', ward: 'Medavakkam',         riskMultiplier: 1.60, floodRisk: 'VERY_HIGH', avgRainfallDays: 66, drainageScore: 1, knownHazards: ['flooding_2015', 'low_lying'] },
  '600100': { city: 'chennai', ward: 'Porur',              riskMultiplier: 1.25, floodRisk: 'MEDIUM',    avgRainfallDays: 55, drainageScore: 3, knownHazards: ['lake_proximity']           },
  '600116': { city: 'chennai', ward: 'Pallikaranai',       riskMultiplier: 1.80, floodRisk: 'VERY_HIGH', avgRainfallDays: 72, drainageScore: 1, knownHazards: ['marshland', 'flooding_2015', 'encroachment'] },

  // ── MUMBAI ───────────────────────────────────────────────────────────────
  '400001': { city: 'mumbai', ward: 'Fort',               riskMultiplier: 1.10, floodRisk: 'MEDIUM',    avgRainfallDays: 65, drainageScore: 3, knownHazards: []                          },
  '400011': { city: 'mumbai', ward: 'Mahalaxmi',          riskMultiplier: 1.30, floodRisk: 'HIGH',      avgRainfallDays: 70, drainageScore: 2, knownHazards: ['waterlogging']             },
  '400012': { city: 'mumbai', ward: 'Parel',              riskMultiplier: 1.25, floodRisk: 'MEDIUM',    avgRainfallDays: 68, drainageScore: 3, knownHazards: ['industrial_runoff']        },
  '400022': { city: 'mumbai', ward: 'Chembur',            riskMultiplier: 1.20, floodRisk: 'MEDIUM',    avgRainfallDays: 66, drainageScore: 3, knownHazards: []                          },
  '400025': { city: 'mumbai', ward: 'Dadar',              riskMultiplier: 1.35, floodRisk: 'HIGH',      avgRainfallDays: 71, drainageScore: 2, knownHazards: ['waterlogging', 'flooding_2005'] },
  '400050': { city: 'mumbai', ward: 'Bandra West',        riskMultiplier: 1.15, floodRisk: 'MEDIUM',    avgRainfallDays: 64, drainageScore: 3, knownHazards: []                          },
  '400051': { city: 'mumbai', ward: 'Bandra East',        riskMultiplier: 1.40, floodRisk: 'HIGH',      avgRainfallDays: 72, drainageScore: 2, knownHazards: ['low_lying', 'waterlogging'] },
  '400063': { city: 'mumbai', ward: 'Borivali',           riskMultiplier: 1.10, floodRisk: 'MEDIUM',    avgRainfallDays: 62, drainageScore: 3, knownHazards: []                          },
  '400070': { city: 'mumbai', ward: 'Kurla',              riskMultiplier: 1.55, floodRisk: 'HIGH',      avgRainfallDays: 74, drainageScore: 1, knownHazards: ['flooding_2005', 'low_lying', 'waterlogging'] },
  '400078': { city: 'mumbai', ward: 'Vikhroli',           riskMultiplier: 1.30, floodRisk: 'HIGH',      avgRainfallDays: 69, drainageScore: 2, knownHazards: ['creek_proximity']          },
  '400097': { city: 'mumbai', ward: 'Malad',              riskMultiplier: 1.20, floodRisk: 'MEDIUM',    avgRainfallDays: 65, drainageScore: 3, knownHazards: []                          },

  // ── HYDERABAD ─────────────────────────────────────────────────────────────
  '500001': { city: 'hyderabad', ward: 'Hyderabad Central', riskMultiplier: 1.10, floodRisk: 'MEDIUM',  avgRainfallDays: 42, drainageScore: 3, knownHazards: []                          },
  '500003': { city: 'hyderabad', ward: 'Secunderabad',      riskMultiplier: 1.15, floodRisk: 'MEDIUM',  avgRainfallDays: 44, drainageScore: 3, knownHazards: ['waterlogging']             },
  '500008': { city: 'hyderabad', ward: 'Himayatnagar',      riskMultiplier: 1.05, floodRisk: 'LOW',     avgRainfallDays: 40, drainageScore: 4, knownHazards: []                          },
  '500016': { city: 'hyderabad', ward: 'Somajiguda',        riskMultiplier: 1.10, floodRisk: 'MEDIUM',  avgRainfallDays: 42, drainageScore: 3, knownHazards: []                          },
  '500034': { city: 'hyderabad', ward: 'Madhapur',          riskMultiplier: 1.25, floodRisk: 'MEDIUM',  avgRainfallDays: 46, drainageScore: 3, knownHazards: ['IT_corridor_flooding']     },
  '500035': { city: 'hyderabad', ward: 'Jubilee Hills',     riskMultiplier: 0.90, floodRisk: 'LOW',     avgRainfallDays: 38, drainageScore: 4, knownHazards: []                          },
  '500072': { city: 'hyderabad', ward: 'Kukatpally',        riskMultiplier: 1.35, floodRisk: 'HIGH',    avgRainfallDays: 48, drainageScore: 2, knownHazards: ['waterlogging', 'low_lying'] },
  '500081': { city: 'hyderabad', ward: 'HITEC City',        riskMultiplier: 1.20, floodRisk: 'MEDIUM',  avgRainfallDays: 44, drainageScore: 3, knownHazards: ['IT_corridor_flooding']     },

  // ── BENGALURU ─────────────────────────────────────────────────────────────
  '560001': { city: 'bengaluru', ward: 'Bengaluru Central', riskMultiplier: 0.95, floodRisk: 'LOW',     avgRainfallDays: 36, drainageScore: 4, knownHazards: []                          },
  '560008': { city: 'bengaluru', ward: 'Malleshwaram',      riskMultiplier: 0.90, floodRisk: 'LOW',     avgRainfallDays: 34, drainageScore: 4, knownHazards: []                          },
  '560011': { city: 'bengaluru', ward: 'Jayanagar',         riskMultiplier: 0.95, floodRisk: 'LOW',     avgRainfallDays: 36, drainageScore: 4, knownHazards: []                          },
  '560034': { city: 'bengaluru', ward: 'Koramangala',       riskMultiplier: 1.20, floodRisk: 'MEDIUM',  avgRainfallDays: 42, drainageScore: 3, knownHazards: ['lake_overflow', 'waterlogging'] },
  '560037': { city: 'bengaluru', ward: 'HSR Layout',        riskMultiplier: 1.15, floodRisk: 'MEDIUM',  avgRainfallDays: 40, drainageScore: 3, knownHazards: ['lake_proximity']           },
  '560068': { city: 'bengaluru', ward: 'Whitefield',        riskMultiplier: 1.30, floodRisk: 'HIGH',    avgRainfallDays: 46, drainageScore: 2, knownHazards: ['lake_overflow', 'IT_corridor_flooding'] },
  '560076': { city: 'bengaluru', ward: 'Marathahalli',      riskMultiplier: 1.35, floodRisk: 'HIGH',    avgRainfallDays: 48, drainageScore: 2, knownHazards: ['lake_overflow', 'waterlogging'] },
  '560100': { city: 'bengaluru', ward: 'Bommanahalli',      riskMultiplier: 1.25, floodRisk: 'MEDIUM',  avgRainfallDays: 43, drainageScore: 3, knownHazards: ['waterlogging']             },
};

// ── Helper functions ──────────────────────────────────────────────────────────

// Get risk profile for a pincode — falls back to city default if unknown
function getPincodeRisk(pincode, city) {
  if (PINCODE_RISK[pincode]) return PINCODE_RISK[pincode];

  // Unknown pincode — return city-level default
  const CITY_DEFAULTS = {
    chennai:   { city: 'chennai',   ward: 'Unknown Ward', riskMultiplier: 1.15, floodRisk: 'MEDIUM', avgRainfallDays: 52, drainageScore: 3, knownHazards: [] },
    mumbai:    { city: 'mumbai',    ward: 'Unknown Ward', riskMultiplier: 1.20, floodRisk: 'MEDIUM', avgRainfallDays: 65, drainageScore: 3, knownHazards: [] },
    hyderabad: { city: 'hyderabad', ward: 'Unknown Ward', riskMultiplier: 1.10, floodRisk: 'MEDIUM', avgRainfallDays: 42, drainageScore: 3, knownHazards: [] },
    bengaluru: { city: 'bengaluru', ward: 'Unknown Ward', riskMultiplier: 0.95, floodRisk: 'LOW',    avgRainfallDays: 38, drainageScore: 4, knownHazards: [] },
  };
  return CITY_DEFAULTS[city] || CITY_DEFAULTS.chennai;
}

// Get all pincodes for a city (for dropdown population)
function getPincodesByCity(city) {
  return Object.entries(PINCODE_RISK)
    .filter(([, data]) => data.city === city)
    .map(([pincode, data]) => ({
      pincode,
      ward:           data.ward,
      floodRisk:      data.floodRisk,
      riskMultiplier: data.riskMultiplier,
      knownHazards:   data.knownHazards,
    }))
    .sort((a, b) => a.ward.localeCompare(b.ward));
}

// Get risk label for UI display
function getRiskLabel(floodRisk) {
  const labels = {
    LOW:       { label: 'Low Risk',       color: 'green'  },
    MEDIUM:    { label: 'Moderate Risk',  color: 'amber'  },
    HIGH:      { label: 'High Risk',      color: 'red'    },
    VERY_HIGH: { label: 'Very High Risk', color: 'red'    },
  };
  return labels[floodRisk] || labels.MEDIUM;
}

module.exports = { PINCODE_RISK, getPincodeRisk, getPincodesByCity, getRiskLabel };