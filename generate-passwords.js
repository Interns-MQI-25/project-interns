const bcrypt = require('bcryptjs');

async function generateHashedPasswords() {
    const passwords = {
        admin: 'mqi-pu',
        manager: 'manager123',
        employee: 'employee123'
    };

    console.log('Generated hashed passwords:');
    console.log('==========================');
    
    for (const [role, password] of Object.entries(passwords)) {
        const hashed = await bcrypt.hash(password, 10);
        console.log(`${role}: ${hashed}`);
    }
}

generateHashedPasswords().catch(console.error);
