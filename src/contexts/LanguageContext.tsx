import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'en' | 'kn' | 'hi';

export interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, defaultText?: string) => string;
  isKannada: boolean;
  isHindi: boolean;
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    // Top Bar & Navigation
    'app.title': 'KSRTC SmartTrack',
    'app.subtitle': 'Karnataka State Road Transport',
    'topbar.tracking_active': 'KSRTC Real-Time Satellite GPS Fleet Tracking Active',
    'topbar.ivr_helpline': 'IVR Toll-Free: 080-2222-1234',
    'nav.live_map': 'Live Map',
    'nav.routes': 'Routes',
    'nav.stops': 'Stops & QR',
    'nav.ivr': 'IVR Voice',
    'nav.driver': 'Driver Cockpit',
    'nav.admin': 'Admin Fleet',
    'nav.login': 'Login',
    'nav.logout': 'Logout',
    'nav.favorites': 'Saved Favorites',
    'nav.notifications': 'Service Notifications',
    'nav.no_notifications': 'No new notifications',
    'nav.switch_role': 'Test Role Switch',
    'nav.passenger_app': 'Passenger App',
    'nav.driver_app': 'Driver GPS App',
    'nav.admin_app': 'Admin Control Room',

    // Language Selector
    'lang.select': 'Language',
    'lang.en': 'English',
    'lang.kn': 'ಕನ್ನಡ (Kannada)',
    'lang.hi': 'हिंदी (Hindi)',

    // Routes Page
    'routes.title': 'KSRTC Express Bus Routes & Timetables',
    'routes.subtitle': 'Database of active scheduled corridors with live GPS satellite tracking',
    'routes.search_placeholder': 'Search route number, city, origin or stop...',
    'routes.view_schedule': 'View All Stops & Schedule',
    'routes.track_live': 'Track Live Buses',
    'routes.save_favorite': 'Save Favorite',
    'routes.saved_favorite': 'Saved to Favorites!',
    'routes.active_buses_count': 'Bus(es) Currently Live on Route',
    'routes.driver_gps_active': 'Driver GPS actively broadcasting live speed and next stop ETAs',
    'routes.no_active_buses': 'No live buses are currently transmitting GPS on this corridor. Timetable stops are listed below.',
    'routes.stop_sequence': 'Route Stop Sequence',
    'routes.stops_count': 'Stops',
    'routes.corridor_explorer': 'Active Route Corridor Map Explorer',
    'routes.corridor_hint': 'Click any route corridor below or in the list to inspect its full geographic stops & live buses',
    'routes.distance': 'Distance',
    'routes.est_duration': 'Est. Duration',
    'routes.origin': 'Origin',
    'routes.destination': 'Destination',
    'routes.minutes': 'minutes',
    'routes.km': 'km',
    'routes.stop_number': 'Stop #',
    'routes.view_stop_qr': 'View Live Schedule & QR',

    // Map Controls & Labels
    'map.fit_route': 'Fit Route Corridor',
    'map.center_karnataka': 'Reset View',
    'map.toggle_stops': 'Stops',
    'map.toggle_buses': 'Live Buses',
    'map.style_voyager': 'Transit Map',
    'map.style_satellite': 'Satellite',
    'map.style_osm': 'Standard OSM',
    'map.style_dark': 'Dark Mode',
    'map.speed': 'Speed',
    'map.next_stop': 'Next Stop',
    'map.eta': 'ETA',
    'map.origin_terminal': 'Origin Terminal',
    'map.dest_terminal': 'Destination Terminal',
    'map.intermediate_stop': 'Intermediate Stop',
    'map.live_bus_tracking': 'Live Bus Tracking',
    'map.your_location': 'Your Current Location',

    // Live Tracking Page
    'tracking.title': 'Live Fleet Radar & Satellite GPS',
    'tracking.search_placeholder': 'Search bus number (KA 01 AB 1234), route...',
    'tracking.all_routes': 'All Route Corridors',
    'tracking.all_status': 'All Statuses',
    'tracking.live_only': 'Live GPS Only',
    'tracking.delayed_only': 'Delayed Only',
    'tracking.refresh': 'Refresh Fleet',
    'tracking.active_buses': 'Buses Live in Field',
    'tracking.select_bus_prompt': 'Select a bus from the sidebar to inspect real-time speed, telemetry & arrival times.',

    // Stop Details Page
    'stops.title': 'KSRTC Smart Bus Shelters & QR Codes',
    'stops.subtitle': 'Scan stop QR code at any shelter or call 080-2222-1234 for instant ETA without internet',
    'stops.search_placeholder': 'Search by 4-digit Stop Code (e.g. 1001) or Stop Name...',
    'stops.approaching_buses': 'Live Approaching Buses',
    'stops.routes_serviced': 'Routes Servicing this Shelter',
    'stops.print_qr': 'Print QR Signboard',
    'stops.qr_instructions': 'Scan with any smartphone camera for instant live schedule & bus arrivals',
    'stops.ivr_code_label': 'Dial toll-free 080-2222-1234 and enter Stop Code',

    // IVR Page
    'ivr.title': 'KSRTC Voice IVR & Feature Phone Accessibility',
    'ivr.subtitle': 'Works on any 2G/3G basic mobile phone with zero internet required. Dial toll-free 080-2222-1234.',
    'ivr.start_call': 'Connect to IVR Voice Helpline',
    'ivr.end_call': 'Disconnect Call',
    'ivr.enter_stop_code': 'Enter 4-Digit Stop Code',
    'ivr.keypad': 'Virtual DTMF Telephone Keypad',
    'ivr.live_transcript': 'Live Call Audio Transcript',
    'ivr.send_sms': 'Send Free SMS Timetable',

    // Common & Actions
    'common.search': 'Search',
    'common.back': 'Back',
    'common.loading': 'Loading data...',
    'common.view': 'View',
    'common.close': 'Close',
    'common.emergency': 'Emergency SOS',
    'common.helpline': '24x7 Helpline',
    'common.status_live': 'LIVE GPS',
    'common.status_stale': 'STALE',
    'common.status_delayed': 'DELAYED'
  },
  kn: {
    // Top Bar & Navigation
    'app.title': 'ಕೆ.ಎಸ್.ಆರ್.ಟಿ.ಸಿ ಸ್ಮಾರ್ಟ್‌ಟ್ರ್ಯಾಕ್',
    'app.subtitle': 'ಕರ್ನಾಟಕ ರಾಜ್ಯ ರಸ್ತೆ ಸಾರಿಗೆ ಸಂಸ್ಥೆ',
    'topbar.tracking_active': 'ಕೆ.ಎಸ್.ಆರ್.ಟಿ.ಸಿ ನೈಜ-ಸಮಯದ ಉಪಗ್ರಹ ಜಿಪಿಎಸ್ ಟ್ರ್ಯಾಕಿಂಗ್ ಸಕ್ರಿಯವಾಗಿದೆ',
    'topbar.ivr_helpline': 'ಧ್ವನಿ ಸಹಾಯವಾಣಿ: 080-2222-1234',
    'nav.live_map': 'ಲೈವ್ ನಕ್ಷೆ',
    'nav.routes': 'ಬಸ್ ಮಾರ್ಗಗಳು',
    'nav.stops': 'ನಿಲ್ದಾಣಗಳು & ಕ್ಯೂಆರ್',
    'nav.ivr': 'ಧ್ವನಿ ಸೇವೆ (IVR)',
    'nav.driver': 'ಚಾಲಕರ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್',
    'nav.admin': 'ಆಡಳಿತ ಮಂಡಳಿ',
    'nav.login': 'ಲಾಗಿನ್',
    'nav.logout': 'ಲಾಗ್‌ಔಟ್',
    'nav.favorites': 'ಮೆಚ್ಚಿನವುಗಳು',
    'nav.notifications': 'ಸೇವಾ ಪ್ರಕಟಣೆಗಳು',
    'nav.no_notifications': 'ಯಾವುದೇ ಹೊಸ ಪ್ರಕಟಣೆಗಳಿಲ್ಲ',
    'nav.switch_role': 'ಪಾತ್ರ ಬದಲಾವಣೆ',
    'nav.passenger_app': 'ಪ್ರಯಾಣಿಕರ ಆ್ಯಪ್',
    'nav.driver_app': 'ಚಾಲಕರ ಜಿಪಿಎಸ್ ಆ್ಯಪ್',
    'nav.admin_app': 'ನಿಯಂತ್ರಣ ಕೊಠಡಿ',

    // Language Selector
    'lang.select': 'ಭಾಷೆ',
    'lang.en': 'English',
    'lang.kn': 'ಕನ್ನಡ',
    'lang.hi': 'हिंदी',

    // Routes Page
    'routes.title': 'ಕೆ.ಎಸ್.ಆರ್.ಟಿ.ಸಿ ಬಸ್ ಮಾರ್ಗಗಳು ಮತ್ತು ವೇಳಾಪಟ್ಟಿ',
    'routes.subtitle': 'ಲೈವ್ ಉಪಗ್ರಹ ಜಿಪಿಎಸ್ ಟ್ರ್ಯಾಕಿಂಗ್ ಹೊಂದಿರುವ ಸಕ್ರಿಯ ಬಸ್ ಮಾರ್ಗಗಳ ವಿವರ',
    'routes.search_placeholder': 'ಮಾರ್ಗ ಸಂಖ್ಯೆ, ಊರು ಅಥವಾ ನಿಲ್ದಾಣದ ಹೆಸರು ಹುಡುಕಿ...',
    'routes.view_schedule': 'ಎಲ್ಲಾ ನಿಲ್ದಾಣಗಳು & ವೇಳಾಪಟ್ಟಿ ವೀಕ್ಷಿಸಿ',
    'routes.track_live': 'ಲೈವ್ ಬಸ್ ಟ್ರ್ಯಾಕ್ ಮಾಡಿ',
    'routes.save_favorite': 'ಮೆಚ್ಚಿನದಾಗಿ ಉಳಿಸಿ',
    'routes.saved_favorite': 'ಮೆಚ್ಚಿನವುಗಳಲ್ಲಿ ಉಳಿಸಲಾಗಿದೆ!',
    'routes.active_buses_count': 'ಈ ಮಾರ್ಗದಲ್ಲಿ ಚಲಿಸುತ್ತಿರುವ ಲೈವ್ ಬಸ್‌ಗಳು',
    'routes.driver_gps_active': 'ಚಾಲಕರ ಜಿಪಿಎಸ್ ನೇರ ವೇಗ ಮತ್ತು ಆಗಮನ ಸಮಯವನ್ನು ಪ್ರಸಾರ ಮಾಡುತ್ತಿದೆ',
    'routes.no_active_buses': 'ಪ್ರಸ್ತುತ ಈ ಮಾರ್ಗದಲ್ಲಿ ಯಾವುದೇ ಲೈವ್ ಬಸ್ ಚಲಿಸುತ್ತಿಲ್ಲ. ನಿಗದಿತ ವೇಳಾಪಟ್ಟಿ ಕೆಳಗೆ ನೀಡಲಾಗಿದೆ.',
    'routes.stop_sequence': 'ಮಾರ್ಗದ ನಿಲ್ದಾಣಗಳ ಸರದಿ',
    'routes.stops_count': 'ನಿಲ್ದಾಣಗಳು',
    'routes.corridor_explorer': 'ಸಕ್ರಿಯ ಮಾರ್ಗ ನಕ್ಷೆ ಪರಿಶೋಧಕ',
    'routes.corridor_hint': 'ಯಾವುದೇ ಮಾರ್ಗವನ್ನು ಕ್ಲಿಕ್ ಮಾಡಿ ಅದರ ಸಂಪೂರ್ಣ ನಿಲ್ದಾಣಗಳು ಮತ್ತು ಲೈವ್ ಬಸ್‌ಗಳನ್ನು ನಕ್ಷೆಯಲ್ಲಿ ವೀಕ್ಷಿಸಿ',
    'routes.distance': 'ದೂರ',
    'routes.est_duration': 'ಅಂದಾಜು ಸಮಯ',
    'routes.origin': 'ಆರಂಭಿಕ ಸ್ಥಳ',
    'routes.destination': 'ಅಂತಿಮ ಸ್ಥಳ',
    'routes.minutes': 'ನಿಮಿಷಗಳು',
    'routes.km': 'ಕಿ.ಮೀ',
    'routes.stop_number': 'ನಿಲ್ದಾಣ #',
    'routes.view_stop_qr': 'ಲೈವ್ ವೇಳಾಪಟ್ಟಿ & ಕ್ಯೂಆರ್ ವೀಕ್ಷಿಸಿ',

    // Map Controls & Labels
    'map.fit_route': 'ಮಾರ್ಗಕ್ಕೆ ಹೊಂದಿಸಿ',
    'map.center_karnataka': 'ಮರುಹೊಂದಿಸಿ',
    'map.toggle_stops': 'ನಿಲ್ದಾಣಗಳು',
    'map.toggle_buses': 'ಲೈವ್ ಬಸ್‌ಗಳು',
    'map.style_voyager': 'ಸಾರಿಗೆ ನಕ್ಷೆ',
    'map.style_satellite': 'ಉಪಗ್ರಹ ನೋಟ',
    'map.style_osm': 'ಸಾಮಾನ್ಯ OSM',
    'map.style_dark': 'ಡಾರ್ಕ್ ಮೋಡ್',
    'map.speed': 'ವೇಗ',
    'map.next_stop': 'ಮುಂದಿನ ನಿಲ್ದಾಣ',
    'map.eta': 'ಆಗಮನ ಸಮಯ',
    'map.origin_terminal': 'ಆರಂಭಿಕ ನಿಲ್ದಾಣ',
    'map.dest_terminal': 'ಅಂತಿಮ ನಿಲ್ದಾಣ',
    'map.intermediate_stop': 'ಮಧ್ಯಂತರ ನಿಲ್ದಾಣ',
    'map.live_bus_tracking': 'ಲೈವ್ ಬಸ್ ಟ್ರ್ಯಾಕಿಂಗ್',
    'map.your_location': 'ನಿಮ್ಮ ಪ್ರಸ್ತುತ ಸ್ಥಳ',

    // Live Tracking Page
    'tracking.title': 'ಲೈವ್ ಬಸ್ ರೇಡಾರ್ & ಉಪಗ್ರಹ ಜಿಪಿಎಸ್',
    'tracking.search_placeholder': 'ಬಸ್ ಸಂಖ್ಯೆ (KA 01 AB 1234), ಮಾರ್ಗ ಹುಡುಕಿ...',
    'tracking.all_routes': 'ಎಲ್ಲಾ ಮಾರ್ಗಗಳು',
    'tracking.all_status': 'ಎಲ್ಲಾ ಸ್ಥಿತಿಗಳು',
    'tracking.live_only': 'ಲೈವ್ ಜಿಪಿಎಸ್ ಮಾತ್ರ',
    'tracking.delayed_only': 'ತಡವಾದ ಬಸ್‌ಗಳು',
    'tracking.refresh': 'ನವೀಕರಿಸಿ',
    'tracking.active_buses': 'ಲೈವ್ ಚಲಿಸುತ್ತಿರುವ ಬಸ್‌ಗಳು',
    'tracking.select_bus_prompt': 'ನೈಜ ಸಮಯದ ವೇಗ ಮತ್ತು ಆಗಮನ ಸಮಯವನ್ನು ನೋಡಲು ಬಸ್ ಆಯ್ಕೆಮಾಡಿ.',

    // Stop Details Page
    'stops.title': 'ಕೆ.ಎಸ್.ಆರ್.ಟಿ.ಸಿ ಸ್ಮಾರ್ಟ್ ಬಸ್ ನಿಲ್ದಾಣಗಳು & ಕ್ಯೂಆರ್',
    'stops.subtitle': 'ನಿಲ್ದಾಣದಲ್ಲಿ ಕ್ಯೂಆರ್ ಸ್ಕ್ಯಾನ್ ಮಾಡಿ ಅಥವಾ ಇಂಟರ್ನೆಟ್ ಇಲ್ಲದೆ 080-2222-1234 ಗೆ ಕರೆ ಮಾಡಿ',
    'stops.search_placeholder': '೪-ಅಂಕಿಯ ನಿಲ್ದಾಣ ಸಂಖ್ಯೆ (ಉದಾ: 1001) ಅಥವಾ ಹೆಸರು ನಮೂದಿಸಿ...',
    'stops.approaching_buses': 'ಬರುತ್ತಿರುವ ಲೈವ್ ಬಸ್‌ಗಳು',
    'stops.routes_serviced': 'ಈ ನಿಲ್ದಾಣದಲ್ಲಿ ಹಾದುಹೋಗುವ ಮಾರ್ಗಗಳು',
    'stops.print_qr': 'ಕ್ಯೂಆರ್ ಫಲಕ ಮುದ್ರಿಸಿ',
    'stops.qr_instructions': 'ಯಾವುದೇ ಸ್ಮಾರ್ಟ್‌ಫೋನ್‌ನಲ್ಲಿ ಸ್ಕ್ಯಾನ್ ಮಾಡಿ ಲೈವ್ ಬಸ್ ಸಮಯ ತಿಳಿಯಿರಿ',
    'stops.ivr_code_label': '080-2222-1234 ಗೆ ಕರೆ ಮಾಡಿ ನಿಲ್ದಾಣ ಸಂಖ್ಯೆ ನಮೂದಿಸಿ',

    // IVR Page
    'ivr.title': 'ಕೆ.ಎಸ್.ಆರ್.ಟಿ.ಸಿ ಧ್ವನಿ ಸೇವೆ (IVR)',
    'ivr.subtitle': 'ಇಂಟರ್ನೆಟ್ ಇಲ್ಲದೆ ಯಾವುದೇ ಸಾಮಾನ್ಯ ಮೊಬೈಲ್‌ನಿಂದ ಉಚಿತ ಕರೆ ಮಾಡಿ: 080-2222-1234.',
    'ivr.start_call': 'ಧ್ವನಿ ಕರೆ ಪ್ರಾರಂಭಿಸಿ',
    'ivr.end_call': 'ಕರೆ ಕೊನೆಗೊಳಿಸಿ',
    'ivr.enter_stop_code': '೪-ಅಂಕಿಯ ನಿಲ್ದಾಣ ಸಂಖ್ಯೆ ನಮೂದಿಸಿ',
    'ivr.keypad': 'ಕೀಪ್ಯಾಡ್',
    'ivr.live_transcript': 'ಧ್ವನಿ ಕರೆಯ ಲೈವ್ ಪ್ರತಿ',
    'ivr.send_sms': 'ಉಚಿತ SMS ಪಡೆಯಿರಿ',

    // Common & Actions
    'common.search': 'ಹುಡುಕಿ',
    'common.back': 'ಹಿಂದೆ',
    'common.loading': 'ಮಾಹಿತಿ ಲೋಡ್ ಆಗುತ್ತಿದೆ...',
    'common.view': 'ನೋಡಿ',
    'common.close': 'ಮುಚ್ಚು',
    'common.emergency': 'ತುರ್ತು ಸಹಾಯ SOS',
    'common.helpline': '೨೪x೭ ಸಹಾಯವಾಣಿ',
    'common.status_live': 'ಲೈವ್ GPS',
    'common.status_stale': 'ಸ್ಥಗಿತ',
    'common.status_delayed': 'ತಡವಾಗಿದೆ'
  },
  hi: {
    // Top Bar & Navigation
    'app.title': 'केएसआरटीसी स्मार्टट्रैक',
    'app.subtitle': 'कर्नाटक राज्य सड़क परिवहन निगम',
    'topbar.tracking_active': 'केएसआरटीसी रियल-टाइम सैटेलाइट जीपीएस ट्रैकिंग सक्रिय है',
    'topbar.ivr_helpline': 'टोल-फ्री हेल्पलाइन: 080-2222-1234',
    'nav.live_map': 'लाइव मैप',
    'nav.routes': 'बस रूट्स',
    'nav.stops': 'स्टॉप्स & क्यूआर',
    'nav.ivr': 'वॉयस सेवा (IVR)',
    'nav.driver': 'चालक डैशबोर्ड',
    'nav.admin': 'प्रबंधन कक्ष',
    'nav.login': 'लॉगिन',
    'nav.logout': 'लॉगआउट',
    'nav.favorites': 'पसंदीदा रूट्स',
    'nav.notifications': 'सेवा सूचनाएं',
    'nav.no_notifications': 'कोई नई सूचना नहीं',
    'nav.switch_role': 'रोल बदलें',
    'nav.passenger_app': 'यात्री ऐप',
    'nav.driver_app': 'चालक जीपीएस ऐप',
    'nav.admin_app': 'कंट्रोल रूम',

    // Language Selector
    'lang.select': 'भाषा',
    'lang.en': 'English',
    'lang.kn': 'ಕನ್ನಡ',
    'lang.hi': 'हिंदी',

    // Routes Page
    'routes.title': 'केएसआरटीसी एक्सप्रेस बस रूट्स और समय सारिणी',
    'routes.subtitle': 'लाइव सैटेलाइट जीपीएस ट्रैकिंग के साथ सक्रिय बस कॉरिडोर',
    'routes.search_placeholder': 'रूट नंबर, शहर या स्टॉप खोजें...',
    'routes.view_schedule': 'सभी स्टॉप्स और समय सारिणी देखें',
    'routes.track_live': 'लाइव बस ट्रैक करें',
    'routes.save_favorite': 'पसंदीदा में जोड़ें',
    'routes.saved_favorite': 'पसंदीदा में सहेजा गया!',
    'routes.active_buses_count': 'रूट पर सक्रिय लाइव बसें',
    'routes.driver_gps_active': 'ड्राइवर जीपीएस द्वारा लाइव स्पीड और आगमन समय प्रसारित',
    'routes.no_active_buses': 'वर्तमान में इस रूट पर कोई लाइव बस नहीं चल रही है। निर्धारित समय सारिणी नीचे दी गई है।',
    'routes.stop_sequence': 'रूट स्टॉप क्रम',
    'routes.stops_count': 'स्टॉप्स',
    'routes.corridor_explorer': 'रूट कॉरिडोर मैप एक्सप्लोरर',
    'routes.corridor_hint': 'नक्शे पर पूरे स्टॉप्स और लाइव बसों को देखने के लिए किसी भी रूट पर क्लिक करें',
    'routes.distance': 'दूरी',
    'routes.est_duration': 'अनुमानित समय',
    'routes.origin': 'प्रारंभिक स्थल',
    'routes.destination': 'गंतव्य स्थल',
    'routes.minutes': 'मिनट',
    'routes.km': 'किमी',
    'routes.stop_number': 'स्टॉप #',
    'routes.view_stop_qr': 'लाइव शेड्यूल और क्यूआर देखें',

    // Map Controls & Labels
    'map.fit_route': 'रूट पर केंद्रित करें',
    'map.center_karnataka': 'रीसेट व्यू',
    'map.toggle_stops': 'स्टॉप्स',
    'map.toggle_buses': 'लाइव बसें',
    'map.style_voyager': 'ट्रांजिट मैप',
    'map.style_satellite': 'सैटेलाइट व्यू',
    'map.style_osm': 'मानक OSM',
    'map.style_dark': 'डार्क मोड',
    'map.speed': 'गति',
    'map.next_stop': 'अगला स्टॉप',
    'map.eta': 'आगमन समय',
    'map.origin_terminal': 'प्रारंभिक टर्मिनल',
    'map.dest_terminal': 'गंतव्य टर्मिनल',
    'map.intermediate_stop': 'मध्यवर्ती स्टॉप',
    'map.live_bus_tracking': 'लाइव बस ट्रैकिंग',
    'map.your_location': 'आपकी वर्तमान स्थिति',

    // Live Tracking Page
    'tracking.title': 'लाइव बस रडार और सैटेलाइट जीपीएस',
    'tracking.search_placeholder': 'बस नंबर (KA 01 AB 1234), रूट खोजें...',
    'tracking.all_routes': 'सभी रूट्स',
    'tracking.all_status': 'सभी स्थितियां',
    'tracking.live_only': 'केवल लाइव जीपीएस',
    'tracking.delayed_only': 'विलंबित बसें',
    'tracking.refresh': 'रिफ्रेश करें',
    'tracking.active_buses': 'सड़क पर लाइव बसें',
    'tracking.select_bus_prompt': 'लाइव स्पीड और आगमन समय देखने के लिए साइडबार से बस चुनें।',

    // Stop Details Page
    'stops.title': 'केएसआरटीसी स्मार्ट बस शेल्टर और क्यूआर कोड',
    'stops.subtitle': 'बिना इंटरनेट तुरंत आगमन समय जानने के लिए क्यूआर स्कैन करें या 080-2222-1234 पर कॉल करें',
    'stops.search_placeholder': '४-अंकों का स्टॉप कोड (जैसे 1001) या नाम दर्ज करें...',
    'stops.approaching_buses': 'आ रही लाइव बसें',
    'stops.routes_serviced': 'इस स्टॉप से गुजरने वाले रूट्स',
    'stops.print_qr': 'क्यूआर बोर्ड प्रिंट करें',
    'stops.qr_instructions': 'स्मार्टफोन से स्कैन कर तुरंत लाइव शेड्यूल प्राप्त करें',
    'stops.ivr_code_label': '080-2222-1234 डायल कर स्टॉप कोड दर्ज करें',

    // IVR Page
    'ivr.title': 'केएसआरटीसी वॉयस सेवा (IVR)',
    'ivr.subtitle': 'बिना इंटरनेट किसी भी फोन से कॉल करें: 080-2222-1234.',
    'ivr.start_call': 'वॉयस कॉल शुरू करें',
    'ivr.end_call': 'कॉल समाप्त करें',
    'ivr.enter_stop_code': '४-अंकों का स्टॉप कोड दर्ज करें',
    'ivr.keypad': 'कीपैड',
    'ivr.live_transcript': 'लाइव कॉल ट्रांसक्रिप्ट',
    'ivr.send_sms': 'मुफ्त एसएमएस प्राप्त करें',

    // Common & Actions
    'common.search': 'खोजें',
    'common.back': 'पीछे',
    'common.loading': 'डेटा लोड हो रहा है...',
    'common.view': 'देखें',
    'common.close': 'बंद करें',
    'common.emergency': 'आपातकालीन SOS',
    'common.helpline': '२४x७ हेल्पलाइन',
    'common.status_live': 'लाइव GPS',
    'common.status_stale': 'निष्क्रिय',
    'common.status_delayed': 'देरी'
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('ksrtc_language');
    if (saved === 'kn' || saved === 'hi' || saved === 'en') return saved;
    return 'en';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('ksrtc_language', lang);
  };

  const t = (key: string, defaultText?: string): string => {
    const dict = translations[language] || translations.en;
    if (dict[key]) return dict[key];
    if (translations.en[key]) return translations.en[key];
    return defaultText || key;
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t,
        isKannada: language === 'kn',
        isHindi: language === 'hi'
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
