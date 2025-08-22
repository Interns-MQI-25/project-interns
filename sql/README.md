# SQL Files Directory

This directory contains all SQL-related files for the Marquardt India Pvt. Ltd. product management system.

## Main Database Files

### `database.sql`
- **Purpose**: Main production database schema
- **Description**: Complete database structure for the product management system
- **Usage**: Used for production deployment and setup

### `database-test.sql`
- **Purpose**: Test database schema
- **Description**: Test-specific version of the database schema
- **Usage**: Used for testing and CI/CD pipelines

## Migration Files

### `add-monitor-request-feature.sql`
- **Purpose**: Add monitor-to-monitor request functionality
- **Description**: Database changes to support monitor requesting products from other monitors
- **Usage**: Run after initial database setup to add this feature

### `add-return-status.sql`
- **Purpose**: Add return status tracking
- **Description**: Adds return_status column to product_assignments table
- **Usage**: Migration to track return request status

### `fix-return-date-column.sql`
- **Purpose**: Fix return date column issues
- **Description**: Database fixes for return date handling
- **Usage**: Run to fix any return date column problems

### `fix_quantities.sql`
- **Purpose**: Fix quantity calculation issues
- **Description**: Corrects product quantity calculations in the database
- **Usage**: Run to fix quantity-related data issues

## Sample Data Files

### `add_sample_assignments.sql`
- **Purpose**: Add sample assignment data
- **Description**: Inserts sample product assignments for testing
- **Usage**: Used for development and testing with sample data

## File Organization

All SQL files are organized in this directory for:
- Easy maintenance and version control
- Clear separation from application code
- Better organization of database-related scripts
- Simplified deployment and migration processes

## Usage Instructions

1. **Initial Setup**: Run `database.sql` first to create the main schema
2. **Testing**: Use `database-test.sql` for test environments
3. **Migrations**: Run migration files in chronological order as needed
4. **Sample Data**: Use sample data files for development/testing environments

## Important Notes

- Always backup your database before running any migration scripts
- Test migrations in a development environment first
- Check dependencies between migration files before running
- Follow the proper sequence when applying multiple migrations

## Important Steps
1. first make changes in the coloumn 
