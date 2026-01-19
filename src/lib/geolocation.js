// Reverse geocoding utility to convert coordinates to readable addresses

export async function getAddressFromCoordinates(lat, lng) {
  try {
    if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
      return "Location not available";
    }

    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'AttendanceApp/1.0'
        }
      }
    );

    if (!response.ok) {
      console.error('Geocoding API error:', response.status);
      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }

    const data = await response.json();
    
    if (data && data.display_name) {
      // Format the address to show most relevant information
      const address = data.display_name;
      
      // For Indian addresses, try to format them better
      if (address.includes('India') || address.includes('Gujarat') || address.includes('Surat')) {
        return address;
      }
      
      return address;
    }

    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  } catch (error) {
    console.error('Error getting address from coordinates:', error);
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }
}

export async function getShortAddress(lat, lng) {
  try {
    if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
      return "Location not available";
    }

    // Special case: Check if coordinates are near Kedar Business Center
    const kedarAddress = checkKedarBusinessCenter(lat, lng);
    if (kedarAddress) {
      console.log('Detected Kedar Business Center location');
      return kedarAddress;
    }

    // Try multiple approaches for better location accuracy
    let address = await tryDetailedGeocoding(lat, lng);
    
    // If still too generic, try with different zoom levels
    if (address === "Surat, Gujarat" || address === "Ahmedabad, Gujarat" || address.split(',').length < 3) {
      address = await tryAlternativeGeocoding(lat, lng);
    }
    
    // If still not detailed enough, try nearby search for business areas
    if (address && (address.includes("Surat, Gujarat") || address.includes("Ahmedabad, Gujarat")) && !address.includes("Taluka") && !address.includes("Salabatpura") && !address.includes("Katargam")) {
      address = await tryNearbySearch(lat, lng);
    }
    
    // NEW: Try aggressive business/building search for very specific locations
    if (address && (address.includes("Surat") || address.includes("Ahmedabad")) && !address.includes("Business") && !address.includes("Hub") && !address.includes("Complex") && !address.includes("Centre") && !address.includes("Kedar") && !address.includes("KBC")) {
      const businessAddress = await tryAggressiveBusinessSearch(lat, lng);
      if (businessAddress && businessAddress !== address) {
        address = businessAddress;
      }
    }
    
    // Clean up and format the address for better readability
    if (address) {
      address = formatAddress(address);
    }
    
    return address || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  } catch (error) {
    console.error('Error getting short address:', error);
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }
}

// Special function to detect Kedar Business Center location
function checkKedarBusinessCenter(lat, lng) {
  // Kedar Business Center coordinates and surrounding areas
  // These coordinates cover KBC and immediate vicinity
  const kedarLocations = [
    { lat: 21.2300, lng: 72.8250, name: "KBC - Kedar Business Center, Swaminarayan Nagar-2, Gita Nagar Society, Katargam, Surat" },
    { lat: 21.2310, lng: 72.8260, name: "KBC - Kedar Business Center, Swaminarayan Nagar-2, Gita Nagar Society, Katargam, Surat" },
    { lat: 21.2290, lng: 72.8240, name: "KBC - Kedar Business Center, Swaminarayan Nagar-2, Gita Nagar Society, Katargam, Surat" },
    { lat: 21.2320, lng: 72.8270, name: "KBC - Kedar Business Center, Swaminarayan Nagar-2, Gita Nagar Society, Katargam, Surat" }
  ];
  
  const tolerance = 0.003; // About 300 meters radius for more precise detection
  
  for (const location of kedarLocations) {
    if (Math.abs(lat - location.lat) < tolerance && Math.abs(lng - location.lng) < tolerance) {
      return location.name;
    }
  }
  
  return null;
}

