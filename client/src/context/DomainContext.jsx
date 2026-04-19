import { createContext, useContext, useState, useEffect } from 'react';

const DomainContext = createContext();

export function DomainProvider({ children }) {
  const [domain, setDomainState] = useState(() => {
    return localStorage.getItem('core-domain') || 'HOSPITAL';
  });

  const setDomain = (newDomain) => {
    setDomainState(newDomain);
    localStorage.setItem('core-domain', newDomain);
  };

  const isHotel = domain === 'HOTEL';
  
  // Domain-specific terminology map
  const terms = {
    patient: isHotel ? 'Guest' : 'Patient',
    patients: isHotel ? 'Guests' : 'Patients',
    medical: isHotel ? 'Maintenance' : 'Medical',
    doctor: isHotel ? 'Manager' : 'Doctor',
    nurse: isHotel ? 'Security' : 'Nurse',
    ward: isHotel ? 'Section' : 'Ward',
    receptionist: isHotel ? 'Front Desk' : 'Receptionist',
    hospital: isHotel ? 'Hotel' : 'Hospital',
    discharge: isHotel ? 'Check-Out' : 'Discharge',
    discharging: isHotel ? 'Checking Out' : 'Discharging'
  };

  return (
    <DomainContext.Provider value={{ domain, setDomain, isHotel, terms }}>
      {children}
    </DomainContext.Provider>
  );
}

export const useDomain = () => useContext(DomainContext);
