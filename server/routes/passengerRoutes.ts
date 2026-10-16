import { Router } from 'express';
import { db } from '../db/database.js';
import { FavoriteItem, PassengerReport, NotificationItem } from '../../src/types/index.js';

export const passengerRouter = Router();

// 1. Get user favorites
passengerRouter.get('/favorites', (req, res) => {
  const userId = String(req.query.userId || 'user-passenger-1');
  const favs = db.favourites
    .filter(f => f.user_id === userId)
    .map(f => {
      const route = f.route_id ? db.getRouteWithStops(f.route_id) : undefined;
      const stop = f.stop_id ? db.getStopByCodeOrId(f.stop_id) : undefined;
      return { ...f, route, stop };
    });

  res.json({ favorites: favs });
});

// Add favorite route or stop
passengerRouter.post('/favorites', (req, res) => {
  const { user_id, route_id, stop_id } = req.body;
  const uid = user_id || 'user-passenger-1';

  // Prevent duplicate
  const existing = db.favourites.find(
    f => f.user_id === uid && ((route_id && f.route_id === route_id) || (stop_id && f.stop_id === stop_id))
  );

  if (existing) {
    return res.json({ message: 'Already favorited', favorite: existing });
  }

  const newFav: FavoriteItem = {
    id: `fav-${Date.now()}`,
    user_id: uid,
    route_id,
    stop_id,
    created_at: new Date().toISOString()
  };

  db.favourites.push(newFav);
  db.saveToFile();

  res.status(201).json({ message: 'Saved to favorites', favorite: newFav });
});

// Remove favorite
passengerRouter.delete('/favorites/:id', (req, res) => {
  const { id } = req.params;
  const idx = db.favourites.findIndex(f => f.id === id || f.route_id === id || f.stop_id === id);
  if (idx !== -1) {
    db.favourites.splice(idx, 1);
    db.saveToFile();
  }
  res.json({ message: 'Removed from favorites' });
});

// 2. Notifications
passengerRouter.get('/notifications', (req, res) => {
  const userId = String(req.query.userId || 'user-passenger-1');
  const notifs = db.notifications
    .filter(n => n.user_id === userId || n.user_id === 'all')
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  res.json({ notifications: notifs });
});

passengerRouter.put('/notifications/:id/read', (req, res) => {
  const { id } = req.params;
  const notif = db.notifications.find(n => n.id === id);
  if (notif) {
    notif.read_status = true;
    db.saveToFile();
  }
  res.json({ message: 'Notification marked as read' });
});

// 3. Submit Passenger Issue Report or Feedback
passengerRouter.post(['/reports', '/feedback'], (req, res) => {
  const { user_id, bus_id, trip_id, report_type, description, message, rating } = req.body;
  const desc = (description || message || `Rating: ${rating || 5}/5`).trim();
  const type = report_type || 'feedback';

  if (!desc) {
    return res.status(400).json({ error: 'Description or message is required' });
  }

  const newReport: PassengerReport = {
    id: `rep-${Date.now()}`,
    user_id: user_id || 'user-passenger-1',
    bus_id,
    trip_id,
    report_type: type as any,
    description: desc,
    status: 'pending',
    created_at: new Date().toISOString()
  };

  db.reports.push(newReport);
  db.saveToFile();

  res.status(201).json({
    message: 'Feedback submitted successfully. KSRTC grievance control room has been notified.',
    report: newReport
  });
});