function formatAddress(address) {
  try {
    // Remove duplicate city names and postal codes
    let parts = address.split(',').map(part => part.trim()).filter(part => part);
    
    // Remove duplicates (e.g., "Surat, Surat, Gujarat")
    const uniqueParts = [];
    const seen = new Set();
    
    for (const part of parts) {
      const lowerPart = part.toLowerCase();
      if (!seen.has(lowerPart) && 
          !/^\d{6}$/.test(part) && // Remove postal codes
          part !== 'India' && // Remove country for cleaner display
          !lowerPart.includes('taluka') || // Keep taluka for specificity
          lowerPart.includes('taluka')) { // But keep it if it's the only specific info
        seen.add(lowerPart);
        uniqueParts.push(part);
      }
    }
    
    // Enhanced formatting for business locations - Kedar Business Center priority
    if (uniqueParts.length > 0) {
      // Priority 1: Kedar Business Center specific formatting
      const kedarIndex = uniqueParts.findIndex(part => 
        part.toLowerCase().includes('kedar') ||
        part.toLowerCase().includes('kbc') ||
        part.toLowerCase().includes('swaminarayan') ||
        part.toLowerCase().includes('gita nagar')
      );
      
      if (kedarIndex !== -1) {
        // For Kedar Business Center, show the most complete address
        const kedarName = uniqueParts[kedarIndex];
        const otherParts = uniqueParts.filter((_, index) => index !== kedarIndex);
        
        // Keep area and city info (max 4 more parts for complete address)
        const finalParts = [kedarName];
        for (const part of otherParts) {
          if (finalParts.length < 5 && 
              (part.toLowerCase().includes('katargam') || 
               part.toLowerCase().includes('surat') ||
               part.toLowerCase().includes('nagar') ||
               part.toLowerCase().includes('society'))) {
            finalParts.push(part);
          }
        }
        return finalParts.join(', ');
      }
      
      // Priority 2: General business hub/commercial center
      const businessIndex = uniqueParts.findIndex(part => 
        part.toLowerCase().includes('business hub') ||
        part.toLowerCase().includes('commercial') ||
        part.toLowerCase().includes('complex') ||
        part.toLowerCase().includes('centre') ||
        part.toLowerCase().includes('plaza') ||
        part.toLowerCase().includes('tower')
      );
      
      if (businessIndex !== -1) {
        // Reorder to put business name first, then area
        const businessName = uniqueParts[businessIndex];
        const areaParts = uniqueParts.filter((_, index) => index !== businessIndex);
        
        // Keep only the most relevant area info (max 3 more parts)
        const finalParts = [businessName];
        for (const part of areaParts) {
          if (finalParts.length < 4) {
            finalParts.push(part);
          }
        }
        return finalParts.join(', ');
      }
      
      // If no specific business name, limit to 3 most relevant parts
      if (uniqueParts.length > 3) {
        return uniqueParts.slice(0, 3).join(', ');
      }
    }
    
    return uniqueParts.join(', ');
  } catch (error) {
    console.error('Error formatting address:', error);
    return address;
  }
}

async function tryDetailedGeocoding(lat, lng) {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=19&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'AttendanceApp/1.0'
        }
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    
    if (data && data.address) {
      const addr = data.address;
      let parts = [];
      
      // Priority order for detailed Indian addresses - Enhanced for business detection
      // 1. Business/Building names (most specific) - Enhanced
      if (addr.shop || addr.building || addr.office || addr.commercial || addr.industrial) {
        parts.push(addr.shop || addr.building || addr.office || addr.commercial || addr.industrial);
      }
      
      // 1.5. Additional business-related tags
      if (addr.amenity || addr.tourism || addr.leisure || addr.man_made) {
        const businessTag = addr.amenity || addr.tourism || addr.leisure || addr.man_made;
        if (businessTag && !parts.includes(businessTag)) {
          parts.push(businessTag);
        }
      }
      
      // 2. Landmark/POI names
      if (addr.amenity || addr.tourism || addr.leisure) {
        parts.push(addr.amenity || addr.tourism || addr.leisure);
      }
      
      // 3. Road/Street names
      if (addr.road || addr.street || addr.pedestrian) {
        parts.push(addr.road || addr.street || addr.pedestrian);
      }
      
      // 4. Area/Neighborhood (important for Indian cities)
      if (addr.suburb || addr.neighbourhood || addr.district || addr.borough) {
        parts.push(addr.suburb || addr.neighbourhood || addr.district || addr.borough);
      }
      
      // 5. Specific area names
      if (addr.hamlet || addr.locality || addr.isolated_dwelling) {
        parts.push(addr.hamlet || addr.locality || addr.isolated_dwelling);
      }
      
      // 6. City/Town
      if (addr.city || addr.town || addr.village || addr.county) {
        parts.push(addr.city || addr.town || addr.village || addr.county);
      }
      
      // 7. State
      if (addr.state) {
        parts.push(addr.state);
      }
      
      // If we got meaningful parts, join them
      if (parts.length >= 2) {
        return parts.join(', ');
      }
    }

    return data.display_name;
  } catch (error) {
    console.error('Error in detailed geocoding:', error);
    return null;
  }
}

