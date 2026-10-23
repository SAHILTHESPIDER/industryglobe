/** Extra real titles so every region clears 200 and every genre clears 40. */
const rows = [];
const add = (country, genre, author, entries) => {
    entries.forEach(([year, title, fame]) => rows.push([title, author, year, country, genre, fame || 0]));
};

add('EG', 'NOVEL', 'Sonallah Ibrahim', [
    [1981, 'The Committee', 70], [1992, 'Zaat', 66], [1966, 'That Smell', 68], [2007, 'Stealth', 58],
]);
add('EG', 'NOVEL', 'Yusuf Idris', [
    [1954, 'The Cheapest Nights', 64], [1957, 'City of Love and Ashes', 60],
]);
add('EG', 'NOVEL', 'Tawfiq al-Hakim', [
    [1933, 'Return of the Spirit', 72], [1937, 'Diary of a Country Prosecutor', 74],
]);
add('EG', 'NOVEL', 'Radwa Ashour', [
    [1994, 'Granada', 74], [2010, 'The Woman from Tantoura', 70], [1999, 'Specters', 60],
]);
add('EG', 'NOVEL', 'Bahaa Taher', [
    [2007, 'Sunset Oasis', 72], [1991, 'Aunt Safiyya and the Monastery', 64],
]);
add('EG', 'NOVEL', 'Youssef Ziedan', [[2008, 'Azazeel', 76]]);
add('EG', 'NOVEL', 'Khaled Al Khamissi', [[2006, 'Taxi', 68]]);
add('TR', 'NOVEL', 'Oğuz Atay', [[1971, 'The Disconnected', 74]]);
add('TR', 'NOVEL', 'Latife Tekin', [[1984, 'Berji Kristin: Tales from the Garbage Hills', 68]]);
add('TR', 'NOVEL', 'Zülfü Livaneli', [
    [2002, 'Bliss', 70], [2011, 'Serenade for Nadia', 62],
]);
add('TR', 'THRILLER', 'Ahmet Ümit', [
    [2000, 'Patasana', 64], [2010, 'A Memento for Istanbul', 66],
]);
add('TR', 'NOVEL', 'Elif Batuman', [[2017, 'The Idiot', 72]]);
add('IL', 'NOVEL', 'A.B. Yehoshua', [
    [1977, 'The Lover', 72], [1990, 'Mr. Mani', 74], [2004, 'A Woman in Jerusalem', 64],
]);
add('IL', 'NOVEL', 'Zeruya Shalev', [
    [1997, 'Love Life', 66], [2000, 'Husband and Wife', 62],
]);
add('IL', 'NOVEL', 'Aharon Appelfeld', [
    [1978, 'Badenheim 1939', 78], [2006, 'Blooms of Darkness', 64],
]);
add('IL', 'NOVEL', 'Meir Shalev', [
    [2006, 'A Pigeon and a Boy', 66], [1991, 'Esau', 58],
]);
add('LB', 'NOVEL', 'Hoda Barakat', [
    [1990, 'The Stone of Laughter', 64], [1998, 'The Tiller of Waters', 66],
]);
add('LB', 'NOVEL', 'Elias Khoury', [
    [1981, 'White Masks', 64], [2002, 'Yalo', 62],
]);
add('LB', 'NOVEL', 'Rawi Hage', [
    [2006, 'De Niro\'s Game', 74], [2008, 'Cockroach', 66],
]);
add('LB', 'NOVEL', 'Jabbour Douaihy', [[2008, 'June Rain', 60]]);
add('PS', 'NOVEL', 'Susan Abulhawa', [
    [2010, 'Mornings in Jenin', 78], [2015, 'The Blue Between Sky and Water', 66],
    [2020, 'Against the Loveless World', 64],
]);
add('PS', 'NOVEL', 'Mourid Barghouti', [[1997, 'I Saw Ramallah', 76]]);
add('PS', 'NOVEL', 'Suad Amiry', [[2004, 'Sharon and My Mother-in-Law', 64]]);
add('PS', 'NOVEL', 'Adania Shibli', [[2017, 'Minor Detail', 74]]);
add('PS', 'NOVEL', 'Sahar Khalifeh', [
    [1976, 'Wild Thorns', 70], [1990, 'Passage to the Plaza', 58],
]);
add('PS', 'NOVEL', 'Isabella Hammad', [[2019, 'The Parisian', 68]]);
add('SY', 'NOVEL', 'Khaled Khalifa', [
    [2006, 'In Praise of Hatred', 72], [2013, 'No Knives in the Kitchens of This City', 68],
    [2016, 'Death Is Hard Work', 74],
]);
add('SY', 'NOVEL', 'Nihad Sirees', [[2004, 'The Silence and the Roar', 64]]);
add('SY', 'NOVEL', 'Samar Yazbek', [[2012, 'A Woman in the Crossfire', 62]]);
add('SY', 'NOVEL', 'Rafik Schami', [[1989, 'Damascus Nights', 66]]);
add('IQ', 'NOVEL', 'Hassan Blasim', [[2013, 'The Iraqi Christ', 68]]);
add('IQ', 'NOVEL', 'Inaam Kachachi', [[2008, 'The American Granddaughter', 62]]);
add('SA', 'NOVEL', 'Yousef Al-Mohaimeed', [[2003, 'Wolves of the Crescent Moon', 62]]);
add('SA', 'NOVEL', 'Abdo Khal', [[2009, 'Throwing Sparks', 64]]);
add('SA', 'NOVEL', 'Raja Alem', [[2010, 'The Dove\'s Necklace', 66]]);
add('OM', 'NOVEL', 'Jokha Alharthi', [
    [2010, 'Celestial Bodies', 80], [2016, 'Bitter Orange Tree', 68],
]);
add('YE', 'NOVEL', 'Ali al-Muqri', [
    [2004, 'The Handsome Jew', 60], [2008, 'Hurma', 56],
]);
add('JO', 'NOVEL', 'Fadia Faqir', [[1996, 'Pillars of Salt', 64]]);
add('IR', 'NOVEL', 'Simin Daneshvar', [[1969, 'Savushun', 78]]);
add('IR', 'NOVEL', 'Mahmoud Dowlatabadi', [
    [2009, 'The Colonel', 72], [1979, 'Missing Soluch', 66],
]);
add('IR', 'NOVEL', 'Houshang Golshiri', [[1969, 'Prince Ehtejab', 64]]);
add('IR', 'NOVEL', 'Zoya Pirzad', [[2001, 'Things We Left Unsaid', 66]]);
add('IR', 'NOVEL', 'Fattaneh Haj Seyed Javadi', [[1998, 'The Morning After', 58]]);

