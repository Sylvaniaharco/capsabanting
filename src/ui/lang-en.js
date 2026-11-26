// Terjemahan English. Kunci = teks Indonesia persis seperti di tx('...') / data-t. Teks baru → tambah di sini (dicek test/i18n.test.js).
export const EN = {
  // umum
  'Batal': 'Cancel', 'Lanjut': 'Continue', 'Tutup': 'Close', 'Mengerti': 'Got it', 'Memuat…': 'Loading…', 'Keluar': 'Leave',
  'Suara: nyala': 'Sound: on', 'Suara: mati': 'Sound: off', 'Musik: nyala': 'Music: on', 'Musik: mati': 'Music: off', 'Aturan': 'Rules', 'Peringkat': 'Rankings', 'Pasang aplikasi': 'Install app',
  '4 pemain · 13 kartu · habiskan kartu duluan': '4 players · 13 cards · empty your hand first',
  // lobi
  'Ranked': 'Ranked', 'online · koin akun · rating Capsa Banting': 'online · account coins · Capsa Banting rating',
  'Latihan': 'Practice', 'lawan 3 bot · tanpa login': 'vs 3 bots · no login', 'Level bot': 'Bot level', 'Main lawan bot': 'Play vs bots',
  'Langsung mulai · poin saja': 'Starts right away · points only', 'Main bareng teman': 'Play with friends', 'kode meja · tanpa rating': 'table code · unrated',
  'Buat meja': 'Create table', 'Gabung pakai kode': 'Join with code',
  'Mudah': 'Easy', 'Sedang': 'Normal', 'Sulit': 'Hard',
  'Masuk dulu': 'Sign in first', 'Butuh {n}': 'Needs {n}', 'Meja {n}': 'Table {n}', '{n} koin / poin · min {m}': '{n} coins / point · min {m}',
  'Masuk dengan Google dulu': 'Sign in with Google first', 'Saldo {n} koin': 'Balance {n} coins', 'placement {n} lagi': '{n} placement left',
  'Bot mengisi kursi kosong': 'Bots fill empty seats',
  'Koin habis: saldo diisi lagi jadi {n} besok jam 00.01 WIB': 'Out of coins: your balance is refilled to {n} tomorrow at 00:01 WIB',
  'Masuk dengan Google': 'Sign in with Google',
  'Satu akun & koin dengan Mahjong Kung2, Capsa Kung2 & Doudizhu Kung2.': 'Same account & coins as Mahjong Kung2, Capsa Kung2 & Doudizhu Kung2.',
  'Koin akun dipakai bersama Mahjong Kung2 & Capsa Kung2, hanya bergerak di Ranked. Rating Capsa Banting terpisah.':
    'Account coins are shared with Mahjong Kung2 & Capsa Kung2 and only move in Ranked. Capsa Banting has its own rating.',
  'Keluar dari akun? Ini juga keluar dari Mahjong Kung2, Capsa Kung2 & Doudizhu Kung2 di HP ini.':
    'Sign out? This also signs you out of Mahjong Kung2, Capsa Kung2 & Doudizhu Kung2 on this device.',
  'Keluar dari akun': 'Sign out', 'Sudah keluar dari akun': 'Signed out', 'Gagal keluar — cek koneksi lalu coba lagi': 'Could not sign out — check your connection and try again',
  'Masuk sebagai {name}': 'Signed in as {name}', 'Login belum berhasil — coba lagi': 'Sign-in did not work — try again',
  // aturan
  'Aturan Capsa Banting': 'Capsa Banting rules', 'kartu': 'cards',
  '4 pemain, 52 kartu tanpa joker, masing-masing 13 kartu. Yang pertama menghabiskan kartu menang; ronde langsung selesai.':
    '4 players, 52 cards without jokers, 13 cards each. The first to empty their hand wins; the round ends right away.',
  'Urutan kartu': 'Card order', 'Bunga': 'Suits', 'wajik < keriting < hati < sekop': 'diamonds < clubs < hearts < spades', 'Jalan': 'Playing',
  'Pemegang 3♦ jalan pertama, dan kartu pertama yang dikeluarkan harus mengandung 3♦.': 'Whoever holds the 3♦ starts, and the first play must include the 3♦.',
  'Kombinasi: satu, pasang, tris, dan kombinasi 5 kartu. Hanya bisa dilawan kombinasi dengan jumlah kartu sama yang nilainya lebih tinggi.':
    'Combinations: single, pair, triple and 5-card hands. A play can only be beaten by the same number of cards with a higher value.',
  'Pass boleh, dan pemain yang pass tetap boleh main lagi saat gilirannya datang. Kalau semua pemain lain pass, pemain terakhir yang main bebas jalan kombinasi apa pun.':
    'You may pass and still play again on your next turn. When everyone else passes, the last player to play leads anything they like.',
  'Boleh menutup permainan pakai kartu 2.': 'You may finish with a 2.',
  'Kombinasi 5 kartu': '5-card hands',
  'Straight < flush < full house < four of a kind + 1 < straight flush. Jenis yang lebih tinggi selalu menang.':
    'Straight < flush < full house < four of a kind + 1 < straight flush. A higher kind always wins.',
  'Straight & straight flush: kartu tertinggi, kalau sama lihat bunganya. Flush: kartu tertinggi, kalau sama lihat bunganya. Full house: angka tris. Four: angka empatnya.':
    'Straight & straight flush: highest card, then its suit. Flush: highest card, then its suit. Full house: the triple. Four of a kind: the quad.',
  'Straight dari {a} sampai {b}: kartu 2 tidak boleh masuk straight dan tidak memutar.': 'Straights run from {a} to {b}: no 2s in a straight and no wrapping around.',
  'Pasang & tris: angkanya, kalau sama lihat bunga tertinggi.': 'Pairs & triples: the rank, then the highest suit.',
  'Poin': 'Points', 'Pengali': 'Multiplier',
  'Tiap pemain kalah bayar: sisa kartu × pengali + 4 untuk tiap kartu 2 yang masih dipegang (bonus kartu 2 tidak ikut dikali).':
    'Every loser pays: cards left × multiplier + 4 for each 2 still held (the 2 bonus is not multiplied).',
  'Contoh: sisa 5 kartu dengan satu 2 = 5×2 + 4 = 14. Pemenang menerima semua poin yang kalah (total nol).':
    'Example: 5 cards left including one 2 = 5×2 + 4 = 14. The winner collects all losers\' points (sums to zero).',
  'Ranked: koin = poin × taruhan meja (5/10/20). Ranked pertama tiap hari dapat bonus {n} koin. Keluar di tengah ronde = kalah + penalti rating.':
    'Ranked: coins = points × table stake (5/10/20). Your first Ranked round each day earns a {n}-coin bonus. Leaving mid-round = loss + rating penalty.',
  // papan & riwayat
  'Peringkat Capsa Banting': 'Capsa Banting rankings', 'Papan': 'Board', 'Riwayat saya': 'My history',
  '{g} ronde · menang {w}%': '{g} rounds · {w}% wins', 'Belum ada yang main Ranked. Jadilah yang pertama!': 'Nobody has played Ranked yet. Be the first!',
  'Masuk dengan Google untuk melihat riwayat Ranked.': 'Sign in with Google to see your Ranked history.', 'Belum ada data.': 'No data yet.',
  '{g} ronde · menang {w} ({p}) · kabur {a} · menang terbesar {b} poin · koin bersih {c}': '{g} rounds · {w} wins ({p}) · {a} abandoned · biggest win {b} points · net coins {c}',
  'Menang': 'Won', 'Sisa {n}': '{n} left', 'kabur': 'abandoned', 'Belum ada ronde Ranked.': 'No Ranked rounds yet.',
  'Gagal memuat. Cek koneksi lalu coba lagi.': 'Could not load. Check your connection and try again.',
  // masuk meja
  'Kamu': 'You', 'Koneksi putus — menyambung lagi…': 'Connection lost — reconnecting…', 'Tersambung lagi': 'Reconnected',
  'Nama kamu': 'Your name', 'Nama ini yang dilihat teman di meja.': 'This is the name your friends see at the table.', 'Tamu': 'Guest',
  'Kode meja terdiri dari 5 huruf/angka': 'A table code is 5 letters/digits', 'Meja tidak ditemukan': 'Table not found', 'Itu meja Ranked': 'That is a Ranked table',
  'Permainan di meja itu sudah mulai': 'That table has already started', 'Masuk dengan Google dulu untuk main Ranked': 'Sign in with Google to play Ranked',
  'Meja {s} butuh saldo minimal {n} koin': 'Table {s} needs at least {n} coins', 'Mencari meja…': 'Finding a table…',
  'Kamu masih duduk di meja {s} — kembali ke sana': 'You are still seated at table {s} — taking you back',
  'Gabung meja': 'Join a table', 'Masukkan kode meja dari temanmu.': 'Enter the table code from your friend.', 'Gabung': 'Join',
  'Gagal membuat meja': 'Could not create a table', 'Server tidak menjawab': 'Server is not responding', 'Gagal masuk meja Ranked': 'Could not join a Ranked table',
  'Ronde ini masih jalan. Keluar sekarang dihitung kabur: kalah + penalti rating, kursimu dimainkan bot (koin tetap dihitung).':
    'This round is still going. Leaving now counts as abandoning: a loss + rating penalty, a bot plays your seat (coins still count).',
  'Ronde latihan ini akan dibuang.': 'This practice round will be discarded.', 'Kursimu akan dimainkan bot sampai ronde selesai.': 'A bot will play your seat until the round ends.',
  'Keluar dari meja?': 'Leave the table?',
  // meja
  'bot': 'bots', 'rating': 'rating', 'Meja': 'Table', 'bareng teman': 'with friends', 'Ronde {n}': 'Round {n}', 'Kosong': 'Empty', 'Sisa {n}!': '{n} left!',
  'Bot': 'Bot', 'Total': 'Total', 'Keluar · dimainkan bot': 'Left · bot plays', 'Putus · dimainkan bot': 'Disconnected · bot plays', 'Main otomatis': 'Autoplay',
  'Pass': 'Pass', 'Sisa {n} kartu': '{n} cards left', 'Jalan pertama: wajib pakai 3♦': 'First play: must include the 3♦', 'Bebas jalan': 'Lead anything',
  'Tidak bisa mengalahkan': 'Cannot beat it', 'Main otomatis aktif': 'Autoplay is on', 'Main lagi sendiri': 'Play myself again', 'Saran': 'Hint',
  'Keluarkan': 'Play', 'Urut angka': 'Sort by rank', 'Urut bunga': 'Sort by suit', 'Batal pilih': 'Clear selection',
  'Tidak ada kartu yang bisa mengalahkan — Pass': 'Nothing can beat it — Pass',
  'Kode meja': 'Table code', '{n} dari 4 pemain · kursi kosong diisi bot ({lv})': '{n} of 4 players · bots fill empty seats ({lv})',
  'Bagikan link': 'Share link', 'Mulai': 'Start', 'Menunggu pembuat meja memulai…': 'Waiting for the host to start…',
  'Mencari lawan… {n} dari 4 pemain. Kursi kosong diisi bot (tanda 🤖).': 'Finding opponents… {n} of 4 players. Bots (🤖) fill empty seats.',
  'Kamu masuk di ronde berikutnya': 'You join next round', 'Ronde {n} sedang jalan': 'Round {n} in progress',
  'Main Capsa Banting bareng yuk! Kode meja {code}': 'Come play Capsa Banting! Table code {code}', 'Link disalin': 'Link copied',
  // hasil
  '{name} menang': '{name} wins', 'Kamu menang!': 'You win!', 'Kamu kalah': 'You lose', 'Keluar terakhir': 'Last play', 'Rating': 'Rating', 'Saldo': 'Balance',
  'Menyimpan koin & rating…': 'Saving coins & rating…', 'Bonus harian Ranked pertama hari ini: +{n} koin': 'Daily bonus for your first Ranked round today: +{n} coins',
  'Lihat meja': 'View table', 'poin': 'points', 'Pemain': 'Player', 'Sisa': 'Left', 'Kartu 2': '2s',
  'Koin': 'Coins', 'Ronde berikutnya dalam {s} dtk': 'Next round in {s}s', 'Ketuk meja untuk kembali ke hasil': 'Tap the table to return to the results',
  // efek & riwayat
  'Semua pass — kamu bebas jalan': 'Everyone passed — lead anything', 'HABIS!': 'OUT!', '{name} habis!': '{name} is out!',
  '{name} tinggal 1 kartu!': '{name} has 1 card left!', 'Belum ada kartu yang keluar': 'No cards played yet', 'Putaran {n}': 'Trick {n}',
  'Riwayat kartu': 'Card history', 'Kartu yang belum terlihat (di tangan lawan):': 'Cards not seen yet (in opponents\' hands):', 'Kartu 2 yang belum keluar': '2s not played yet',
  // koin meja bot (HP)
  'Koin meja lawan bot (tersimpan di HP ini)': 'Bot-table coins (stored on this device)', 'meja bot': 'bot tables', 'Lawan 3 bot': 'Vs 3 bots',
  'tanpa login · koin di HP ini': 'no login · coins on this device', 'min {n}': 'min {n}', 'Tanpa koin': 'No coins',
  'Koin meja bot kurang dari {min}. Saldo diisi lagi jadi {start} besok jam 00.01 WIB. Sementara main di meja Latihan dulu.':
    'Bot-table coins are below {min}. Your balance is refilled to {start} tomorrow at 00:01 WIB. Play the Practice table meanwhile.',
  'Koin meja bot kurang untuk meja {s}': 'Not enough bot-table coins for table {s}', 'Ronde ditinggal dihitung kalah: {n} koin': 'Abandoned round counted as a loss: {n} coins',
  'Ronde ini masih jalan. Keluar sekarang dihitung kalah: −{n} koin.': 'This round is still running. Leaving now counts as a loss: −{n} coins.',
  'koin meja bot': 'bot-table coins',
  // kasih menang & pemenang jalan duluan
  'Pemain sesudahmu sisa 1 kartu: main satu = wajib kartu tertinggi, kalau tidak bisa kena bayar semua':
    'The next player has 1 card left: if you play a single it must be your highest, or you may pay for everyone',
  'Awas: bukan kartu tertinggimu — kalau dia habis, kamu bayar semua': 'Careful: not your highest card — if they go out, you pay for everyone',
  'bayar semua': 'pays all', 'dibayar {name}': 'paid by {name}',
  'Kasih menang: {name} bayar semua': 'Let them win: {name} pays for everyone',
  'Ronde pertama: pemegang 3♦ jalan pertama, dan kartu pertama yang dikeluarkan harus mengandung 3♦. Ronde berikutnya: pemenang ronde sebelumnya jalan duluan, bebas.':
    'First round: whoever holds the 3♦ starts, and the first play must include the 3♦. Later rounds: the previous winner starts and may lead anything.',
  'Kasih menang = bayar semua: kalau pemain sesudahmu tinggal 1 kartu dan putarannya satu kartu, kamu wajib keluarkan kartu tertinggimu. Kalau kamu keluarkan kartu lebih kecil, atau pass padahal bisa menutup, lalu dia habis, kamu bayar poin semua yang kalah.':
    'Letting someone win = paying for everyone: when the next player has 1 card left in a singles trick, you must play your highest card. If you play a lower card, or pass when you could beat it, and they go out, you pay all losers\' points.',
  // kombinasi
  'Satu': 'Single', 'Pasang': 'Pair', 'Tris': 'Triple', 'Straight': 'Straight', 'Flush': 'Flush', 'Full house': 'Full house',
  'Four of a kind': 'Four of a kind', 'Straight flush': 'Straight flush',
  // pesan server / engine
  'Kartu tidak cocok': 'Those cards are not in your hand', 'Langkah pertama harus mengandung 3♦': 'The first play must include the 3♦',
  'Kombinasi tidak sah': 'Not a valid combination', 'Jumlah kartu harus sama': 'Must be the same number of cards', 'Kartu itu tidak bisa mengalahkan': 'That does not beat it',
  'Aksi tidak dikenal': 'Unknown action', 'Ronde sudah selesai': 'The round is over', 'Bukan giliranmu': 'Not your turn', 'Kamu harus mengeluarkan kartu': 'You must play a card',
  'Kursi tidak ditemukan': 'Seat not found', 'Permainan sudah mulai': 'The game has already started', 'Meja penuh': 'Table is full',
  'Hanya pembuat meja yang bisa memulai': 'Only the host can start', 'Ronde belum selesai': 'The round is not over yet',
  'Ronde berikutnya jalan sendiri': 'The next round starts on its own', 'Kamu tidak duduk di meja ini': 'You are not seated at this table', 'Tidak ada pemain': 'No players', 'Bukan waktunya': 'Not now', 'Bukan kursimu': 'Not your seat',
  'Meja sudah ditutup': 'The table is closed', 'Koin tidak cukup untuk meja ini': 'Not enough coins for this table',
  'Koin tidak cukup untuk lanjut di meja ini': 'Not enough coins to keep playing at this table',
  'Koneksi putus terlalu lama, kursimu diisi bot': 'Disconnected too long, a bot took your seat',
  'Kamu dikeluarkan dari meja karena tidak aktif 2 ronde': 'You were removed from the table for being inactive for 2 rounds',
  'Meja penuh, coba cari meja lagi': 'Table is full, try finding a table again', 'keluar': 'left', 'Koneksi ke meja terputus': 'Lost connection to the table',
  'Origin tidak diizinkan': 'Origin not allowed', 'Ranked belum tersedia': 'Ranked is not available yet', 'Meja tidak dikenal': 'Unknown table',
  'Server akun tidak menjawab, coba lagi': 'The account server is not responding, try again', 'Server akun tidak menjawab': 'The account server is not responding',
  'Login tidak dikenali. Masuk lagi dengan Google.': 'Sign-in not recognised. Sign in with Google again.', 'Data pemain tidak lengkap': 'Incomplete player data',
  'Tidak ditemukan': 'Not found', 'Butuh WebSocket': 'WebSocket required', 'Server error': 'Server error', 'Server online tidak tersedia': 'Online server not available',
  'Di iPhone: ketuk tombol Bagikan lalu pilih "Tambah ke Layar Utama".': 'On iPhone: tap the Share button, then choose "Add to Home Screen".',
  'Kalau ikon Capsa Banting Kung2 sudah ada di layar utama, berarti sudah terpasang: buka lewat ikon itu. Kalau belum, ketuk menu ⋮ Chrome lalu pilih "Install app" atau "Tambahkan ke layar utama".':
    'If the Capsa Banting Kung2 icon is already on your home screen, it is installed: open it from there. If not, tap the Chrome ⋮ menu and choose "Install app" or "Add to Home screen".',
};
