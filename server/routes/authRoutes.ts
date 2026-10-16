import { Router } from 'express';
import { db } from '../db/database.js';
import { User, Driver } from '../../src/types/index.js';

export const authRouter = Router();

// Get active Drivers Roster for official dispatch, administration, and fleet schedules
authRouter.get('/drivers-roster', (req, res) => {
  const roster = db.drivers.map(driver => {
    const bus = db.buses.find(b => b.id === driver.assigned_bus_id);
    const route = db.routes.find(r => r.id === driver.assigned_route_id);
    return {
      id: driver.id,
      driver_code: driver.driver_code,
      name: driver.name,
      phone: driver.phone,
      status: driver.status,
      assigned_bus_id: driver.assigned_bus_id,
      bus_registration: bus ? bus.registration_number : 'KA 01 AB 1234',
      bus_model: bus ? bus.model : 'KSRTC Express',
      assigned_route_id: driver.assigned_route_id,
      route_name: route ? route.route_name : 'Karnataka Corridor'
    };
  });
  res.json({ drivers: roster });
});

// Google Authentication endpoint for passengers
authRouter.post('/google', (req, res) => {
  const { uid, email, name, photoURL } = req.body;

  if (!email && !uid) {
    return res.status(400).json({ error: 'Google profile information (email/uid) is required' });
  }

  const userEmail = email || `${uid}@passenger.ksrtc`;
  const userName = name || userEmail.split('@')[0] || 'KSRTC Passenger';

  // Check if passenger already exists
  let user = db.users.find(
    u => (u.email && u.email.toLowerCase() === userEmail.toLowerCase()) || u.id === `google-${uid}`
  );

  if (!user) {
    user = {
      id: uid ? `google-${uid}` : `user-${Date.now()}`,
      name: userName,
      email: userEmail,
      phone: '+91 98450 ' + Math.floor(10000 + Math.random() * 90000),
      role: 'passenger',
      created_at: new Date().toISOString()
    };
    db.users.push(user);
    db.saveToFile();
  }

  return res.json({
    token: `firebase-auth-${user.id}`,
    user,
    role: 'passenger',
    authProvider: 'google.com'
  });
});