add('ID', 'NOVEL', 'Tere Liye', [
    [2016, 'Tentang Kamu', 62], [2009, 'Burlian', 56],
    [2010, 'Negeri Para Bedebah', 60], [2013, 'Negeri Di Ujung Tanduk', 56],
    [2010, 'Daun yang Jatuh Tak Pernah Membenci Angin', 64],
    [2006, 'Moga Bunda Disayang Allah', 62], [2008, 'Bidadari-Bidadari Surga', 58],
]);
add('ID', 'FANTASY', 'Dee Lestari', [
    [2001, 'Supernova: Ksatria, Putri, dan Bintang Jatuh', 66],
    [2002, 'Supernova: Akar', 56], [2004, 'Supernova: Petir', 54],
]);
add('ID', 'NOVEL', 'Pramoedya Ananta Toer', [
    [1951, 'The Fugitive', 64], [1954, 'Corruption', 56],
    [1995, 'The Mute\'s Soliloquy', 70],
]);
add('ID', 'NOVEL', 'Seno Gumira Ajidarma', [[1996, 'Jazz, Perfume and the Incident', 62]]);
add('ID', 'NOVEL', 'Nh. Dini', [[1973, 'Pada Sebuah Kapal', 60]]);
add('ID', 'COMIC', 'Faza Meonk', [[2010, 'Si Juki', 64]]);
add('ID', 'COMIC', 'Is Yuniarto', [[2009, 'Garudayana', 60]]);
add('PH', 'NOVEL', 'Ninotchka Rosca', [
    [1988, 'State of War', 68], [1992, 'Twice Blessed', 56],
]);
add('PH', 'NOVEL', 'Charlson Ong', [[2002, 'An Embarrassment of Riches', 58]]);
add('PH', 'NOVEL', 'Dean Francis Alfar', [[2007, 'Salamanca', 58]]);
add('PH', 'NOVEL', 'Lualhati Bautista', [[1988, 'Gapo', 60]]);
add('PH', 'COMIC', 'Carlo Vergara', [[2003, 'Zsazsa Zaturnnah', 66]]);
add('PH', 'COMIC', 'Gerry Alanguilan', [
    [1997, 'Wasted', 60], [2006, 'Elmer', 68],
]);
add('PH', 'COMIC', 'Manix Abrera', [[2005, 'Kikomachine Komix', 62]]);
add('TH', 'NOVEL', 'Veeraporn Nitiprapha', [[2015, 'The Blind Earthworm in the Labyrinth', 66]]);
add('TH', 'NOVEL', 'Uthis Haemamool', [[2007, 'The Brotherhood of Kaeng Khoi', 60]]);
add('VN', 'NOVEL', 'Nguyễn Ngọc Tư', [[2005, 'Endless Field', 64]]);
add('VN', 'NOVEL', 'Nguyễn Huy Thiệp', [[1987, 'The General Retires', 66]]);
add('VN', 'NOVEL', 'Phạm Thị Hoài', [[1988, 'The Crystal Messenger', 60]]);
add('VN', 'NOVEL', 'Nguyễn Nhật Ánh', [
    [1995, 'The Girl in the Grey Sweater', 58], [2005, 'I Am Beto', 54],
]);
add('MY', 'NOVEL', 'Beth Yahp', [[1992, 'The Crocodile Fury', 58]]);
add('MY', 'NOVEL', 'Shih-Li Kow', [[2015, 'The Sum of Our Follies', 56]]);
add('SG', 'NOVEL', 'Balli Kaur Jaswal', [
    [2017, 'Erotic Stories for Punjabi Widows', 72], [2023, 'Now You See Us', 60],
    [2016, 'Sugarbread', 56],
]);
add('SG', 'NOVEL', 'Jeremy Tiang', [[2017, 'State of Emergency', 58]]);
add('SG', 'NOVEL', 'Suchen Christine Lim', [[2013, 'The River\'s Song', 58]]);
add('SG', 'NOVEL', 'Catherine Lim', [
    [1998, 'The Teardrop Story Woman', 58], [2003, 'The Song of Silver Frond', 54],
]);
add('MM', 'NOVEL', 'Nu Nu Yi', [[2008, 'Smile as They Bow', 60]]);
add('ID', 'NOVEL', 'Norman Erikson Pasaribu', [[2020, 'Happy Stories, Mostly', 64]]);
add('ID', 'NOVEL', 'Ahmad Tohari', [[1986, 'Bekisar Merah', 56]]);
add('PH', 'NOVEL', 'Merlinda Bobis', [[2005, 'Banana Heart Summer', 60]]);
add('PH', 'NOVEL', 'Elaine Castillo', [[2018, 'America Is Not the Heart', 66]]);
add('TH', 'NOVEL', 'S.P. Somtow', [[1985, 'Vampire Junction', 58]]);
add('VN', 'HISTORY', 'Dương Văn Mai Elliott', [[1999, 'The Sacred Willow', 64]]);
add('VN', 'HISTORY', 'Đặng Thùy Trâm', [[2005, 'Last Night I Dreamed of Peace', 70]]);
add('ID', 'HISTORY', 'Pramoedya Ananta Toer', [[1988, 'Arok of Java', 58]]);

