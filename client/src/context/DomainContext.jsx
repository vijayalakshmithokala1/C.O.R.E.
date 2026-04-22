import { createContext, useContext, useState, useEffect } from 'react';

const DomainContext = createContext();

const DOMAINS = {
  HOSPITAL: {
    label: 'Hospital',
    patient: 'Patient',
    patients: 'Patients',
    medical: 'Medical',
    doctor: 'Doctor',
    nurse: 'Nurse',
    ward: 'Ward',
    receptionist: 'Receptionist',
    discharge: 'Discharge',
    discharging: 'Discharging',
    floors: ['Ground Floor', 'Floor 1', 'Floor 2', 'Floor 3', 'Floor 4', 'Floor 5']
  },
  HOTEL: {
    label: 'Hotel',
    patient: 'Guest',
    patients: 'Guests',
    medical: 'Maintenance',
    doctor: 'Manager',
    nurse: 'Security',
    ward: 'Section',
    receptionist: 'Front Desk',
    discharge: 'Check-Out',
    discharging: 'Checking Out',
    floors: ['Lobby', 'Basement', 'Floor 1', 'Floor 2', 'Roof']
  },
  AIRPORT: {
    label: 'Airport',
    patient: 'Passenger',
    patients: 'Passengers',
    medical: 'Operations',
    doctor: 'Duty Manager',
    nurse: 'Security',
    ward: 'Terminal',
    receptionist: 'Help Desk',
    discharge: 'Departure',
    discharging: 'Departing',
    floors: ['Terminal 1', 'Terminal 2', 'Gate A1', 'Gate B5', 'Hangar']
  },
  MALL: {
    label: 'Shopping Mall',
    patient: 'Shopper',
    patients: 'Shoppers',
    medical: 'Maintenance',
    doctor: 'Admin',
    nurse: 'Security',
    ward: 'Zone',
    receptionist: 'Information',
    discharge: 'Exit',
    discharging: 'Exiting',
    floors: ['Level 1', 'Level 2', 'Food Court', 'Parking', 'Multiplex']
  }
};

export function DomainProvider({ children }) {
  const [domain, setDomainState] = useState(() => {
    return localStorage.getItem('core-domain') || 'HOSPITAL';
  });

  const setDomain = (newDomain) => {
    setDomainState(newDomain);
    localStorage.setItem('core-domain', newDomain);
  };

  const currentDomainData = DOMAINS[domain] || DOMAINS.HOSPITAL;
  
  // Create a unified terms object with safe fallbacks for all sectors
  const terms = {
    ...currentDomainData,
    // Ensure critical keys used with .toLowerCase() always exist
    label: currentDomainData.label || 'System',
    patient: currentDomainData.patient || 'User',
    patients: currentDomainData.patients || 'Users',
    medical: currentDomainData.medical || 'Operations',
    sector: currentDomainData.label || 'Facility'
  };

  const isHotel = domain === 'HOTEL';

  return (
    <DomainContext.Provider value={{ domain, setDomain, isHotel, terms, DOMAINS }}>
      {children}
    </DomainContext.Provider>
  );
}

export const useDomain = () => useContext(DomainContext);
