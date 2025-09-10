# Building Windows Executable

## Quick Build
Run the batch file:
```cmd
build-exe.bat
```

## Manual Build
1. Install pkg globally:
```cmd
npm install -g pkg
```

2. Install dependencies:
```cmd
npm install
```

3. Build executable:
```cmd
npm run build-exe
```

## Output
- **File**: `inventory-management.exe`
- **Size**: ~50-80MB (includes Node.js runtime)
- **Requirements**: Windows 10/11, MySQL server

## Running the Executable
1. Ensure MySQL is running
2. Update database credentials in the executable's directory
3. Run: `inventory-management.exe`
4. Access: http://localhost:3000

## Notes
- All EJS templates, static files, and routes are bundled
- MySQL connection must be configured before running
- Default port: 3000 (configurable via environment)