add('AU', 'THRILLER', 'Peter Temple', [
    [2005, 'The Broken Shore', 80], [2009, 'Truth', 72], [1996, 'Bad Debts', 64],
    [1999, 'Black Tide', 56], [2000, 'Dead Point', 54],
]);
add('AU', 'THRILLER', 'Garry Disher', [
    [1999, 'The Dragon Man', 62], [2013, 'Bitter Wash Road', 66],
    [2018, 'Peace', 60], [2020, 'Consolation', 58],
]);
add('AU', 'THRILLER', 'Michael Robotham', [
    [2004, 'The Suspect', 70], [2005, 'Lost', 58], [2019, 'Good Girl, Bad Girl', 68],
    [2020, 'When She Was Good', 60],
]);
add('AU', 'THRILLER', 'Candice Fox', [
    [2013, 'Hades', 64], [2014, 'Eden', 58], [2017, 'Crimson Lake', 66],
]);
add('AU', 'THRILLER', 'Chris Hammer', [
    [2018, 'Scrublands', 74], [2019, 'Silver', 60], [2021, 'Treasure & Dirt', 58],
]);
add('AU', 'NOVEL', 'Michelle de Kretser', [
    [2003, 'The Hamilton Case', 64], [2007, 'The Lost Dog', 62],
    [2012, 'Questions of Travel', 70], [2017, 'The Life to Come', 66],
]);
add('AU', 'NOVEL', 'Geraldine Brooks', [
    [2001, 'Year of Wonders', 82], [2005, 'March', 74],
    [2008, 'People of the Book', 76], [2022, 'Horse', 72],
]);
add('AU', 'NOVEL', 'Alex Miller', [
    [1992, 'The Ancestor Game', 64], [2002, 'Journey to the Stone Country', 62],
    [2013, 'Coal Creek', 66],
]);
add('AU', 'NOVEL', 'Tim Winton', [
    [1984, 'Shallows', 60], [1986, 'That Eye, the Sky', 58],
    [2004, 'The Turning', 64],
]);
add('AU', 'NOVEL', 'Peter Carey', [
    [2010, 'Parrot and Olivier in America', 66], [2017, 'A Long Way from Home', 64],
    [2006, 'Theft', 58],
]);
add('AU', 'NOVEL', 'Richard Flanagan', [
    [1994, 'Death of a River Guide', 64], [2008, 'Wanting', 60],
    [2020, 'The Living Sea of Waking Dreams', 66],
]);
add('AU', 'NOVEL', 'David Malouf', [
    [1978, 'An Imaginary Life', 70], [1982, 'Fly Away Peter', 64],
]);
add('AU', 'NOVEL', 'Helen Garner', [
    [1984, 'The Children\'s Bach', 66], [2004, 'Joe Cinque\'s Consolation', 68],
]);
add('AU', 'EPIC', 'Colleen McCullough', [
    [1993, 'Fortune\'s Favorites', 60], [1996, 'Caesar\'s Women', 58],
    [2002, 'The October Horse', 56],
]);
add('AU', 'NOVEL', 'Bryce Courtenay', [
    [1995, 'The Potato Factory', 66], [1997, 'Tommo & Hawk', 56],
    [1999, 'Solomon\'s Song', 54],
]);
add('AU', 'NOVEL', 'Markus Zusak', [
    [2002, 'The Messenger', 72], [2018, 'Bridge of Clay', 60],
]);
add('AU', 'FANTASY', 'Melina Marchetta', [
    [2008, 'Finnikin of the Rock', 70], [2011, 'Froi of the Exiles', 60],
    [2012, 'Quintana of Charyn', 58],
]);
add('AU', 'FANTASY', 'Isobelle Carmody', [
    [1990, 'The Farseekers', 58], [1995, 'Ashling', 54], [2008, 'The Stone Key', 52],
]);
add('AU', 'FANTASY', 'Trudi Canavan', [
    [2001, 'The Magicians\' Guild', 70], [2002, 'The Novice', 58], [2002, 'The High Lord', 56],
]);
add('NZ', 'FANTASY', 'Juliet Marillier', [
    [1999, 'Daughter of the Forest', 74], [2000, 'Son of the Shadows', 64],
    [2001, 'Child of the Prophecy', 60],
]);
add('NZ', 'NOVEL', 'Lloyd Jones', [[2009, 'Hand Me Down World', 58]]);
add('NZ', 'NOVEL', 'Catherine Chidgey', [[2016, 'The Wish Child', 62]]);
add('NZ', 'NOVEL', 'Elizabeth Knox', [[2019, 'The Absolute Book', 66]]);
add('WS', 'NOVEL', 'Albert Wendt', [
    [1979, 'Leaves of the Banyan Tree', 70], [1973, 'Sons for the Return Home', 64],
]);
add('WS', 'NOVEL', 'Lani Wendt Young', [[2012, 'Telesa: The Covenant Keeper', 58]]);
add('FJ', 'NOVEL', 'Joseph Veramu', [[1994, 'Moving Through the Streets', 52]]);

