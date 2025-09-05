const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

let db;

// Initialize SQL.js database
initSqlJs().then(SQL => {
    const dbPath = path.join(process.cwd(), 'inventory.db');
    
    let data;
    if (fs.existsSync(dbPath)) {
        data = fs.readFileSync(dbPath);
    }
    
    db = new SQL.Database(data);
    
    // Save database periodically
    setInterval(() => {
        if (db) {
            const data = db.export();
            fs.writeFileSync(dbPath, Buffer.from(data));
        }
    }, 5000);
});

module.exports = {
    exec: (sql) => db.exec(sql),
    prepare: (sql) => ({
        run: (...params) => {
            const stmt = db.prepare(sql);
            stmt.bind(params);
            stmt.step();
            return { lastInsertRowid: db.getRowsModified(), changes: db.getRowsModified() };
        },
        get: (...params) => {
            const stmt = db.prepare(sql);
            stmt.bind(params);
            if (stmt.step()) {
                return stmt.getAsObject();
            }
            return null;
        },
        all: (...params) => {
            const stmt = db.prepare(sql);
            stmt.bind(params);
            const results = [];
            while (stmt.step()) {
                results.push(stmt.getAsObject());
            }
            return results;
        }
    })
};