async function tryAggressiveBusinessSearch(lat, lng) {
  try {
    // Search with multiple queries for business locations - Enhanced for Kedar Business Center
    const searchQueries = [
      'Kedar Business Center',
      'KBC',
      'Kedar Business Centre',
      'Swaminarayan Nagar-2',
      'Gita Nagar Society',
      'Kedar Business Hub',
      'business hub',
      'commercial complex',
      'shopping centre',
      'market',
      'plaza',
      'tower',
      'center',
      'industrial',
      'office',
      'corporate',
      'trade center'
    ];
    
    for (const query of searchQueries) {
      try {
        // Add city context for better results
        const cityContext = query.includes('Kedar') || query.includes('KBC') || query.includes('Swaminarayan') || query.includes('Gita Nagar') ? 'Surat' : '';
        const searchQuery = cityContext ? `${query} ${cityContext}` : query;
        
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&limit=5`,
          {
            headers: {
              'User-Agent': 'AttendanceApp/1.0'
            }
          }
        );

        if (response.ok) {
          const data = await response.json();
          
          if (data && data.length > 0) {
            // Find the closest and most relevant result
            for (const place of data) {
              if (place.display_name && 
                  place.lat && place.lon &&
                  Math.abs(parseFloat(place.lat) - lat) < 0.02 && // Within ~2km
                  Math.abs(parseFloat(place.lon) - lng) < 0.02) {
                
                // Check if this is more specific than current address
                if (place.display_name.includes(query) || 
                    place.display_name.includes('Business') ||
                    place.display_name.includes('Complex') ||
                    place.display_name.includes('Centre') ||
                    place.display_name.includes('Kedar') ||
                    place.display_name.includes('KBC') ||
                    place.display_name.includes('Swaminarayan') ||
                    place.display_name.includes('Gita Nagar')) {
                  console.log(`Found specific location: ${place.display_name}`);
                  return place.display_name;
                }
              }
            }
          }
        }
      } catch (error) {
        console.log(`Search failed for query: ${query}`);
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error in aggressive business search:', error);
    return null;
  }
}

async function tryNearbySearch(lat, lng) {
  try {
    // Search for nearby places and areas
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=business+hub+commercial+area&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&limit=5`,
      {
        headers: {
          'User-Agent': 'AttendanceApp/1.0'
        }
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    
    if (data && data.length > 0) {
      // Find the most relevant nearby result
      for (const place of data) {
        if (place.display_name && 
            (place.display_name.includes('Business') || 
             place.display_name.includes('Commercial') || 
             place.display_name.includes('Industrial') ||
             place.display_name.includes('Hub') ||
             place.display_name.includes('Complex'))) {
          return place.display_name;
        }
      }
      
      // If no specific business place, return the first detailed result
      if (data[0].display_name && data[0].display_name.split(',').length >= 3) {
        return data[0].display_name;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error in nearby search:', error);
    return null;
  }
}

async function tryAlternativeGeocoding(lat, lng) {
  try {
    // Try with different zoom level and more detailed address
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=20&addressdetails=1&polygon_geojson=1`,
      {
        headers: {
          'User-Agent': 'AttendanceApp/1.0'
        }
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    
    if (data && data.display_name) {
      // If display_name is more detailed than our parsed version, use it
      if (data.display_name.split(',').length > 2) {
        return data.display_name;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error in alternative geocoding:', error);
    return null;
  }
}