add('NG', 'THRILLER', 'Oyinkan Braithwaite', [[2018, 'My Sister, the Serial Killer', 84]]);
add('NG', 'NOVEL', 'Abi Daré', [[2020, 'The Girl with the Louding Voice', 78]]);
add('NG', 'NOVEL', 'Lesley Nneka Arimah', [[2017, 'What It Means When a Man Falls from the Sky', 70]]);
add('NG', 'NOVEL', 'Jowhor Ile', [[2016, 'And After Many Days', 60]]);
add('NG', 'NOVEL', 'Cheluchi Onyemelukwe-Onuobia', [[2020, 'The Son of the House', 62]]);
add('NG', 'FANTASY', 'Akwaeke Emezi', [
    [2020, 'The Death of Vivek Oji', 74], [2022, 'You Made a Fool of Death with Your Beauty', 60],
]);
add('NG', 'FANTASY', 'Nnedi Okorafor', [
    [2017, 'Akata Warrior', 64], [2021, 'Noor', 62],
]);
add('ZA', 'NOVEL', 'Redi Tlhabi', [[2017, 'Khwezi', 66]]);
add('ZA', 'NOVEL', 'Sisonke Msimang', [[2017, 'Always Another Country', 64]]);
add('ZA', 'NOVEL', 'Zukiswa Wanner', [[2006, 'The Madams', 56]]);
add('ZA', 'THRILLER', 'Angela Makholwa', [[2007, 'Red Ink', 58]]);
add('ZA', 'THRILLER', 'Deon Meyer', [
    [2011, 'Seven Days', 60], [2015, 'Icarus', 58], [2019, 'The Last Hunt', 56],
]);
add('ZA', 'NOVEL', 'Masande Ntshanga', [[2014, 'The Reactive', 60]]);
add('ZA', 'NOVEL', 'Yewande Omotoso', [[2016, 'The Woman Next Door', 66]]);
add('ZA', 'NOVEL', 'Kgebetli Moele', [[2006, 'Room 207', 58]]);
add('ZW', 'NOVEL', 'Novuyo Rosa Tshuma', [[2018, 'House of Stone', 66]]);
add('SD', 'NOVEL', 'Leila Aboulela', [
    [1999, 'The Translator', 72], [2005, 'Minaret', 68], [2010, 'Lyrics Alley', 66],
    [2023, 'River Spirit', 64],
]);
add('SO', 'NOVEL', 'Nuruddin Farah', [
    [1970, 'From a Crooked Rib', 74], [1986, 'Maps', 72], [1993, 'Gifts', 58],
    [1998, 'Secrets', 56], [2003, 'Links', 60], [2011, 'Crossbones', 58],
]);
add('MZ', 'NOVEL', 'Mia Couto', [
    [1992, 'Sleepwalking Land', 78], [2000, 'The Last Flight of the Flamingo', 66],
    [2012, 'The Tuner of Silences', 62], [2015, 'Woman of the Ashes', 64],
]);
add('AO', 'NOVEL', 'José Eduardo Agualusa', [
    [2004, 'The Book of Chameleons', 74], [2012, 'A General Theory of Oblivion', 72],
    [2017, 'The Society of Reluctant Dreamers', 60],
]);
add('AO', 'NOVEL', 'Ondjaki', [[2008, 'Granma Nineteen and the Soviet\'s Secret', 62]]);
add('MZ', 'NOVEL', 'Paulina Chiziane', [[2002, 'The First Wife', 66]]);
add('KE', 'NOVEL', 'Mukoma Wa Ngugi', [[2013, 'Nairobi Heat', 58]]);
add('GH', 'NOVEL', 'Ayesha Harruna Attah', [[2018, 'The Hundred Wells of Salaga', 64]]);
add('SN', 'NOVEL', 'Boubacar Boris Diop', [[1981, 'Murambi, The Book of Bones', 70]]);

