export type Language = 'en' | 'id';

export type TranslationKey = keyof typeof translations.en;

export const translations = {
  en: {
    // Navigation
    'nav.home': 'Home',
    'nav.favorites': 'Favorites',
    'nav.profile': 'Profile',
    
    // Home
    'home.title': 'Discover',
    'home.search_placeholder': 'Search venues...',
    'home.no_venues': 'No venues found',
    'home.filters': 'Filters',
    'home.clear_filters': 'Clear all',
    
    // Venue Profile
    'venue.about': 'About',
    'venue.insights': 'Insights',
    'venue.book': 'Book',
    'venue.contact': 'Contact',
    'venue.hours': 'Hours',
    'venue.amenities': 'Amenities',
    'venue.policies': 'Policies',
    'venue.location': 'Location',
    'venue.open_now': 'Open now',
    'venue.closed': 'Closed',
    'venue.free_entry': 'Free entry',
    'venue.cover_charge': 'Cover charge',
    'venue.booking_available': 'Booking available',
    'venue.get_directions': 'Get Directions',
    'venue.message_whatsapp': 'Message on WhatsApp',
    
    // Insights
    'insights.title': 'Live Insights',
    'insights.crowd_status': 'Crowd Status',
    'insights.best_time': 'Best Time to Visit',
    'insights.trend': 'Trend',
    
    // Booking
    'book.title': 'Make a Reservation',
    'book.date': 'Date',
    'book.party_size': 'Party Size',
    'book.guests': 'guests',
    'book.arrival_window': 'Arrival Window',
    'book.before_10pm': 'Before 10pm',
    'book.10_to_11pm': '10–11pm',
    'book.after_11pm': 'After 11pm',
    'book.special_requests': 'Special Requests',
    'book.special_requests_placeholder': 'Any special requests or notes...',
    'book.submit': 'Request Reservation',
    'book.success': 'Reservation request sent!',
    'book.login_required': 'Please log in to make a reservation',
    
    // Line Skip
    'lineskip.title': 'Skip the Line',
    'lineskip.buy': 'Buy Pass',
    'lineskip.valid_until': 'Valid until',
    'lineskip.remaining': 'remaining',
    'lineskip.sold_out': 'Sold out tonight',
    'lineskip.not_available': 'Not available',
    'lineskip.show_at_door': 'Show this at the door tonight',
    
    // Status
    'status.quiet': 'Quiet',
    'status.perfect': 'Perfect',
    'status.ideal': 'Ideal',
    'status.busy': 'Busy',
    'status.too_busy': 'Too Busy',
    'status.pending': 'Pending',
    'status.confirmed': 'Confirmed',
    'status.declined': 'Declined',
    'status.cancelled': 'Cancelled',
    'status.active': 'Active',
    'status.used': 'Used',
    'status.refunded': 'Refunded',
    
    // Profile
    'profile.title': 'Profile',
    'profile.edit': 'Edit',
    'profile.member': 'Member',
    'profile.sign_out': 'Sign Out',
    'profile.sign_in': 'Sign in to your account',
    'profile.sign_in_description': 'Log in to manage your bookings, line skip passes, and favorite venues all in one place.',
    'profile.login_button': 'Log in with Phone',
    
    // Profile Menu
    'profile.my_bookings': 'Booking History',
    'profile.my_bookings_desc': 'View past reservations',
    'profile.my_passes': 'My Passes',
    'profile.my_passes_desc': 'Line skip passes',
    'profile.payment_methods': 'Payment Methods',
    'profile.payment_methods_desc': 'Manage payments',
    'profile.settings': 'Settings',
    'profile.settings_desc': 'Language, notifications',
    'profile.dashboard': 'Operations Dashboard',
    'profile.dashboard_desc': 'Manage venues & bookings',
    
    // Settings
    'settings.title': 'Settings',
    'settings.language': 'Language',
    'settings.notifications': 'Notifications',
    'settings.privacy': 'Privacy',
    'settings.help': 'Help & Support',
    'settings.version': 'Version',
    
    // Languages
    'language.en': 'English',
    'language.id': 'Bahasa Indonesia',
    
    // Payments
    'payments.title': 'Payment Methods',
    'payments.coming_soon': 'Coming Soon',
    'payments.coming_soon_desc': 'Payment methods will be available here once we launch our payment integration.',
    'payments.request_payment': 'Create Payment Request',
    'payments.request_payment_desc': 'This is a demo checkout. Your request will be recorded, but no money is charged yet.',
    'payments.purchase_type': 'What are you paying for?',
    'payments.amount_idr': 'Amount (IDR)',
    'payments.method': 'Payment method',
    'payments.submit_request': 'Create request',
    'payments.recent_requests': 'Recent Payment Requests',
    'payments.no_requests': 'No payment requests yet',
    'payments.type.line_skip_pass': 'Line skip pass',
    'payments.type.package_purchase': 'Package / table / drinks',
    'payments.type.booking_deposit': 'Booking deposit (downpayment)',
    'payments.method.bca': 'BCA (Virtual Account)',
    'payments.method.gopay': 'GoPay',
    'payments.method.card': 'Credit / Debit card',
    'payments.method.apple_pay': 'Apple Pay',
    'payments.method.google_pay': 'Google Pay',
    'payments.status.pending_confirmation': 'Pending venue confirmation',
    'payments.status.pending_processing': 'Pending processing',
    'payments.status.confirmed': 'Confirmed',
    'payments.status.failed': 'Failed',
    'payments.status.cancelled': 'Cancelled',
    'payments.test_mode_blocked': 'Payments are disabled in test mode. Please sign in with a real account.',
    
    // Bookings
    'bookings.title': 'My Bookings',
    'bookings.no_bookings': 'No reservations yet',
    'bookings.no_bookings_desc': 'Your booking requests will appear here',
    
    // Passes
    'passes.title': 'My Passes',
    'passes.no_passes': 'No passes yet',
    'passes.no_passes_desc': 'Your line skip passes will appear here',
    
    // Favorites
    'favorites.title': 'Favorites',
    'favorites.no_favorites': 'No favorites yet',
    'favorites.no_favorites_desc': 'Venues you love will appear here',
    
    // Auth
    'auth.sign_in': 'Sign In',
    'auth.sign_up': 'Sign Up',
    'auth.verify_phone': 'Verify Phone',
    'auth.enter_phone': 'Enter your phone',
    'auth.enter_code': 'Enter verification code',
    'auth.phone_description': "We'll send you a one-time code to verify your number",
    'auth.send_code': 'Send Code',
    'auth.verify': 'Verify',
    'auth.resend': "Didn't receive code? Resend",
    'auth.test_mode': 'Test mode: Enter "0000" to login',
    
    // Common
    'common.loading': 'Loading...',
    'common.error': 'Something went wrong',
    'common.retry': 'Try again',
    'common.back': 'Back',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.confirm': 'Confirm',
    'common.decline': 'Decline',
    'common.today': 'Today',
    'common.phone': 'Phone',
    'common.call': 'Call',
  },
  id: {
    // Navigation
    'nav.home': 'Beranda',
    'nav.favorites': 'Favorit',
    'nav.profile': 'Profil',
    
    // Home
    'home.title': 'Jelajahi',
    'home.search_placeholder': 'Cari tempat...',
    'home.no_venues': 'Tidak ada tempat ditemukan',
    'home.filters': 'Filter',
    'home.clear_filters': 'Hapus semua',
    
    // Venue Profile
    'venue.about': 'Tentang',
    'venue.insights': 'Insights',
    'venue.book': 'Pesan',
    'venue.contact': 'Kontak',
    'venue.hours': 'Jam Buka',
    'venue.amenities': 'Fasilitas',
    'venue.policies': 'Kebijakan',
    'venue.location': 'Lokasi',
    'venue.open_now': 'Buka sekarang',
    'venue.closed': 'Tutup',
    'venue.free_entry': 'Masuk gratis',
    'venue.cover_charge': 'Ada biaya masuk',
    'venue.booking_available': 'Bisa reservasi',
    'venue.get_directions': 'Petunjuk Arah',
    'venue.message_whatsapp': 'Pesan via WhatsApp',
    
    // Insights
    'insights.title': 'Insights Live',
    'insights.crowd_status': 'Status Keramaian',
    'insights.best_time': 'Waktu Terbaik Berkunjung',
    'insights.trend': 'Tren',
    
    // Booking
    'book.title': 'Buat Reservasi',
    'book.date': 'Tanggal',
    'book.party_size': 'Jumlah Tamu',
    'book.guests': 'tamu',
    'book.arrival_window': 'Waktu Kedatangan',
    'book.before_10pm': 'Sebelum 22:00',
    'book.10_to_11pm': '22:00–23:00',
    'book.after_11pm': 'Setelah 23:00',
    'book.special_requests': 'Permintaan Khusus',
    'book.special_requests_placeholder': 'Permintaan atau catatan khusus...',
    'book.submit': 'Kirim Permintaan',
    'book.success': 'Permintaan reservasi terkirim!',
    'book.login_required': 'Silakan masuk untuk membuat reservasi',
    
    // Line Skip
    'lineskip.title': 'Lewati Antrean',
    'lineskip.buy': 'Beli Pass',
    'lineskip.valid_until': 'Berlaku sampai',
    'lineskip.remaining': 'tersisa',
    'lineskip.sold_out': 'Habis malam ini',
    'lineskip.not_available': 'Tidak tersedia',
    'lineskip.show_at_door': 'Tunjukkan ini di pintu masuk malam ini',
    
    // Status
    'status.quiet': 'Sepi',
    'status.perfect': 'Sempurna',
    'status.ideal': 'Ideal',
    'status.busy': 'Ramai',
    'status.too_busy': 'Terlalu Ramai',
    'status.pending': 'Menunggu',
    'status.confirmed': 'Dikonfirmasi',
    'status.declined': 'Ditolak',
    'status.cancelled': 'Dibatalkan',
    'status.active': 'Aktif',
    'status.used': 'Terpakai',
    'status.refunded': 'Dikembalikan',
    
    // Profile
    'profile.title': 'Profil',
    'profile.edit': 'Edit',
    'profile.member': 'Member',
    'profile.sign_out': 'Keluar',
    'profile.sign_in': 'Masuk ke akun Anda',
    'profile.sign_in_description': 'Masuk untuk mengelola reservasi, pass antrean, dan tempat favorit Anda.',
    'profile.login_button': 'Masuk dengan Telepon',
    
    // Profile Menu
    'profile.my_bookings': 'Riwayat Reservasi',
    'profile.my_bookings_desc': 'Lihat reservasi sebelumnya',
    'profile.my_passes': 'Pass Saya',
    'profile.my_passes_desc': 'Pass lewati antrean',
    'profile.payment_methods': 'Metode Pembayaran',
    'profile.payment_methods_desc': 'Kelola pembayaran',
    'profile.settings': 'Pengaturan',
    'profile.settings_desc': 'Bahasa, notifikasi',
    'profile.dashboard': 'Dashboard Operasional',
    'profile.dashboard_desc': 'Kelola tempat & reservasi',
    
    // Settings
    'settings.title': 'Pengaturan',
    'settings.language': 'Bahasa',
    'settings.notifications': 'Notifikasi',
    'settings.privacy': 'Privasi',
    'settings.help': 'Bantuan & Dukungan',
    'settings.version': 'Versi',
    
    // Languages
    'language.en': 'English',
    'language.id': 'Bahasa Indonesia',
    
    // Payments
    'payments.title': 'Metode Pembayaran',
    'payments.coming_soon': 'Segera Hadir',
    'payments.coming_soon_desc': 'Metode pembayaran akan tersedia di sini setelah integrasi pembayaran diluncurkan.',
    'payments.request_payment': 'Buat Permintaan Pembayaran',
    'payments.request_payment_desc': 'Ini adalah checkout demo. Permintaan Anda akan tersimpan, tetapi belum ada uang yang ditarik.',
    'payments.purchase_type': 'Pembayaran untuk apa?',
    'payments.amount_idr': 'Jumlah (IDR)',
    'payments.method': 'Metode pembayaran',
    'payments.submit_request': 'Buat permintaan',
    'payments.recent_requests': 'Permintaan Pembayaran Terbaru',
    'payments.no_requests': 'Belum ada permintaan pembayaran',
    'payments.type.line_skip_pass': 'Pass lewati antrean',
    'payments.type.package_purchase': 'Paket / meja / minuman',
    'payments.type.booking_deposit': 'DP reservasi (downpayment)',
    'payments.method.bca': 'BCA (Virtual Account)',
    'payments.method.gopay': 'GoPay',
    'payments.method.card': 'Kartu kredit / debit',
    'payments.method.apple_pay': 'Apple Pay',
    'payments.method.google_pay': 'Google Pay',
    'payments.status.pending_confirmation': 'Menunggu konfirmasi venue',
    'payments.status.pending_processing': 'Sedang diproses',
    'payments.status.confirmed': 'Terkonfirmasi',
    'payments.status.failed': 'Gagal',
    'payments.status.cancelled': 'Dibatalkan',
    'payments.test_mode_blocked': 'Pembayaran dinonaktifkan di test mode. Silakan masuk dengan akun asli.',
    
    // Bookings
    'bookings.title': 'Reservasi Saya',
    'bookings.no_bookings': 'Belum ada reservasi',
    'bookings.no_bookings_desc': 'Permintaan reservasi Anda akan muncul di sini',
    
    // Passes
    'passes.title': 'Pass Saya',
    'passes.no_passes': 'Belum ada pass',
    'passes.no_passes_desc': 'Pass lewati antrean Anda akan muncul di sini',
    
    // Favorites
    'favorites.title': 'Favorit',
    'favorites.no_favorites': 'Belum ada favorit',
    'favorites.no_favorites_desc': 'Tempat favorit Anda akan muncul di sini',
    
    // Auth
    'auth.sign_in': 'Masuk',
    'auth.sign_up': 'Daftar',
    'auth.verify_phone': 'Verifikasi Telepon',
    'auth.enter_phone': 'Masukkan nomor telepon',
    'auth.enter_code': 'Masukkan kode verifikasi',
    'auth.phone_description': 'Kami akan mengirim kode sekali pakai untuk verifikasi',
    'auth.send_code': 'Kirim Kode',
    'auth.verify': 'Verifikasi',
    'auth.resend': 'Tidak menerima kode? Kirim ulang',
    'auth.test_mode': 'Mode tes: Masukkan "0000" untuk masuk',
    
    // Common
    'common.loading': 'Memuat...',
    'common.error': 'Terjadi kesalahan',
    'common.retry': 'Coba lagi',
    'common.back': 'Kembali',
    'common.save': 'Simpan',
    'common.cancel': 'Batal',
    'common.confirm': 'Konfirmasi',
    'common.decline': 'Tolak',
    'common.today': 'Hari ini',
    'common.phone': 'Telepon',
    'common.call': 'Telepon',
  },
} as const;

export function getTranslation(lang: Language, key: TranslationKey): string {
  return translations[lang][key] || translations.en[key] || key;
}