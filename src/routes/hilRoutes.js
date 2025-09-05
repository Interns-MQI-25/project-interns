/**
 * @fileoverview HIL Labs Routes Module - Handles HIL (Hardware in Loop) lab booking functionality
 * 
 * This module provides routes for managing HIL lab bookings, similar to Outlook room booking
 * but designed for long-term project assignments (years instead of hours).
 * 
 * @author Marquardt India Interns 2025
 * @version 1.0.0
 */

const express = require('express');
const router = express.Router();

/**
 * HIL Routes Factory Function
 * 
 * Creates and configures all HIL lab booking routes with proper authentication and authorization.
 * 
 * @param {mysql.Pool} pool - MySQL connection pool for database operations
 * @param {Function} requireAuth - Authentication middleware function
 * @param {Function} requireRole - Role-based authorization middleware function
 * @returns {express.Router} Configured Express router with HIL routes
 */
module.exports = (pool, requireAuth, requireRole) => {

    // Calendar View Route - Redirect to employee calendar
    router.get('/calendar', requireAuth, async (req, res) => {
        res.redirect('/employee/hil-calendar');
    });

    // API: Get all labs
    router.get('/api/labs', requireAuth, async (req, res) => {
        try {
            const [labs] = await pool.execute(`
                SELECT lab_id, lab_name, lab_description, location, capacity, equipment_details, is_active
                FROM hil_labs 
                WHERE is_active = TRUE
                ORDER BY lab_name
            `);
            res.json(labs);
        } catch (error) {
            console.error('Error fetching labs:', error);
            res.status(500).json({ error: 'Error fetching labs' });
        }
    });

    // API: Get bookings (all or for specific lab) - all active bookings for calendar
    router.get('/api/bookings/:labId?', requireAuth, async (req, res) => {
        try {
            const labId = req.params.labId;
            let query = `
                SELECT 
                    hb.*,
                    hl.lab_name,
                    u.full_name as booked_by_name
                FROM hil_bookings hb
                JOIN hil_labs hl ON hb.lab_id = hl.lab_id
                JOIN users u ON hb.booked_by = u.user_id
                WHERE hb.status = 'active'
            `;
            
            const params = [];
            if (labId) {
                query += ' AND hb.lab_id = ?';
                params.push(labId);
            }
            
            query += ' ORDER BY hb.start_date';
            
            const [bookings] = await pool.execute(query, params);
            res.json(bookings);
        } catch (error) {
            console.error('Error fetching bookings:', error);
            res.status(500).json({ error: 'Error fetching bookings' });
        }
    });

    // API: Get employees for team member dropdown
    router.get('/api/employees', requireAuth, async (req, res) => {
        try {
            const [employees] = await pool.execute(`
                SELECT u.user_id, u.full_name, u.role, d.department_name
                FROM users u
                JOIN employees e ON u.user_id = e.user_id
                JOIN departments d ON e.department_id = d.department_id
                WHERE u.is_active = TRUE AND u.role IN ('employee', 'monitor')
                ORDER BY u.full_name
            `);
            res.json(employees);
        } catch (error) {
            console.error('Error fetching employees:', error);
            res.status(500).json({ error: 'Error fetching employees' });
        }
    });

    // HIL Labs Dashboard - Redirect to employee calendar
    router.get('/labs', requireAuth, async (req, res) => {
        res.redirect('/employee/hil-calendar');
    });

    // HIL Lab Booking Form - Redirect to employee calendar
    router.get('/book/:labId', requireAuth, async (req, res) => {
        res.redirect('/employee/hil-calendar');
    });

    // API: Process HIL Lab Booking (JSON)
    router.post('/book', requireAuth, async (req, res) => {
        const isJson = req.headers['content-type'] === 'application/json';
        
        const {
            lab_id,
            project_name,
            project_description,
            start_date,
            end_date,
            booking_purpose,
            attendees
        } = req.body;

        try {
            // Validate dates
            const startDate = new Date(start_date);
            const endDate = new Date(end_date);
            const today = new Date();
            today.setHours(0, 0, 0, 0); // Set to start of today
            startDate.setHours(0, 0, 0, 0); // Set to start of selected date

            if (startDate < today) {
                const message = 'Start date cannot be in the past';
                if (isJson) return res.status(400).json({ error: message });
                req.flash('error', message);
                return res.redirect(`/hil/book/${lab_id}`);
            }

            if (endDate <= startDate) {
                const message = 'End date must be after start date';
                if (isJson) return res.status(400).json({ error: message });
                req.flash('error', message);
                return res.redirect(`/hil/book/${lab_id}`);
            }

            const connection = await pool.getConnection();
            await connection.beginTransaction();

            try {
                // Check for conflicts before booking
                const [conflicts] = await connection.execute(`
                    SELECT booking_id, project_name
                    FROM hil_bookings
                    WHERE lab_id = ? AND status = 'active'
                    AND (
                        (start_date <= ? AND end_date >= ?) OR
                        (start_date <= ? AND end_date >= ?) OR
                        (start_date >= ? AND end_date <= ?)
                    )
                `, [lab_id, start_date, start_date, end_date, end_date, start_date, end_date]);

                if (conflicts.length > 0) {
                    const message = `Lab already booked for "${conflicts[0].project_name}" during this period`;
                    if (isJson) return res.status(400).json({ error: message });
                    req.flash('error', message);
                    return res.redirect(`/hil/book/${lab_id}`);
                }

                // Create active booking (no approval needed)
                const [bookingResult] = await connection.execute(`
                    INSERT INTO hil_bookings (lab_id, project_name, project_description, booked_by, start_date, end_date, booking_purpose, status)
                    VALUES (?, ?, ?, ?, ?, ?, ?, 'active')
                `, [lab_id, project_name, project_description, req.session.user.user_id, start_date, end_date, booking_purpose]);

                const bookingId = bookingResult.insertId;

                // Add attendees if provided
                if (attendees && Array.isArray(attendees)) {
                    for (const userId of attendees) {
                        if (userId && userId !== '') {
                            await connection.execute(`
                                INSERT INTO hil_booking_attendees (booking_id, user_id, added_by)
                                VALUES (?, ?, ?)
                            `, [bookingId, userId, req.session.user.user_id]);
                        }
                    }
                }

                await connection.commit();
                
                if (isJson) {
                    res.json({ success: true, booking_id: bookingId, message: 'Lab booked successfully' });
                } else {
                    req.flash('success', `FST lab booked successfully: "${project_name}"`);
                    res.redirect('/employee/my-hil-bookings');
                }

            } catch (error) {
                await connection.rollback();
                throw error;
            } finally {
                connection.release();
            }

        } catch (error) {
            console.error('HIL booking error:', error);
            if (isJson) {
                res.status(500).json({ error: 'Error creating booking request' });
            } else {
                req.flash('error', 'Error creating booking request');
                res.redirect(`/hil/book/${lab_id}`);
            }
        }
    });

    // Process HIL Lab Booking (Form)
    router.post('/book-form', requireAuth, async (req, res) => {
        const {
            lab_id,
            project_name,
            project_description,
            start_date,
            end_date,
            booking_purpose,
            attendees
        } = req.body;

        try {
            // Validate dates
            const startDate = new Date(start_date);
            const endDate = new Date(end_date);
            const today = new Date();
            today.setHours(0, 0, 0, 0); // Set to start of today
            startDate.setHours(0, 0, 0, 0); // Set to start of selected date

            if (startDate < today) {
                req.flash('error', 'Start date cannot be in the past');
                return res.redirect(`/hil/book/${lab_id}`);
            }

            if (endDate <= startDate) {
                req.flash('error', 'End date must be after start date');
                return res.redirect(`/hil/book/${lab_id}`);
            }

            // Check for overlapping bookings
            const [overlapping] = await pool.execute(`
                SELECT booking_id, project_name, start_date, end_date
                FROM hil_bookings
                WHERE lab_id = ? AND status = 'active'
                AND (
                    (start_date <= ? AND end_date >= ?) OR
                    (start_date <= ? AND end_date >= ?) OR
                    (start_date >= ? AND end_date <= ?)
                )
            `, [lab_id, start_date, start_date, end_date, end_date, start_date, end_date]);

            if (overlapping.length > 0) {
                req.flash('error', `Lab is already booked for project "${overlapping[0].project_name}" from ${overlapping[0].start_date} to ${overlapping[0].end_date}`);
                return res.redirect(`/hil/book/${lab_id}`);
            }

            const connection = await pool.getConnection();
            await connection.beginTransaction();

            try {
                // Create the booking
                const [bookingResult] = await connection.execute(`
                    INSERT INTO hil_bookings (lab_id, project_name, project_description, booked_by, start_date, end_date, booking_purpose)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `, [lab_id, project_name, project_description, req.session.user.user_id, start_date, end_date, booking_purpose]);

                const bookingId = bookingResult.insertId;

                // Add attendees if provided
                if (attendees && Array.isArray(attendees)) {
                    for (const userId of attendees) {
                        if (userId && userId !== '') {
                            await connection.execute(`
                                INSERT INTO hil_booking_attendees (booking_id, user_id, added_by)
                                VALUES (?, ?, ?)
                            `, [bookingId, userId, req.session.user.user_id]);
                        }
                    }
                }

                await connection.commit();
                req.flash('success', `HIL lab successfully booked for project "${project_name}"`);
                res.redirect('/hil/bookings');

            } catch (error) {
                await connection.rollback();
                throw error;
            } finally {
                connection.release();
            }

        } catch (error) {
            console.error('HIL booking error:', error);
            req.flash('error', 'Error creating booking');
            res.redirect(`/hil/book/${lab_id}`);
        }
    });

    // View All Bookings - Redirect to employee calendar
    router.get('/bookings', requireAuth, async (req, res) => {
        res.redirect('/employee/hil-calendar');
    });

    // View Booking Details - Redirect to employee calendar
    router.get('/booking/:bookingId', requireAuth, async (req, res) => {
        res.redirect('/employee/hil-calendar');
    });

    // My HIL Bookings - Redirect to employee calendar
    router.get('/my-bookings', requireAuth, async (req, res) => {
        res.redirect('/employee/hil-calendar');
    });

    // Cancel Booking (only for booking owner or admin)
    router.post('/cancel/:bookingId', requireAuth, async (req, res) => {
        try {
            const bookingId = req.params.bookingId;
            const { cancellation_reason } = req.body;

            // Check if user can cancel this booking
            const [bookings] = await pool.execute(
                'SELECT * FROM hil_bookings WHERE booking_id = ? AND (booked_by = ? OR ? IN (SELECT user_id FROM users WHERE role = "admin"))',
                [bookingId, req.session.user.user_id, req.session.user.user_id]
            );

            if (bookings.length === 0) {
                req.flash('error', 'You do not have permission to cancel this booking');
                return res.redirect('/hil/bookings');
            }

            // Update booking status
            await pool.execute(
                'UPDATE hil_bookings SET status = "cancelled", booking_purpose = CONCAT(COALESCE(booking_purpose, ""), "\n\nCancelled: ", ?) WHERE booking_id = ?',
                [cancellation_reason || 'No reason provided', bookingId]
            );

            req.flash('success', 'Booking cancelled successfully');
            res.redirect('/hil/my-bookings');
        } catch (error) {
            console.error('Cancel booking error:', error);
            req.flash('error', 'Error cancelling booking');
            res.redirect('/hil/bookings');
        }
    });

    // Add Attendee to Booking
    router.post('/add-attendee/:bookingId', requireAuth, async (req, res) => {
        try {
            const bookingId = req.params.bookingId;
            const { user_id, role_in_project } = req.body;

            // Check if user can modify this booking
            const [bookings] = await pool.execute(
                'SELECT * FROM hil_bookings WHERE booking_id = ? AND (booked_by = ? OR ? IN (SELECT user_id FROM users WHERE role IN ("admin", "monitor")))',
                [bookingId, req.session.user.user_id, req.session.user.user_id]
            );

            if (bookings.length === 0) {
                req.flash('error', 'You do not have permission to modify this booking');
                return res.redirect(`/hil/booking/${bookingId}`);
            }

            // Add attendee
            await pool.execute(`
                INSERT INTO hil_booking_attendees (booking_id, user_id, role_in_project, added_by)
                VALUES (?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE role_in_project = VALUES(role_in_project)
            `, [bookingId, user_id, role_in_project, req.session.user.user_id]);

            req.flash('success', 'Attendee added successfully');
            res.redirect(`/hil/booking/${bookingId}`);
        } catch (error) {
            console.error('Add attendee error:', error);
            req.flash('error', 'Error adding attendee');
            res.redirect(`/hil/booking/${bookingId}`);
        }
    });

    // Admin: Manage HIL Labs
    router.get('/admin/labs', requireAuth, requireRole(['admin', 'monitor']), async (req, res) => {
        try {
            const [labs] = await pool.execute(`
                SELECT 
                    hl.*,
                    u.full_name as created_by_name,
                    COUNT(hb.booking_id) as total_bookings,
                    SUM(CASE WHEN hb.status = 'active' THEN 1 ELSE 0 END) as active_bookings
                FROM hil_labs hl
                LEFT JOIN users u ON hl.created_by = u.user_id
                LEFT JOIN hil_bookings hb ON hl.lab_id = hb.lab_id
                GROUP BY hl.lab_id
                ORDER BY hl.lab_name
            `);

            res.render('hil/admin-labs', {
                user: req.session.user,
                labs: labs || []
            });
        } catch (error) {
            console.error('Admin HIL labs error:', error);
            res.render('hil/admin-labs', {
                user: req.session.user,
                labs: [],
                error: 'Error loading HIL labs'
            });
        }
    });

    // Admin: HIL Approvals Page (moved to adminRoutes)
    // This route is now handled in adminRoutes.js
    
    // Keep this route for backward compatibility but redirect
    router.get('/admin/hil-approvals', requireAuth, requireRole(['admin']), async (req, res) => {
        res.redirect('/admin/hil-approvals');
    });

    // Original admin route (will be moved)
    router.get('/admin/hil-approvals-old', requireAuth, requireRole(['admin']), async (req, res) => {
        try {
            // Get pending requests
            const [pendingRequests] = await pool.execute(`
                SELECT 
                    hb.*,
                    hl.lab_name,
                    u.full_name as booked_by_name,
                    d.department_name,
                    COUNT(hba.user_id) as attendee_count
                FROM hil_bookings hb
                JOIN hil_labs hl ON hb.lab_id = hl.lab_id
                JOIN users u ON hb.booked_by = u.user_id
                LEFT JOIN employees e ON u.user_id = e.user_id
                LEFT JOIN departments d ON e.department_id = d.department_id
                LEFT JOIN hil_booking_attendees hba ON hb.booking_id = hba.booking_id
                WHERE hb.status = 'pending'
                GROUP BY hb.booking_id
                ORDER BY hb.created_at ASC
            `);

            // Get recent decisions
            const [recentDecisions] = await pool.execute(`
                SELECT 
                    hb.*,
                    hl.lab_name,
                    u.full_name as booked_by_name
                FROM hil_bookings hb
                JOIN hil_labs hl ON hb.lab_id = hl.lab_id
                JOIN users u ON hb.booked_by = u.user_id
                WHERE hb.status IN ('approved', 'rejected')
                ORDER BY hb.updated_at DESC
                LIMIT 10
            `);

            res.render('admin/hil-approvals', {
                user: req.session.user,
                pendingRequests: pendingRequests || [],
                recentDecisions: recentDecisions || []
            });
        } catch (error) {
            console.error('HIL approvals error:', error);
            res.render('admin/hil-approvals', {
                user: req.session.user,
                pendingRequests: [],
                recentDecisions: []
            });
        }
    });

    // Admin: Process HIL Approval
    router.post('/admin/hil-approve/:bookingId', requireAuth, requireRole(['admin']), async (req, res) => {
        try {
            const bookingId = req.params.bookingId;
            const { action, reason } = req.body;

            if (action === 'approve') {
                // Check for conflicts before approving
                const [booking] = await pool.execute(
                    'SELECT * FROM hil_bookings WHERE booking_id = ?',
                    [bookingId]
                );

                if (booking.length === 0) {
                    return res.status(404).json({ error: 'Booking not found' });
                }

                const [conflicts] = await pool.execute(`
                    SELECT booking_id, project_name
                    FROM hil_bookings
                    WHERE lab_id = ? AND status = 'approved' AND booking_id != ?
                    AND (
                        (start_date <= ? AND end_date >= ?) OR
                        (start_date <= ? AND end_date >= ?) OR
                        (start_date >= ? AND end_date <= ?)
                    )
                `, [
                    booking[0].lab_id, bookingId,
                    booking[0].start_date, booking[0].start_date,
                    booking[0].end_date, booking[0].end_date,
                    booking[0].start_date, booking[0].end_date
                ]);

                if (conflicts.length > 0) {
                    return res.status(400).json({ 
                        error: `Cannot approve: Lab already booked for "${conflicts[0].project_name}" during this period` 
                    });
                }

                await pool.execute(
                    'UPDATE hil_bookings SET status = "approved", updated_at = NOW() WHERE booking_id = ?',
                    [bookingId]
                );
            } else if (action === 'reject') {
                const rejectionReason = reason ? `Rejected: ${reason}` : 'Rejected by admin';
                await pool.execute(
                    'UPDATE hil_bookings SET status = "rejected", booking_purpose = CONCAT(COALESCE(booking_purpose, ""), "\n\n", ?), updated_at = NOW() WHERE booking_id = ?',
                    [rejectionReason, bookingId]
                );
            }

            res.json({ success: true });
        } catch (error) {
            console.error('HIL approval error:', error);
            res.status(500).json({ error: 'Error processing approval' });
        }
    });

    // Admin: Add New HIL Lab
    router.post('/admin/add-lab', requireAuth, requireRole(['admin', 'monitor']), async (req, res) => {
        const { lab_name, lab_description, location, capacity, equipment_details } = req.body;

        try {
            await pool.execute(`
                INSERT INTO hil_labs (lab_name, lab_description, location, capacity, equipment_details, created_by)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [lab_name, lab_description, location, capacity || 1, equipment_details, req.session.user.user_id]);

            req.flash('success', 'HIL lab added successfully');
            res.redirect('/hil/admin/labs');
        } catch (error) {
            console.error('Add HIL lab error:', error);
            req.flash('error', 'Error adding HIL lab');
            res.redirect('/hil/admin/labs');
        }
    });

    // API: Get single booking details
    router.get('/api/booking/:bookingId', requireAuth, async (req, res) => {
        try {
            const bookingId = req.params.bookingId;
            const [bookings] = await pool.execute(`
                SELECT hb.*, hl.lab_name, hl.location
                FROM hil_bookings hb
                JOIN hil_labs hl ON hb.lab_id = hl.lab_id
                WHERE hb.booking_id = ? AND (hb.booked_by = ? OR ? IN (SELECT user_id FROM users WHERE role IN ('admin', 'monitor')))
            `, [bookingId, req.session.user.user_id, req.session.user.user_id]);
            
            if (bookings.length === 0) {
                return res.status(404).json({ error: 'Booking not found or access denied' });
            }
            
            res.json(bookings[0]);
        } catch (error) {
            console.error('Error fetching booking:', error);
            res.status(500).json({ error: 'Error fetching booking details' });
        }
    });

    // API: Update booking
    router.put('/api/booking/:bookingId', requireAuth, async (req, res) => {
        try {
            const bookingId = req.params.bookingId;
            const { project_name, project_description, start_date, end_date, booking_purpose } = req.body;
            
            // Check if user owns this booking
            const [bookings] = await pool.execute(
                'SELECT * FROM hil_bookings WHERE booking_id = ? AND booked_by = ?',
                [bookingId, req.session.user.user_id]
            );
            
            if (bookings.length === 0) {
                return res.status(403).json({ error: 'Access denied or booking not found' });
            }
            
            // Validate dates
            const startDate = new Date(start_date);
            const endDate = new Date(end_date);
            
            if (endDate <= startDate) {
                return res.status(400).json({ error: 'End date must be after start date' });
            }
            
            // Check for conflicts (excluding current booking)
            const [conflicts] = await pool.execute(`
                SELECT booking_id, project_name
                FROM hil_bookings
                WHERE lab_id = ? AND status = 'active' AND booking_id != ?
                AND (
                    (start_date <= ? AND end_date >= ?) OR
                    (start_date <= ? AND end_date >= ?) OR
                    (start_date >= ? AND end_date <= ?)
                )
            `, [bookings[0].lab_id, bookingId, start_date, start_date, end_date, end_date, start_date, end_date]);
            
            if (conflicts.length > 0) {
                return res.status(400).json({ 
                    error: `Lab already booked for "${conflicts[0].project_name}" during this period` 
                });
            }
            
            // Update booking
            await pool.execute(`
                UPDATE hil_bookings 
                SET project_name = ?, project_description = ?, start_date = ?, end_date = ?, booking_purpose = ?, updated_at = NOW()
                WHERE booking_id = ?
            `, [project_name, project_description, start_date, end_date, booking_purpose, bookingId]);
            
            res.json({ success: true, message: 'Booking updated successfully' });
        } catch (error) {
            console.error('Error updating booking:', error);
            res.status(500).json({ error: 'Error updating booking' });
        }
    });

    // API: Cancel booking
    router.delete('/api/booking/:bookingId', requireAuth, async (req, res) => {
        try {
            const bookingId = req.params.bookingId;
            
            // Check if user owns this booking
            const [bookings] = await pool.execute(
                'SELECT * FROM hil_bookings WHERE booking_id = ? AND booked_by = ?',
                [bookingId, req.session.user.user_id]
            );
            
            if (bookings.length === 0) {
                return res.status(403).json({ error: 'Access denied or booking not found' });
            }
            
            // Update booking status to cancelled
            await pool.execute(
                'UPDATE hil_bookings SET status = "cancelled", updated_at = NOW() WHERE booking_id = ?',
                [bookingId]
            );
            
            res.json({ success: true, message: 'Booking cancelled successfully' });
        } catch (error) {
            console.error('Error cancelling booking:', error);
            res.status(500).json({ error: 'Error cancelling booking' });
        }
    });

    // API: Get team members for a booking
    router.get('/api/booking/:bookingId/team', requireAuth, async (req, res) => {
        try {
            const bookingId = req.params.bookingId;
            
            // Check if user has access to this booking
            const [bookings] = await pool.execute(`
                SELECT hb.booking_id FROM hil_bookings hb
                LEFT JOIN hil_booking_attendees hba ON hb.booking_id = hba.booking_id
                WHERE hb.booking_id = ? AND (hb.booked_by = ? OR hba.user_id = ?)
            `, [bookingId, req.session.user.user_id, req.session.user.user_id]);
            
            if (bookings.length === 0) {
                return res.status(403).json({ error: 'Access denied' });
            }
            
            const [teamMembers] = await pool.execute(`
                SELECT hba.user_id, u.full_name, d.department_name, hba.role_in_project
                FROM hil_booking_attendees hba
                JOIN users u ON hba.user_id = u.user_id
                JOIN employees e ON u.user_id = e.user_id
                JOIN departments d ON e.department_id = d.department_id
                WHERE hba.booking_id = ?
                ORDER BY u.full_name
            `, [bookingId]);
            
            res.json(teamMembers);
        } catch (error) {
            console.error('Error fetching team members:', error);
            res.status(500).json({ error: 'Error fetching team members' });
        }
    });

    // API: Add team member to booking
    router.post('/api/booking/:bookingId/team', requireAuth, async (req, res) => {
        try {
            const bookingId = req.params.bookingId;
            const { user_id } = req.body;
            
            // Check if user owns this booking
            const [bookings] = await pool.execute(
                'SELECT * FROM hil_bookings WHERE booking_id = ? AND booked_by = ?',
                [bookingId, req.session.user.user_id]
            );
            
            if (bookings.length === 0) {
                return res.status(403).json({ error: 'Access denied or booking not found' });
            }
            
            // Add team member
            await pool.execute(`
                INSERT INTO hil_booking_attendees (booking_id, user_id, added_by)
                VALUES (?, ?, ?)
                ON DUPLICATE KEY UPDATE added_by = VALUES(added_by)
            `, [bookingId, user_id, req.session.user.user_id]);
            
            res.json({ success: true, message: 'Team member added successfully' });
        } catch (error) {
            console.error('Error adding team member:', error);
            res.status(500).json({ error: 'Error adding team member' });
        }
    });

    // API: Remove team member from booking
    router.delete('/api/booking/:bookingId/team/:userId', requireAuth, async (req, res) => {
        try {
            const bookingId = req.params.bookingId;
            const userId = req.params.userId;
            
            // Check if user owns this booking
            const [bookings] = await pool.execute(
                'SELECT * FROM hil_bookings WHERE booking_id = ? AND booked_by = ?',
                [bookingId, req.session.user.user_id]
            );
            
            if (bookings.length === 0) {
                return res.status(403).json({ error: 'Access denied or booking not found' });
            }
            
            // Remove team member
            await pool.execute(
                'DELETE FROM hil_booking_attendees WHERE booking_id = ? AND user_id = ?',
                [bookingId, userId]
            );
            
            res.json({ success: true, message: 'Team member removed successfully' });
        } catch (error) {
            console.error('Error removing team member:', error);
            res.status(500).json({ error: 'Error removing team member' });
        }
    });

    return router;
};