add('BR', 'NOVEL', 'Jorge Amado', [
    [1935, 'Jubiabá', 70], [1964, 'Shepherds of the Night', 60],
    [1988, 'The War of the Saints', 62], [1959, 'The Two Deaths of Quincas Wateryell', 68],
]);
add('BR', 'NOVEL', 'Clarice Lispector', [
    [1949, 'The Besieged City', 64], [1961, 'The Apple in the Dark', 66],
    [1978, 'A Breath of Life', 68],
]);
add('BR', 'NOVEL', 'Conceição Evaristo', [[2016, 'Insubmissas Lágrimas de Mulheres', 58]]);
add('AR', 'NOVEL', 'Selva Almada', [
    [2012, 'The Wind That Lays Waste', 66], [2014, 'Dead Girls', 72],
]);
add('AR', 'THRILLER', 'Claudia Piñeiro', [
    [2010, 'Betty Boo', 60], [2021, 'A Little Luck', 64],
]);
add('CL', 'NOVEL', 'Pedro Lemebel', [[2001, 'My Tender Matador', 72]]);
add('CL', 'NOVEL', 'Diamela Eltit', [[1983, 'E. Luminata', 60]]);
add('CU', 'NOVEL', 'Wendy Guerra', [[2006, 'Everyone Leaves', 62]]);
add('CU', 'NOVEL', 'Pedro Juan Gutiérrez', [[1998, 'Dirty Havana Trilogy', 70]]);
add('CU', 'NOVEL', 'Karla Suárez', [[2019, 'Havana Year Zero', 58]]);
add('PE', 'NOVEL', 'Gabriela Wiener', [[2008, 'Sexographies', 62]]);
add('UY', 'NOVEL', 'Mario Levrero', [
    [1996, 'Empty Words', 64], [2005, 'The Luminous Novel', 66],
]);
add('UY', 'NOVEL', 'Fernanda Trías', [[2020, 'Pink Slime', 64]]);
add('CO', 'NOVEL', 'Pilar Quintana', [[2021, 'Abyss', 62]]);
add('JM', 'NOVEL', 'Kei Miller', [[2016, 'Augustown', 70]]);
add('JM', 'NOVEL', 'Nicole Dennis-Benn', [
    [2016, 'Here Comes the Sun', 68], [2019, 'Patsy', 62],
]);
add('JM', 'FANTASY', 'Marlon James', [[2022, 'Moon Witch, Spider King', 72]]);
add('TT', 'FANTASY', 'Monique Roffey', [[2020, 'The Mermaid of Black Conch', 74]]);
add('TT', 'NOVEL', 'Ingrid Persaud', [[2020, 'Love After Love', 68]]);
add('TT', 'NOVEL', 'Kevin Jared Hosein', [[2023, 'Hungry Ghosts', 70]]);
add('TT', 'NOVEL', 'Claire Adam', [[2019, 'Golden Child', 66]]);
add('NI', 'NOVEL', 'Gioconda Belli', [
    [1988, 'The Inhabited Woman', 72], [2008, 'Infinity in the Palm of Her Hand', 60],
]);
add('NI', 'NOVEL', 'Sergio Ramírez', [[1988, 'Divine Punishment', 64]]);
add('SV', 'NOVEL', 'Horacio Castellanos Moya', [
    [2004, 'Senselessness', 70], [2000, 'The She-Devil in the Mirror', 58],
]);
add('GT', 'NOVEL', 'Rodrigo Rey Rosa', [[1996, 'The Good Cripple', 60]]);
add('GT', 'NOVEL', 'Eduardo Halfon', [[2013, 'Mourning', 64]]);
add('DO', 'NOVEL', 'Rita Indiana', [[2011, 'Papi', 58]]);