// Login endpoint supporting Driver (by Driver ID e.g. DRV-101 + password), Passenger, and Admin
authRouter.post('/login', (req, res) => {
  const { identifier, email, phone, password, role, driverId, driver_code, username, userId, adminEmail } = req.body;
  const rawId = identifier || email || phone || driverId || driver_code || username || userId || adminEmail;

  if (!rawId) {
    return res.status(400).json({ error: 'Driver ID, Email, or Phone is required' });
  }

  const cleanIdentifier = String(rawId).trim();

  // 1. Driver login via Driver ID (e.g. "DRV-101", "DRV-102", etc.) or driver email/phone
  const isDriverId = cleanIdentifier.toUpperCase().startsWith('DRV-');
  const matchedDriver = db.drivers.find(
    d => d.driver_code.toUpperCase() === cleanIdentifier.toUpperCase() ||
         d.phone === cleanIdentifier ||
         (d.driver_code.toLowerCase() === cleanIdentifier.toLowerCase())
  );

  if (isDriverId || matchedDriver || role === 'driver') {
    if (!matchedDriver) {
      return res.status(404).json({
        error: `No registered driver found with ID "${cleanIdentifier}". Please check your KSRTC Driver ID.`
      });
    }

    const driver = matchedDriver;

    // Check if access was revoked by admin
    if (driver.status === 'suspended' || (driver as any).access_revoked) {
      return res.status(403).json({
        error: `ACCESS REVOKED: All permissions and cockpit access for Driver ${driver.driver_code} (${driver.name}) have been revoked by KSRTC Administration. Contact depot control.`
      });
    }
    
    // Verify driver password (custom password set by admin, or user.password, or default fallback)
    let user = db.users.find(u => u.id === driver.user_id);
    const assignedPassword = (driver.password || user?.password || '').trim();

    if (assignedPassword) {
      if (!password || password.trim() !== assignedPassword) {
        return res.status(401).json({
          error: `Invalid credentials for Driver ID ${driver.driver_code}. Please enter the password assigned by Depot Administration.`
        });
      }
    } else {
      // Fallback if no specific password was configured
      const validDefaults = ['pass123', 'driver123', 'admin123', 'password', 'ksrtc123', driver.driver_code.toLowerCase()];
      if (password && !validDefaults.includes(password.trim().toLowerCase())) {
        return res.status(401).json({
          error: `Invalid credentials for Driver ID ${driver.driver_code}. Please check your password.`
        });
      }
    }

    if (!user) {
      user = {
        id: driver.user_id,
        name: driver.name,
        email: `${driver.driver_code.toLowerCase()}@ksrtc.in`,
        password: assignedPassword || 'pass123',
        phone: driver.phone,
        role: 'driver' as const,
        created_at: driver.created_at
      };
      db.users.push(user);
      db.saveToFile();
    }

    return res.json({
      token: `ksrtc-auth-driver-${driver.id}-${Date.now()}`,
      user,
      driver
    });
  }

  // 2. Admin login check
  const isImtiyaz = cleanIdentifier.toLowerCase() === 'moadimtiyaz@gmail.com';
  const foundAdmin = db.users.find(
    u => u.role === 'admin' && (u.email.toLowerCase() === cleanIdentifier.toLowerCase() || u.id === cleanIdentifier)
  );

  if (isImtiyaz || foundAdmin || cleanIdentifier.toLowerCase().includes('admin') || role === 'admin') {
    // A. Specific credential check for Chief Transport Controller Mohammed Imtiyaz
    if (isImtiyaz) {
      if (password !== '9945323328@imti') {
        return res.status(401).json({
          error: 'Invalid password for Super Administrator Mohammed Imtiyaz. Access denied.'
        });
      }

      let superAdmin = db.users.find(u => u.email.toLowerCase() === 'moadimtiyaz@gmail.com');
      if (!superAdmin) {
        superAdmin = {
          id: 'user-admin-imtiyaz',
          name: 'Mohammed Imtiyaz (Chief Transport Controller & Super Admin)',
          email: 'moadimtiyaz@gmail.com',
          phone: '+91 99453 23328',
          role: 'admin',
          created_at: new Date().toISOString()
        };
        db.users.unshift(superAdmin);
        db.saveToFile();
      }

      db.logAudit(
        { name: superAdmin.name, email: superAdmin.email, role: 'super_admin' },
        'SUPER_ADMIN_LOGIN',
        'AUTH_GATEWAY',
        'Chief Transport Officer Mohammed Imtiyaz authenticated to Central Command Room.'
      );

      return res.json({
        token: `ksrtc-auth-admin-${superAdmin.id}-${Date.now()}`,
        user: superAdmin,
        admin_level: 'super_admin'
      });
    }

    // B. Registered database admin verification
    if (foundAdmin) {
      const storedPassword = (foundAdmin as any).password || '9945323328@imti';
      const isValidPassword =
        password === storedPassword ||
        password === '9945323328@imti' ||
        password === 'admin123' ||
        password === 'password' ||
        password === 'admin';

      if (!isValidPassword) {
        return res.status(401).json({
          error: `Invalid password for Administrator account ${foundAdmin.email}. Access denied.`
        });
      }

      if ((foundAdmin as any).status === 'suspended') {
        return res.status(403).json({
          error: `Administrative access for ${foundAdmin.name} has been suspended by Chief Transport Controller.`
        });
      }

      db.logAudit(
        { name: foundAdmin.name, email: foundAdmin.email, role: 'admin' },
        'ADMIN_LOGIN',
        'AUTH_GATEWAY',
        `Admin officer ${foundAdmin.name} (${foundAdmin.email}) logged into Divisional Control.`
      );

      return res.json({
        token: `ksrtc-auth-admin-${foundAdmin.id}-${Date.now()}`,
        user: foundAdmin,
        admin_level: (foundAdmin as any).admin_level || 'divisional_controller'
      });
    }

    // C. Fallback for generic admin query
    const validAdminFallbacks = ['9945323328@imti', 'admin123', 'password', 'admin', 'ksrtc123'];
    if (password && !validAdminFallbacks.includes(password.trim().toLowerCase())) {
      return res.status(401).json({ error: 'Invalid password for KSRTC Administration.' });
    }

    const adminUser = db.users.find(u => u.role === 'admin') || {
      id: 'user-admin-imtiyaz',
      name: 'Mohammed Imtiyaz (Chief Transport Controller & Super Admin)',
      email: 'moadimtiyaz@gmail.com',
      phone: '+91 99453 23328',
      role: 'admin' as const,
      created_at: new Date().toISOString()
    };

    return res.json({
      token: `ksrtc-auth-admin-${adminUser.id}-${Date.now()}`,
      user: adminUser,
      admin_level: 'super_admin'
    });
  }

  // 3. Passenger lookup or creation
  const user = db.users.find(
    u => u.email.toLowerCase() === cleanIdentifier.toLowerCase() || u.phone === cleanIdentifier
  );

  if (!user) {
    // If not found and logging in as passenger, create passenger account
    const newUser: User = {
      id: `user-${Date.now()}`,
      name: cleanIdentifier.split('@')[0] || 'Passenger',
      email: cleanIdentifier.includes('@') ? cleanIdentifier : `${cleanIdentifier}@passenger.ksrtc`,
      phone: cleanIdentifier.includes('@') ? '+91 98450 00000' : cleanIdentifier,
      role: 'passenger',
      created_at: new Date().toISOString()
    };
    db.users.push(newUser);
    db.saveToFile();
    return res.json({ token: `ksrtc-auth-passenger-${newUser.id}-${Date.now()}`, user: newUser });
  }

  let driverProfile: Driver | undefined;
  if (user.role === 'driver') {
    driverProfile = db.drivers.find(d => d.user_id === user.id);
  }

  return res.json({
    token: `ksrtc-auth-${user.role}-${user.id}-${Date.now()}`,
    user,
    driver: driverProfile
  });
});

// Signup endpoint for passengers
authRouter.post('/signup', (req, res) => {
  const { name, email, phone, role } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required' });
  }

  const existing = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    return res.status(409).json({ error: 'A user with this email already exists' });
  }

  const assignedRole = role === 'admin' ? 'admin' : (role === 'driver' ? 'driver' : 'passenger');

  const newUser: User = {
    id: `user-${Date.now()}`,
    name,
    email,
    phone: phone || '',
    role: assignedRole,
    created_at: new Date().toISOString()
  };

  db.users.push(newUser);
  db.saveToFile();

  res.status(201).json({
    token: `ksrtc-auth-${newUser.role}-${newUser.id}-${Date.now()}`,
    user: newUser
  });
});

// Get current profile
authRouter.get('/me', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'No authorization header provided' });
  }

  const token = authHeader.replace('Bearer ', '');
  const parts = token.split('-');
  const userId = parts.slice(3, parts.length - 1).join('-') || parts.slice(3).join('-');

  const user = db.users.find(u => u.id === userId || token.includes(u.id));
  if (!user) {
    return res.status(401).json({ error: 'Session expired. Please log in again.' });
  }

  let driverProfile: Driver | undefined;
  if (user.role === 'driver') {
    driverProfile = db.drivers.find(d => d.user_id === user.id);
  }

  res.json({ user, driver: driverProfile });
});
