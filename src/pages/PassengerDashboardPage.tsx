import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { Route, Stop, LiveBusTelemetry, NotificationItem } from '../types';
import {
  Ticket,
  QrCode,
  CreditCard,
  Radio,
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle,
  Bus,
  Search,
  ArrowRight,
  ShieldCheck,
  Calendar,
  User,
  Heart,
  FileText,
  PhoneCall,
  Sparkles,
  Download,
  Share2,
  ExternalLink,
  ChevronRight,
  X,
  Navigation2
} from 'lucide-react';

interface ActiveTicket {
  id: string;
  pnr: string;
  route_id: string;
  route_name: string;
  route_number: string;
  origin: string;
  destination: string;
  bus_id: string;
  bus_registration: string;
  service_type: string;
  seat_number: string;
  departure_time: string;
  boarding_stop: string;
  fare_paid: number;
  qr_code_data: string;
  status: 'confirmed' | 'boarding' | 'completed';
}

export const PassengerDashboardPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'tickets' | 'book' | 'pass' | 'favorites' | 'history' | 'grievance'>('tickets');
  const [routes, setRoutes] = useState<Route[]>([]);
  const [stops, setStops] = useState<Stop[]>([]);
  const [liveBuses, setLiveBuses] = useState<LiveBusTelemetry[]>([]);
  const [showQrModal, setShowQrModal] = useState(false);
  const [selectedTicketForQr, setSelectedTicketForQr] = useState<ActiveTicket | null>(null);

  // Booking Form State
  const [fromCity, setFromCity] = useState('Tumkur KSRTC Bus Stand');
  const [toCity, setToCity] = useState('Bengaluru Kempegowda Majestic');
  const [serviceType, setServiceType] = useState('Airavat Club Class (Multi-Axle AC)');
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [passRenewMsg, setPassRenewMsg] = useState<string | null>(null);

  // Active tickets state - persisted in localStorage
  const [activeTickets, setActiveTickets] = useState<ActiveTicket[]>(() => {
    try {
      const saved = localStorage.getItem('ksrtc_passenger_tickets');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  const [favoritesCount, setFavoritesCount] = useState(0);

  // Load live routes, telemetry and user favorites
  useEffect(() => {
    Promise.allSettled([
      api.getRoutes(),
      api.getStops(),
      api.getLiveBuses(),
      api.getFavorites()
    ]).then(([rRes, sRes, bRes, fRes]) => {
      if (rRes.status === 'fulfilled') setRoutes(rRes.value.routes || []);
      if (sRes.status === 'fulfilled') setStops(sRes.value.stops || []);
      if (bRes.status === 'fulfilled') setLiveBuses(bRes.value.buses || []);
      if (fRes.status === 'fulfilled') {
        const totalFavs = (fRes.value.routes?.length || 0) + (fRes.value.stops?.length || 0);
        setFavoritesCount(totalFavs);
      }
    });
  }, []);

  // Handle Instant Booking
  const handleBookTicket = (e: React.FormEvent) => {
    e.preventDefault();
    const newTkt: ActiveTicket = {
      id: `tkt-${Date.now()}`,
      pnr: `KSRTC-${Math.floor(1000000 + Math.random() * 9000000)}`,
      route_id: 'route-152',
      route_name: `${fromCity.split(' ')[0]} ⇄ ${toCity.split(' ')[0]} Express`,
      route_number: '152',
      origin: fromCity,
      destination: toCity,
      bus_id: 'bus-ka01ab1234',
      bus_registration: 'KA 01 AB 1234',
      service_type: serviceType,
      seat_number: `${Math.floor(1 + Math.random() * 25)}${['A', 'B', 'C', 'D'][Math.floor(Math.random() * 4)]} (Window)`,
      departure_time: 'Today • In 25 Minutes',
      boarding_stop: fromCity,
      fare_paid: serviceType.includes('Airavat') ? 160 : 95,
      qr_code_data: `KSRTC:PNR:${Math.floor(1000000 + Math.random() * 9000000)}:PASSENGER:VALID`,
      status: 'confirmed'
    };

    const updated = [newTkt, ...activeTickets];
    setActiveTickets(updated);
    try {
      localStorage.setItem('ksrtc_passenger_tickets', JSON.stringify(updated));
    } catch {}
    setBookingSuccess(true);
    setTimeout(() => {
      setBookingSuccess(false);
      setActiveTab('tickets');
    }, 1200);
  };

  const activeTicket = activeTickets[0];

  return (
    <div className="min-h-screen bg-[#0B0D11] text-[#E0E0E0] pb-16">
      {/* Top Banner & Profile Bar */}
      <div className="bg-[#12151D] border-b border-[#202532] py-6 sm:py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 font-extrabold text-xl shadow-lg shadow-blue-600/10">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'P'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Namaskara, {user?.name || 'Passenger'}!
                </h1>
                <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  <ShieldCheck className="w-3 h-3" />
                  Verified Passenger
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {user?.email || 'passenger@ksrtc.in'} • Karnataka State Smart Passenger Account
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2.5 self-end md:self-auto flex-wrap">
            <Link
              to="/planner"
              className="flex items-center gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-md shadow-blue-600/20 transition-all"
            >
              <Navigation2 className="w-3.5 h-3.5 text-cyan-300" />
              <span>A-to-B Trip Planner</span>
            </Link>
            <Link
              to="/track"
              className="flex items-center gap-1.5 bg-[#181C26] hover:bg-[#202534] text-slate-200 text-xs font-bold px-3.5 py-2 rounded-xl border border-[#252C3D] transition-colors"
            >
              <Radio className="w-3.5 h-3.5 text-emerald-400" />
              <span>Live Radar</span>
            </Link>
            <button
              onClick={logout}
              className="text-xs font-semibold text-slate-400 hover:text-white px-3 py-2 rounded-xl bg-[#181C26] hover:bg-[#202534] border border-[#252C3D] transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Quick KPI Stats */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
          <div className="bg-[#161A24] p-3.5 rounded-2xl border border-[#242A38]">
            <div className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
              <Ticket className="w-3.5 h-3.5 text-blue-400" />
              <span>Active Tickets</span>
            </div>
            <div className="text-xl font-black text-white mt-1">
              {activeTickets.length} <span className="text-xs font-normal text-emerald-400">Ready to Board</span>
            </div>
          </div>

          <div className="bg-[#161A24] p-3.5 rounded-2xl border border-[#242A38]">
            <div className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-purple-400" />
              <span>Digital Bus Pass</span>
            </div>
            <div className="text-xl font-black text-white mt-1">
              Sarige <span className="text-xs font-bold text-emerald-400">Active (Monthly)</span>
            </div>
          </div>

          <div className="bg-[#161A24] p-3.5 rounded-2xl border border-[#242A38]">
            <div className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>Green Impact</span>
            </div>
            <div className="text-xl font-black text-white mt-1">
              {(activeTickets.length * 4.2).toFixed(1)} kg <span className="text-xs font-normal text-slate-400">CO₂ Saved</span>
            </div>
          </div>

          <div className="bg-[#161A24] p-3.5 rounded-2xl border border-[#242A38]">
            <div className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
              <Heart className="w-3.5 h-3.5 text-rose-400" />
              <span>Favorites Saved</span>
            </div>
            <div className="text-xl font-black text-white mt-1">
              {favoritesCount} {favoritesCount === 1 ? 'Item' : 'Items'} <span className="text-xs font-normal text-slate-400">Quick Tracking</span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-[#202532] text-xs font-bold scrollbar-none">
          <button
            onClick={() => setActiveTab('tickets')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all shrink-0 ${
              activeTab === 'tickets'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-white hover:bg-[#151923]'
            }`}
          >
            <Ticket className="w-4 h-4" />
            <span>Active Tickets & QR Pass ({activeTickets.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('book')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all shrink-0 ${
              activeTab === 'book'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-white hover:bg-[#151923]'
            }`}
          >
            <Search className="w-4 h-4" />
            <span>Book Seat / Ticket</span>
          </button>

          <button
            onClick={() => setActiveTab('pass')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all shrink-0 ${
              activeTab === 'pass'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-white hover:bg-[#151923]'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Smart Bus Pass</span>
          </button>

          <button
            onClick={() => setActiveTab('favorites')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all shrink-0 ${
              activeTab === 'favorites'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-white hover:bg-[#151923]'
            }`}
          >
            <Heart className="w-4 h-4" />
            <span>Saved Routes & Stops</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all shrink-0 ${
              activeTab === 'history'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-white hover:bg-[#151923]'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Travel History</span>
          </button>

          <button
            onClick={() => setActiveTab('grievance')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all shrink-0 ${
              activeTab === 'grievance'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-white hover:bg-[#151923]'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Grievances & Help</span>
          </button>
        </div>
      </div>

      {/* Main Content Areas */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {/* TAB 1: ACTIVE TICKETS & QR PASS */}
        {activeTab === 'tickets' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">Your Confirmed Boarding Passes</h2>
                <p className="text-xs text-slate-400">Present the digital QR code to the KSRTC Bus Conductor upon boarding.</p>
              </div>
              <button
                onClick={() => setActiveTab('book')}
                className="text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1"
              >
                <span>+ Book Another Ticket</span>
              </button>
            </div>

            {activeTickets.length === 0 ? (
              <div className="bg-[#141720] border border-[#222734] rounded-3xl p-8 text-center space-y-3">
                <Ticket className="w-12 h-12 text-slate-500 mx-auto" />
                <h3 className="text-base font-bold text-white">No Active Tickets Found</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  You do not have any upcoming bus journeys. Book an express ticket or track approaching buses.
                </p>
                <button
                  onClick={() => setActiveTab('book')}
                  className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2 rounded-xl inline-block"
                >
                  Book a Ticket Now
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {activeTickets.map(ticket => (
                  <div
                    key={ticket.id}
                    className="bg-gradient-to-b from-[#181C26] to-[#12151D] border border-[#262C3C] rounded-3xl p-6 relative overflow-hidden shadow-2xl space-y-5"
                  >
                    {/* Top ticket ribbon */}
                    <div className="flex items-center justify-between pb-4 border-b border-[#252C3D]">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center">
                          <Bus className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <div className="text-xs font-extrabold text-white">KSRTC Electronic Ticket</div>
                          <div className="text-[10px] text-slate-400 font-mono">PNR: {ticket.pnr}</div>
                        </div>
                      </div>
                      <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                        {ticket.status}
                      </span>
                    </div>

                    {/* Route Info */}
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">ORIGIN</span>
                        <div className="text-base font-extrabold text-white leading-tight">{ticket.origin.split(' ')[0]}</div>
                        <div className="text-[11px] text-slate-400">{ticket.boarding_stop}</div>
                      </div>

                      <div className="flex flex-col items-center px-4">
                        <span className="text-[10px] font-mono text-blue-400 font-bold">R-{ticket.route_number}</span>
                        <div className="w-20 h-0.5 bg-blue-500/40 relative my-1">
                          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-blue-500 ring-4 ring-[#181C26]"></div>
                        </div>
                        <span className="text-[10px] text-slate-500">Non-Stop Express</span>
                      </div>

                      <div className="space-y-1 text-right">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">DESTINATION</span>
                        <div className="text-base font-extrabold text-white leading-tight">{ticket.destination.split(' ')[0]}</div>
                        <div className="text-[11px] text-slate-400">Majestic Terminal</div>
                      </div>
                    </div>

                    {/* Meta Specifications */}
                    <div className="grid grid-cols-3 gap-2 bg-[#141722] p-3 rounded-2xl border border-[#222838] text-xs">
                      <div>
                        <div className="text-[10px] text-slate-400">Seat Number</div>
                        <div className="font-extrabold text-blue-400">{ticket.seat_number}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400">Bus Vehicle</div>
                        <div className="font-extrabold text-white font-mono">{ticket.bus_registration}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400">Departure</div>
                        <div className="font-extrabold text-emerald-400">{ticket.departure_time}</div>
                      </div>
                    </div>

                    {/* Bottom Action Buttons */}
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => {
                          setSelectedTicketForQr(ticket);
                          setShowQrModal(true);
                        }}
                        className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition-all"
                      >
                        <QrCode className="w-4 h-4" />
                        <span>Show Boarding QR</span>
                      </button>

                      <Link
                        to={`/track?bus=${ticket.bus_id}&route=${ticket.route_id}`}
                        className="bg-[#1E2330] hover:bg-[#282F40] text-slate-200 text-xs font-bold py-3 px-4 rounded-xl flex items-center gap-1.5 border border-[#2D3548] transition-colors"
                      >
                        <Radio className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Track Bus</span>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: INSTANT BOOKING */}
        {activeTab === 'book' && (
          <div className="max-w-2xl mx-auto bg-[#141720] border border-[#232836] rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex items-center gap-3 border-b border-[#232836] pb-4">
              <div className="w-10 h-10 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                <Ticket className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-white">Instant KSRTC Express Booking</h2>
                <p className="text-xs text-slate-400">Reserve your seat on high-frequency intercity express buses.</p>
              </div>
            </div>

            {bookingSuccess && (
              <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <div>
                  <div className="font-bold text-white">Ticket Confirmed Successfully!</div>
                  <div>Your digital QR boarding pass has been generated and added to your wallet.</div>
                </div>
              </div>
            )}

            <form onSubmit={handleBookTicket} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Origin Bus Stand</label>
                  <select
                    value={fromCity}
                    onChange={(e) => setFromCity(e.target.value)}
                    className="w-full bg-[#1A1D27] border border-[#2B3142] rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="Tumkur KSRTC Bus Stand">Tumkur KSRTC Bus Stand</option>
                    <option value="Mysuru Central Suburban Bus Stand">Mysuru Central Suburban Stand</option>
                    <option value="Hassan KSRTC Central Stand">Hassan KSRTC Central Stand</option>
                    <option value="Hubballi Old Bus Stand">Hubballi Old Bus Stand</option>
                    <option value="Bengaluru Kempegowda Majestic">Bengaluru Kempegowda Majestic</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Destination Bus Stand</label>
                  <select
                    value={toCity}
                    onChange={(e) => setToCity(e.target.value)}
                    className="w-full bg-[#1A1D27] border border-[#2B3142] rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="Bengaluru Kempegowda Majestic">Bengaluru Kempegowda Majestic</option>
                    <option value="Tumkur KSRTC Bus Stand">Tumkur KSRTC Bus Stand</option>
                    <option value="Mysuru Central Suburban Bus Stand">Mysuru Central Suburban Stand</option>
                    <option value="Davanagere KSRTC Stand">Davanagere KSRTC Stand</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Service Class / Bus Model</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {[
                    { id: 'Airavat Club Class (Multi-Axle AC)', name: 'Airavat Club Class', price: '₹160', desc: 'Volvo Multi-Axle AC' },
                    { id: 'Rajahamsa Executive', name: 'Rajahamsa', price: '₹120', desc: 'Deluxe Reclining 2+2' },
                    { id: 'Karnataka Sarige Express', name: 'Sarige Express', price: '₹95', desc: 'Frequent Non-Stop' }
                  ].map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setServiceType(item.id)}
                      className={`p-3 rounded-2xl border text-left transition-all ${
                        serviceType === item.id
                          ? 'bg-blue-600/20 border-blue-500 text-white shadow-sm'
                          : 'bg-[#181C26] border-[#262C3C] text-slate-300 hover:border-slate-600'
                      }`}
                    >
                      <div className="font-extrabold text-xs text-white">{item.name}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{item.desc}</div>
                      <div className="text-xs font-black text-blue-400 mt-2">{item.price}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Fare & Journey summary */}
              <div className="bg-[#181C26] p-4 rounded-2xl border border-[#252C3D] flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-400">Total Payable Fare</div>
                  <div className="text-xl font-black text-white">
                    {serviceType.includes('Airavat') ? '₹160.00' : serviceType.includes('Rajahamsa') ? '₹120.00' : '₹95.00'}
                  </div>
                  <div className="text-[10px] text-emerald-400">Includes Passenger Safety Insurance & GST</div>
                </div>

                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold py-3 px-6 rounded-xl shadow-lg shadow-blue-600/30 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <span>Pay & Generate Boarding QR</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 3: SMART BUS PASS */}
        {activeTab === 'pass' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div>
              <h2 className="text-lg font-bold text-white">Karnataka Sarige Smart Pass</h2>
              <p className="text-xs text-slate-400">Your state-approved concessional daily/monthly travel card.</p>
            </div>

            {/* Smart Card Visual */}
            <div className="bg-gradient-to-tr from-[#1E2536] via-[#161B28] to-[#252C40] border border-[#30384D] rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center font-black text-white text-xs">
                    KSRTC
                  </div>
                  <div>
                    <div className="text-xs font-extrabold text-white">SARIGE PASS CARD</div>
                    <div className="text-[10px] text-slate-400">Govt. of Karnataka Transit Authority</div>
                  </div>
                </div>
                <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono px-2 py-0.5 rounded-md font-bold">
                  VALID TILL 30 SEP 2026
                </span>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="space-y-1">
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider">PASS HOLDER</div>
                  <div className="text-base font-extrabold text-white">{user?.name || 'Verified Commuter'}</div>
                  <div className="text-xs text-slate-400 font-mono">ID: KSRTC-PASS-{user?.id ? user.id.replace('user-', '').toUpperCase() : '8841-TU'}</div>
                </div>

                <div className="bg-white p-2 rounded-xl">
                  {/* Digital Security QR Token */}
                  <div className="w-16 h-16 bg-slate-900 flex items-center justify-center rounded">
                    <QrCode className="w-12 h-12 text-white" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 pt-3 border-t border-[#2A3245] text-xs">
                <div>
                  <div className="text-[10px] text-slate-400">Pass Category</div>
                  <div className="font-bold text-white">Monthly All-Route</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400">Division</div>
                  <div className="font-bold text-white">Tumkur & Bengaluru</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400">Daily Trips</div>
                  <div className="font-bold text-emerald-400">Unlimited</div>
                </div>
              </div>
            </div>

            {passRenewMsg && (
              <div className="bg-emerald-500/15 border border-emerald-500/30 rounded-2xl p-4 text-xs text-emerald-300 flex items-center justify-between">
                <span>{passRenewMsg}</span>
                <button onClick={() => setPassRenewMsg(null)} className="text-emerald-400 font-bold ml-2">Dismiss</button>
              </div>
            )}

            <div className="bg-[#141720] border border-[#232836] rounded-2xl p-4 flex items-center justify-between text-xs">
              <div className="text-slate-300">
                Need to renew your pass or change concessional zone?
              </div>
              <button
                onClick={() => setPassRenewMsg('Smart pass renewal request verified. Automated verification SMS link dispatched to registered mobile.')}
                className="bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 font-bold px-3 py-1.5 rounded-lg transition-colors"
              >
                Renew / Extend Pass
              </button>
            </div>
          </div>
        )}

        {/* TAB 4: SAVED FAVORITES & LIVE TRACKING SHORTCUT */}
        {activeTab === 'favorites' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-white">Pinned Routes & Frequent Terminals</h2>
              <p className="text-xs text-slate-400">Monitor live bus movements along your regular daily commute.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {routes.slice(0, 4).map(r => (
                <div key={r.id} className="bg-[#141720] border border-[#232836] rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-extrabold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded text-xs">
                        Route {r.route_number}
                      </span>
                      <span className="text-xs font-bold text-white truncate max-w-[220px]">{r.route_name}</span>
                    </div>
                    <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded font-bold">
                      {r.estimated_duration_min} min
                    </span>
                  </div>

                  <div className="text-xs text-slate-400 flex items-center justify-between">
                    <span>{r.origin}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                    <span>{r.destination}</span>
                  </div>

                  <div className="pt-2 border-t border-[#232836] flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Bus className="w-3.5 h-3.5 text-blue-400" />
                      <span>{liveBuses.filter(b => b.route_id === r.id).length || 1} Buses on road</span>
                    </span>
                    <Link
                      to={`/track?route=${r.id}`}
                      className="text-xs font-bold text-blue-400 hover:text-white flex items-center gap-1"
                    >
                      <span>Track on Map</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: TRAVEL HISTORY */}
        {activeTab === 'history' && (
          <div className="bg-[#141720] border border-[#232836] rounded-3xl p-6 space-y-4">
            <h2 className="text-base font-extrabold text-white">Recent Journey Ledger</h2>
            <div className="divide-y divide-[#232836]">
              {[
                { date: 'Yesterday • 05:40 PM', route: 'Bengaluru Majestic ➔ Tumkur KSRTC Stand', fare: '₹145', bus: 'KA 01 AB 1234', co2: '2.8 kg CO₂' },
                { date: '01 Sep 2026 • 08:15 AM', route: 'Tumkur KSRTC Stand ➔ Bengaluru Majestic', fare: '₹145', bus: 'KA 01 IJ 7890', co2: '2.8 kg CO₂' },
                { date: '28 Aug 2026 • 02:30 PM', route: 'Mysuru Suburban ➔ Bengaluru Majestic', fare: '₹220', bus: 'KA 09 CD 5678', co2: '5.6 kg CO₂' },
                { date: '24 Aug 2026 • 09:00 AM', route: 'Nelamangala Toll ➔ Majestic Terminal 1', fare: '₹45', bus: 'KA 13 EF 9012', co2: '1.2 kg CO₂' }
              ].map((trip, idx) => (
                <div key={idx} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-white">{trip.route}</div>
                    <div className="text-[11px] text-slate-400">{trip.date} • Bus {trip.bus}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-emerald-400">{trip.fare}</div>
                    <div className="text-[10px] text-slate-400 font-medium">{trip.co2} saved</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 6: GRIEVANCES & HELPLINE */}
        {activeTab === 'grievance' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="bg-[#141720] border border-[#232836] rounded-3xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-white">Passenger Grievance Tracker</h2>
                  <p className="text-xs text-slate-400">All submitted issues are monitored by the KSRTC Central Vigilance Cell.</p>
                </div>
                <Link
                  to="/reports"
                  className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-colors"
                >
                  Lodge New Grievance
                </Link>
              </div>

              <div className="space-y-3 pt-2">
                <div className="p-3.5 rounded-2xl bg-[#181C26] border border-[#242A38] flex items-center justify-between text-xs">
                  <div className="space-y-1">
                    <div className="font-bold text-white">Lost Umbrella on Airavat Seat 14B</div>
                    <div className="text-[11px] text-slate-400">Ticket PNR: KSRTC-9041288 • Logged 2 days ago</div>
                  </div>
                  <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    Under Investigation
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#181C26] border border-[#242A38] flex items-center justify-between text-xs">
                  <div className="space-y-1">
                    <div className="font-bold text-white">Appreciation for Smooth Driving on NH48</div>
                    <div className="text-[11px] text-slate-400">Driver Basavaraj Patil (DRV-101)</div>
                  </div>
                  <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    Resolved & Commended
                  </span>
                </div>
              </div>
            </div>

            {/* Emergency Contacts */}
            <div className="bg-[#181C26] border border-[#252C3D] rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <PhoneCall className="w-5 h-5 text-amber-400" />
                <div>
                  <div className="font-bold text-white">KSRTC 24x7 Control Room & Women Safety</div>
                  <div className="text-slate-400 text-[11px]">Toll-Free: 080-2222-1234 / 1800-425-0018</div>
                </div>
              </div>
              <Link
                to="/ivr"
                className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 font-bold px-3 py-1.5 rounded-xl transition-colors"
              >
                Open Voice IVR
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* QR Code Fullscreen / Modal */}
      {showQrModal && selectedTicketForQr && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#161922] border border-[#2B3244] rounded-3xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl relative animate-in fade-in zoom-in-95">
            <button
              onClick={() => setShowQrModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-[#202534] text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/30 text-blue-400 flex items-center justify-center mx-auto">
              <QrCode className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-extrabold text-white">Boarding Pass QR Code</h3>
              <p className="text-xs text-slate-400 font-mono mt-0.5">PNR: {selectedTicketForQr.pnr}</p>
            </div>

            {/* Big High-Contrast QR Code Display */}
            <div className="bg-white p-4 rounded-2xl shadow-inner mx-auto inline-block">
              <div className="w-48 h-48 bg-slate-900 rounded-xl flex flex-col items-center justify-center p-2 text-white relative">
                <QrCode className="w-36 h-36 text-white" />
                <div className="text-[10px] font-mono text-emerald-400 font-bold">KSRTC VERIFIED PASS</div>
              </div>
            </div>

            <div className="bg-[#1A1E2B] p-3 rounded-xl border border-[#262D40] text-xs text-slate-300 space-y-1 text-left">
              <div className="flex justify-between">
                <span className="text-slate-400">Passenger:</span>
                <span className="font-bold text-white">{user?.name || 'Verified Commuter'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Seat:</span>
                <span className="font-bold text-blue-400">{selectedTicketForQr.seat_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Bus:</span>
                <span className="font-mono text-white">{selectedTicketForQr.bus_registration}</span>
              </div>
            </div>

            <button
              onClick={() => setShowQrModal(false)}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 rounded-xl text-xs transition-colors"
            >
              Done / Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