add('IN', 'NOVEL', 'Anuradha Roy', [
    [2008, 'An Atlas of Impossible Longing', 70], [2011, 'The Folded Earth', 64],
    [2015, 'Sleeping on Jupiter', 66], [2018, 'All the Lives We Never Lived', 68],
]);
add('IN', 'NOVEL', 'Neel Mukherjee', [
    [2014, 'The Lives of Others', 74], [2017, 'A State of Freedom', 60],
]);
add('IN', 'NOVEL', 'Vivek Shanbhag', [[2013, 'Ghachar Ghochar', 76]]);
add('IN', 'NOVEL', 'K.R. Meera', [
    [2012, 'Hangwoman', 72], [2011, 'The Poison of Love', 60],
]);
add('IN', 'NOVEL', 'Benyamin', [
    [2008, 'Goat Days', 78], [2014, 'Jasmine Days', 64],
]);
add('IN', 'NOVEL', 'Easterine Kire', [
    [2007, 'A Terrible Matriarchy', 62], [2014, 'When the River Sleeps', 64],
]);
add('IN', 'NOVEL', 'Janice Pariat', [[2012, 'Boats on Land', 60]]);
add('IN', 'NOVEL', 'Megha Majumdar', [[2020, 'A Burning', 74]]);
add('IN', 'NOVEL', 'Avni Doshi', [[2020, 'Burnt Sugar', 70]]);
add('IN', 'NOVEL', 'Deepti Kapoor', [[2023, 'Age of Vice', 72]]);
add('IN', 'NOVEL', 'Karan Mahajan', [[2016, 'The Association of Small Bombs', 68]]);
add('IN', 'NOVEL', 'Sanjeev Sahota', [
    [2015, 'The Year of the Runaways', 70], [2021, 'China Room', 64],
]);
add('IN', 'NOVEL', 'Hansda Sowvendra Shekhar', [[2015, 'The Adivasi Will Not Dance', 64]]);
add('LK', 'NOVEL', 'Anuk Arudpragasam', [
    [2016, 'The Story of a Brief Marriage', 72], [2021, 'A Passage North', 70],
]);
add('IN', 'HISTORY', 'Arundhati Roy', [
    [2019, 'My Seditious Heart', 66], [2020, 'Azadi', 68],
]);
add('IN', 'TRUE_CRIME', 'S. Hussain Zaidi', [[2017, 'Eleventh Hour', 52]]);

