import React, { useState, useEffect, useRef } from 'react';

export default function Dropdown({ trigger, children, align = 'right' }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="dropdown-container" ref={dropdownRef}>
      <div onClick={() => setIsOpen(!isOpen)} style={{ cursor: 'pointer' }}>
        {trigger}
      </div>
      {isOpen && (
        <div className="dropdown-menu" style={{ [align]: 0 }}>
          {/* We pass closeDropdown so items can close explicitly */}
          {typeof children === 'function' 
            ? children(() => setIsOpen(false)) 
            : <div onClick={(e) => {
                // Only close if the clicked element is a .dropdown-item button
                if (e.target.closest('.dropdown-item') && !e.target.closest('input') && !e.target.closest('.dropdown-keep-open')) {
                  setIsOpen(false);
                }
              }}>{children}</div>
          }
        </div>
      )}
    </div>
  );
}
