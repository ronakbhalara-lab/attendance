# Database Migration for Location Names

## Overview
This migration adds two new columns to the Attendance table to store readable location names:

- `ClockInLocation` - Stores the readable address for clock-in locations
- `ClockOutLocation` - Stores the readable address for clock-out locations

## How to Run the Migration

### Option 1: Using Prisma (Recommended)
```bash
npx prisma migrate dev --name add-location-names
```

### Option 2: Manual SQL Execution
If you prefer to run SQL directly, execute the following commands:

```sql
ALTER TABLE Attendance ADD ClockInLocation VARCHAR(500) NULL;
ALTER TABLE Attendance ADD ClockOutLocation VARCHAR(500) NULL;
```

## What Changes Were Made

1. **Database Schema**: Added location name columns to Attendance table
2. **API Updates**: Clock-in and clock-out APIs now fetch and store location names
3. **Frontend**: Dashboard displays readable addresses instead of just coordinates
4. **Geocoding**: Uses OpenStreetMap's Nominatim API for reverse geocoding

## Features Added

- **Readable Locations**: Shows addresses like "Kedar Business Hub, Katargam, Surat, Gujarat" instead of coordinates
- **Fallback**: If geocoding fails, shows coordinates as fallback
- **Map Links**: Still provides Google Maps links for exact locations
- **Indian Address Format**: Optimized for Indian address formatting

## Notes

- The geocoding uses OpenStreetMap's free Nominatim API
- Location names are fetched during clock-in/clock-out and stored in database
- Existing records will show coordinates until users clock in/out again
- No performance impact as location names are stored, not fetched on each display