add('US', 'TRUE_CRIME', 'Robert Kolker', [[2013, 'Lost Girls', 70]]);
add('US', 'TRUE_CRIME', 'Rachel Monroe', [[2019, 'Savage Appetites', 58]]);
add('US', 'TRUE_CRIME', 'Elon Green', [[2021, 'Last Call', 60]]);
add('GB', 'TRUE_CRIME', 'Gordon Burn', [[1998, 'Happy Like Murderers', 58]]);
add('GB', 'TRUE_CRIME', 'David Wilson', [[2014, 'A History of British Serial Killing', 54]]);
add('AU', 'HISTORY', 'Helen Garner', [[2016, 'Everywhere I Look', 56]]);
add('ZA', 'TRUE_CRIME', 'Antjie Krog', [[1998, 'Country of My Skull', 78]]);
add('MX', 'TRUE_CRIME', 'Anabel Hernández', [[2010, 'Narcoland', 74]]);
add('CO', 'TRUE_CRIME', 'Alonso Salazar', [[1990, 'Born to Die in Medellín', 60]]);
add('JP', 'TRUE_CRIME', 'Seichō Matsumoto', [[1958, 'Points and Lines', 68]]);
add('IN', 'TRUE_CRIME', 'Meenal Baghel', [[2012, 'Death in Mumbai', 56]]);

add('ID', 'NOVEL', 'Andrea Hirata', [
    [2010, 'Padang Bulan', 58], [2011, 'Cinta di Dalam Gelas', 54],
]);
add('ID', 'ROMANCE', 'Habiburrahman El Shirazy', [
    [2010, 'Bumi Cinta', 60], [2007, 'Dalam Mihrab Cinta', 56],
]);
add('ID', 'ROMANCE', 'Asma Nadia', [[2015, 'Surga yang Tak Dirindukan', 62]]);
add('ID', 'NOVEL', 'Putu Wijaya', [[1977, 'Telegram', 56]]);
add('ID', 'COMIC', 'Nurfadli Mursyid', [[2014, 'Tahilalats', 66]]);
add('ID', 'NOVEL', 'Tere Liye', [
    [2018, 'Si Anak Pintar', 54], [2019, 'Si Anak Spesial', 52],
    [2019, 'Si Anak Kuat', 52], [2020, 'Si Anak Pemberani', 50],
]);
add('PH', 'NOVEL', 'Bob Ong', [
    [2007, 'Macarthur', 58], [2002, 'Bakit Baligtad Magbasa ng Libro ang mga Pilipino', 60],
    [2009, 'Kapitan Sino', 54],
]);
add('PH', 'FANTASY', 'Edgar Calabia Samar', [[2014, 'Janus Silang at ang Tiyanak ng Tábon', 62]]);
add('PH', 'HISTORY', 'Ambeth Ocampo', [
    [1993, 'Bones of Contention', 58], [2008, 'Looking Back', 60],
]);
add('PH', 'NOVEL', 'F. Sionil José', [
    [1978, 'Tree', 56], [1978, 'My Brother, My Executioner', 60],
]);
add('TH', 'NOVEL', 'Win Lyovarin', [[1994, 'Democracy, Shaken and Stirred', 62]]);
add('TH', 'NOVEL', 'Chart Korbjitti', [[1993, 'Time', 54]]);
add('VN', 'CHILDREN', 'Nguyễn Nhật Ánh', [[1995, 'Kính Vạn Hoa', 66]]);
add('VN', 'NOVEL', 'Nguyễn Nhật Ánh', [[2003, 'Cho Tôi Xin Một Vé Đi Tuổi Thơ', 60]]);
add('SG', 'NOVEL', 'Alfian Sa\'at', [[2012, 'Malay Sketches', 60]]);
add('MY', 'NOVEL', 'Tash Aw', [[2009, 'Map of the Invisible World', 64]]);
add('ID', 'NOVEL', 'Leila S. Chudori', [[2014, '9 dari Nadira', 54]]);
add('ID', 'NOVEL', 'Ayu Utami', [[2001, 'Larung', 56]]);
add('PH', 'NOVEL', 'Nick Joaquin', [[1990, 'Manila, My Manila', 64]]);
add('VN', 'NOVEL', 'Bảo Ninh', [[1990, 'The Sorrow of War', 70]]);

