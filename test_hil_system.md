# HIL Labs System Testing Guide

## Overview
The HIL (Hardware in Loop) Labs booking system has been successfully integrated into the Marquardt India inventory management system. This system allows users to book HIL testing facilities for long-term projects (similar to Outlook room booking but for years instead of hours).

## Key Features Implemented

### 1. Database Schema
- **hil_labs**: Stores HIL lab information (name, location, capacity, equipment)
- **hil_bookings**: Stores project bookings with start/end dates
- **hil_booking_attendees**: Manages team members assigned to projects

### 2. User Interface
- **HIL Labs View** (`/hil/labs`): Browse available labs and current bookings
- **Booking Form** (`/hil/book/:labId`): Create new project bookings
- **All Bookings** (`/hil/bookings`): View all system bookings with filters
- **My Bookings** (`/hil/my-bookings`): Personal booking management
- **Admin Management** (`/hil/admin/labs`): Lab administration (Admin/Monitor only)

### 3. Role-Based Access
- **Employees**: Can view labs, create bookings, manage their bookings
- **Monitors**: Full booking access + lab management
- **Admins**: Complete system management

### 4. Key Functionality
- **Long-term Booking**: Projects can be booked for years (vs hours in Outlook)
- **Team Management**: Add multiple attendees to projects
- **Conflict Prevention**: System prevents overlapping bookings
- **Project Tracking**: Detailed project information and purpose tracking
- **Status Management**: Active, upcoming, and expired booking states

## Navigation Integration
HIL Labs links have been added to the navbar for all user roles:
- Employees: "HIL Labs" and "My HIL Bookings"
- Monitors: "HIL Labs" and "HIL Bookings" 
- Admins: "HIL Labs" and "Manage HIL Labs"

## Dashboard Integration
Employee dashboard now includes:
- HIL Labs card for easy access
- My HIL Bookings card with active booking count

## Sample Data
The system comes pre-populated with 3 sample HIL labs:
1. HIL Lab 1 - Primary automotive systems testing
2. HIL Lab 2 - ADAS testing facility  
3. HIL Lab 3 - Powertrain testing

## Testing Steps

### 1. Access HIL Labs
1. Login to the system
2. Navigate to "HIL Labs" from the sidebar
3. View available labs and their current booking status

### 2. Create a Booking
1. Click "Book Lab" on any available lab
2. Fill in project details:
   - Project name
   - Description
   - Start/end dates (can span years)
   - Team members
3. Submit booking

### 3. View Bookings
1. Navigate to "HIL Bookings" or "My HIL Bookings"
2. Use filters to view different booking states
3. Click "View Details" to see full project information

### 4. Admin Functions (Admin/Monitor only)
1. Navigate to "Manage HIL Labs"
2. Add new labs with equipment details
3. View booking statistics per lab

## API Endpoints
- `GET /hil/labs` - View all labs
- `GET /hil/book/:labId` - Booking form
- `POST /hil/book` - Create booking
- `GET /hil/bookings` - All bookings
- `GET /hil/my-bookings` - User's bookings
- `GET /hil/booking/:bookingId` - Booking details
- `POST /hil/cancel/:bookingId` - Cancel booking
- `GET /hil/admin/labs` - Admin lab management
- `POST /hil/admin/add-lab` - Add new lab

## Database Verification
Check that tables were created successfully:
```sql
USE product_management_system;
SHOW TABLES LIKE 'hil_%';
SELECT * FROM hil_labs;
```

## Success Criteria
✅ Database tables created successfully
✅ Navigation links added to all user roles
✅ Dashboard integration completed
✅ All views created and functional
✅ Booking system prevents conflicts
✅ Team member management working
✅ Role-based access implemented

The HIL Labs system is now fully integrated and ready for use!