add('EG', 'NOVEL', 'Naguib Mahfouz', [
    [1949, 'The Beginning and the End', 76], [1945, 'Cairo Modern', 68],
    [1945, 'Khan al-Khalili', 64], [1972, 'Mirrors', 60],
    [1981, 'Wedding Song', 58], [1985, 'The Day the Leader Was Killed', 66],
    [1987, 'Morning and Evening Talk', 58], [1964, 'The Search', 60],
]);
add('TR', 'NOVEL', 'Orhan Pamuk', [
    [1994, 'The New Life', 72], [1982, 'Cevdet Bey and His Sons', 66],
]);
add('TR', 'NOVEL', 'Elif Shafak', [
    [2002, 'The Flea Palace', 68], [2004, 'The Gaze', 58],
]);
add('IL', 'NOVEL', 'Amos Oz', [
    [1995, 'Don\'t Call It Night', 58], [2012, 'Between Friends', 62],
    [2007, 'Rhyming Life and Death', 60],
]);
add('IL', 'NOVEL', 'David Grossman', [
    [2000, 'Someone to Run With', 68], [1994, 'The Zigzag Kid', 64],
]);
add('IL', 'NOVEL', 'Etgar Keret', [[2010, 'Suddenly, a Knock on the Door', 64]]);
add('LB', 'NOVEL', 'Rabih Alameddine', [
    [2013, 'An Unnecessary Woman', 70], [2021, 'The Wrong End of the Telescope', 62],
]);
add('LB', 'NOVEL', 'Hoda Barakat', [[2017, 'Voices of the Lost', 66]]);
add('PS', 'NOVEL', 'Ibtisam Barakat', [[2007, 'Tasting the Sky', 64]]);
add('SA', 'NOVEL', 'Mohammed Hasan Alwan', [[2016, 'A Small Death', 68]]);
add('KW', 'NOVEL', 'Saud Alsanousi', [[2012, 'The Bamboo Stalk', 74]]);
add('AE', 'NOVEL', 'Mohammed Al Murr', [[1989, 'The Wink of the Mona Lisa', 54]]);
add('IR', 'NOVEL', 'Abbas Maroufi', [[1989, 'Symphony of the Dead', 66]]);
add('SY', 'NOVEL', 'Khaled Khalifa', [[2000, 'No One Prayed Over Their Graves', 56]]);
add('IQ', 'NOVEL', 'Ahmed Saadawi', [[2017, 'Frankenstein in Baghdad', 60]]);
add('JO', 'NOVEL', 'Ibrahim Nasrallah', [[2016, 'The Second War of the Dog', 54]]);

add('AU', 'THRILLER', 'Dervla McTiernan', [
    [2018, 'The Ruin', 72], [2019, 'The Scholar', 62], [2020, 'The Good Turn', 58],
]);
add('AU', 'THRILLER', 'Jane Harper', [[2020, 'The Survivors', 66]]);
add('AU', 'THRILLER', 'Chris Hammer', [[2020, 'Trust', 58]]);
add('AU', 'NOVEL', 'Tim Winton', [[1988, 'In the Winter Dark', 62]]);
add('AU', 'NOVEL', 'Christos Tsiolkas', [
    [2005, 'Dead Europe', 64], [1995, 'Loaded', 66],
]);
add('AU', 'THRILLER', 'Richard Flanagan', [[2006, 'The Unknown Terrorist', 60]]);
add('NZ', 'NOVEL', 'Eleanor Catton', [[2008, 'The Rehearsal', 64]]);
add('AU', 'NOVEL', 'Hannah Kent', [[2021, 'Devotion', 62]]);

add('ID', 'NOVEL', 'Andrea Hirata', [[2012, 'Sebelas Patriot', 52]]);
add('ID', 'NOVEL', 'Eka Kurniawan', [[2018, 'Kitchen Curse', 58]]);
add('ID', 'NOVEL', 'Intan Paramaditha', [[2018, 'Apple and Knife', 60]]);
add('PH', 'NOVEL', 'Gina Apostol', [[2009, 'The Revolution According to Raymundo Mata', 62]]);
add('PH', 'NOVEL', 'Vicente Garcia Groyon', [[2004, 'The Sky Over Dimas', 58]]);
add('ID', 'NOVEL', 'Ahmad Fuadi', [[2009, 'Negeri 5 Menara', 70]]);
add('ID', 'NOVEL', 'Laksmi Pamuntjak', [[2014, 'The Birdwoman\'s Palate', 60]]);
add('ID', 'NOVEL', 'Okky Madasari', [[2011, '86', 56]]);
add('SG', 'NOVEL', 'Rachel Heng', [[2018, 'Suicide Club', 60]]);

add('EG', 'NOVEL', 'Naguib Mahfouz', [[1975, 'Respected Sir', 60]]);
add('EG', 'NOVEL', 'Alaa Al Aswany', [[2018, 'The Republic of False Truths', 62]]);
add('TR', 'NOVEL', 'Elif Shafak', [[2024, 'There Are Rivers in the Sky', 70]]);
add('IL', 'NOVEL', 'David Grossman', [[2011, 'Falling Out of Time', 64]]);
add('LB', 'NOVEL', 'Amin Maalouf', [[2004, 'Origins', 62]]);
add('PS', 'NOVEL', 'Ghassan Kanafani', [[1966, 'All That\'s Left to You', 68]]);
add('IR', 'HISTORY', 'Azar Nafisi', [[2008, 'Things I\'ve Been Silent About', 60]]);

export const BOOKS_FILL = rows;
