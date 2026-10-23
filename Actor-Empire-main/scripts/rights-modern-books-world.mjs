/** Copyrighted books outside the North American and European lists. */
const rows = [];
const add = (country, genre, author, entries) => {
    entries.forEach(([year, title, fame]) => rows.push([title, author, year, country, genre, fame || 0]));
};

const manga = [
    [1997, 'One Piece'], [1999, 'Naruto'], [2001, 'Bleach'], [1984, 'Dragon Ball'],
    [2009, 'Attack on Titan'], [2003, 'Death Note'], [2001, 'Fullmetal Alchemist'],
    [2016, 'Demon Slayer'], [2014, 'My Hero Academia'], [2018, 'Jujutsu Kaisen'],
    [2018, 'Chainsaw Man'], [2019, 'Spy x Family'], [1998, 'Hunter x Hunter'],
    [1989, 'Berserk'], [1998, 'Vagabond'], [1994, 'Monster'], [1999, '20th Century Boys'],
    [2003, 'Pluto'], [1982, 'Akira'], [1989, 'Ghost in the Shell'], [1991, 'Sailor Moon'],
    [1998, 'Fruits Basket'], [2000, 'Nana'], [1990, 'Slam Dunk'], [2012, 'Haikyu!!'],
    [2008, 'Kuroko\'s Basketball'], [1999, 'The Prince of Tennis'], [1995, 'Initial D'],
    [1987, 'JoJo\'s Bizarre Adventure'], [2011, 'Tokyo Ghoul'], [1988, 'Parasyte'],
    [2005, 'Vinland Saga'], [2007, 'Goodnight Punpun'], [2005, 'Solanin'],
    [2007, 'March Comes in Like a Lion'], [2011, 'Your Lie in April'], [2013, 'A Silent Voice'],
    [2012, 'Orange'], [2012, 'Erased'], [2014, 'Delicious in Dungeon'], [2020, 'Frieren'],
    [2009, 'One-Punch Man'], [2012, 'Mob Psycho 100'], [2016, 'The Promised Neverland'],
    [2017, 'Dr. Stone'], [2015, 'Black Clover'], [2006, 'Fairy Tail'], [2012, 'The Seven Deadly Sins'],
    [1994, 'Rurouni Kenshin'], [1990, 'Yu Yu Hakusho'], [1983, 'Fist of the North Star'],
    [1986, 'Saint Seiya'], [1981, 'Captain Tsubasa'], [1981, 'Touch'], [1980, 'Maison Ikkoku'],
    [1978, 'Urusei Yatsura'], [1987, 'Ranma 1/2'], [1996, 'Inuyasha'], [1969, 'Doraemon'],
    [1990, 'Crayon Shin-chan'], [1994, 'Detective Conan'], [1972, 'Lone Wolf and Cub'],
    [1952, 'Astro Boy'], [1973, 'Black Jack'], [1967, 'Phoenix'], [1967, 'Dororo'],
    [1973, 'Barefoot Gen'], [1972, 'The Rose of Versailles'], [1978, 'Banana Fish'],
    [1996, 'Cardcaptor Sakura'], [1993, 'Magic Knight Rayearth'], [1992, 'X'],
    [1990, 'Tokyo Babylon'], [2003, 'xxxHolic'], [2003, 'Tsubasa: Reservoir Chronicle'],
    [2000, 'Chobits'], [1994, 'Angel Sanctuary'], [1986, 'Please Save My Earth'],
    [1982, 'Nausicaä of the Valley of the Wind'], [1980, 'Domu: A Child\'s Dream'],
    [2007, 'In This Corner of the World'], [2008, 'A Bride\'s Story'], [2002, 'Emma'],
    [2007, 'What Did You Eat Yesterday?'], [2014, 'My Brother\'s Husband'],
    [2016, 'My Lesbian Experience with Loneliness'], [2011, 'Blank Canvas'],
    [2014, 'Dead Dead Demon\'s Dededede Destruction'], [2016, 'Witch Hat Atelier'],
    [2008, 'Bakuman'], [1946, 'New Treasure Island'], [1971, 'A Drifting Life'],
    [1973, 'The Poe Clan'], [1975, 'To Terra'], [1976, 'They Were Eleven'],
    [1982, 'Adolf'], [1983, 'Buddha'], [2004, 'With the Light'], [1994, 'Paradise Kiss'],
    [1999, 'Kare Kano'], [2001, 'Honey and Clover'], [2002, 'Nodame Cantabile'],
    [2007, 'Chi\'s Sweet Home'], [2009, 'Space Brothers'], [2011, 'Silver Spoon'],
    [2015, 'My Love Story!!'], [2016, 'To Your Eternity'], [2017, 'The Ancient Magus\' Bride'],
    [2018, 'Beastars'], [2019, 'Blue Period'], [2020, 'Oshi no Ko'], [2011, 'Blue Exorcist'],
    [2001, 'Gantz'], [1990, 'Battle Angel Alita'],
];
manga.forEach(([year, title], index) => {
    const author = [
        'Eiichiro Oda', 'Masashi Kishimoto', 'Tite Kubo', 'Akira Toriyama', 'Hajime Isayama',
        'Tsugumi Ohba', 'Hiromu Arakawa', 'Koyoharu Gotouge', 'Kohei Horikoshi', 'Gege Akutami',
        'Tatsuki Fujimoto', 'Tatsuya Endo', 'Yoshihiro Togashi', 'Kentaro Miura', 'Takehiko Inoue',
        'Naoki Urasawa', 'Naoki Urasawa', 'Naoki Urasawa', 'Katsuhiro Otomo', 'Masamune Shirow',
        'Naoko Takeuchi', 'Natsuki Takaya', 'Ai Yazawa', 'Takehiko Inoue', 'Haruichi Furudate',
    ][index] || 'Rumiko Takahashi';
    rows.push([title, author, year, 'JP', 'MANGA', index < 20 ? 90 - (index % 8) : 0]);
});
// The quick author list above mis-assigns later series. Replace those rows' authors
// with the creators the titles are actually known by.
const MANGA_AUTHOR = {
    'One Piece': 'Eiichiro Oda', Naruto: 'Masashi Kishimoto', Bleach: 'Tite Kubo',
    'Dragon Ball': 'Akira Toriyama', 'Attack on Titan': 'Hajime Isayama', 'Death Note': 'Tsugumi Ohba',
    'Fullmetal Alchemist': 'Hiromu Arakawa', 'Demon Slayer': 'Koyoharu Gotouge',
    'My Hero Academia': 'Kohei Horikoshi', 'Jujutsu Kaisen': 'Gege Akutami',
    'Chainsaw Man': 'Tatsuki Fujimoto', 'Spy x Family': 'Tatsuya Endo',
    'Hunter x Hunter': 'Yoshihiro Togashi', Berserk: 'Kentaro Miura', Vagabond: 'Takehiko Inoue',
    Monster: 'Naoki Urasawa', '20th Century Boys': 'Naoki Urasawa', Pluto: 'Naoki Urasawa',
    Akira: 'Katsuhiro Otomo', 'Ghost in the Shell': 'Masamune Shirow', 'Sailor Moon': 'Naoko Takeuchi',
    'Fruits Basket': 'Natsuki Takaya', Nana: 'Ai Yazawa', 'Slam Dunk': 'Takehiko Inoue',
    'Haikyu!!': 'Haruichi Furudate', 'Kuroko\'s Basketball': 'Tadatoshi Fujimaki',
    'The Prince of Tennis': 'Takeshi Konomi', 'Initial D': 'Shuichi Shigeno',
    'JoJo\'s Bizarre Adventure': 'Hirohiko Araki', 'Tokyo Ghoul': 'Sui Ishida', Parasyte: 'Hitoshi Iwaaki',
    'Vinland Saga': 'Makoto Yukimura', 'Goodnight Punpun': 'Inio Asano', Solanin: 'Inio Asano',
    'March Comes in Like a Lion': 'Chica Umino', 'Your Lie in April': 'Naoshi Arakawa',
    'A Silent Voice': 'Yoshitoki Oima', Orange: 'Ichigo Takano', Erased: 'Kei Sanbe',
    'Delicious in Dungeon': 'Ryoko Kui', Frieren: 'Kanehito Yamada', 'One-Punch Man': 'ONE',
    'Mob Psycho 100': 'ONE', 'The Promised Neverland': 'Kaiu Shirai', 'Dr. Stone': 'Riichiro Inagaki',
    'Black Clover': 'Yūki Tabata', 'Fairy Tail': 'Hiro Mashima', 'The Seven Deadly Sins': 'Nakaba Suzuki',
    'Rurouni Kenshin': 'Nobuhiro Watsuki', 'Yu Yu Hakusho': 'Yoshihiro Togashi',
    'Fist of the North Star': 'Buronson', 'Saint Seiya': 'Masami Kurumada',
    'Captain Tsubasa': 'Yoichi Takahashi', Touch: 'Mitsuru Adachi', 'Maison Ikkoku': 'Rumiko Takahashi',
    'Urusei Yatsura': 'Rumiko Takahashi', 'Ranma 1/2': 'Rumiko Takahashi', Inuyasha: 'Rumiko Takahashi',
    Doraemon: 'Fujiko F. Fujio', 'Crayon Shin-chan': 'Yoshito Usui', 'Detective Conan': 'Gosho Aoyama',
    'Lone Wolf and Cub': 'Kazuo Koike', 'Astro Boy': 'Osamu Tezuka', 'Black Jack': 'Osamu Tezuka',
    Phoenix: 'Osamu Tezuka', Dororo: 'Osamu Tezuka', 'Barefoot Gen': 'Keiji Nakazawa',
    'The Rose of Versailles': 'Riyoko Ikeda', 'Banana Fish': 'Akimi Yoshida',
    'Cardcaptor Sakura': 'CLAMP', 'Magic Knight Rayearth': 'CLAMP', X: 'CLAMP',
    'Tokyo Babylon': 'CLAMP', 'xxxHolic': 'CLAMP', 'Tsubasa: Reservoir Chronicle': 'CLAMP',
    Chobits: 'CLAMP', 'Angel Sanctuary': 'Kaori Yuki', 'Please Save My Earth': 'Saki Hiwatari',
    'Nausicaä of the Valley of the Wind': 'Hayao Miyazaki', 'Domu: A Child\'s Dream': 'Katsuhiro Otomo',
    'In This Corner of the World': 'Fumiyo Kouno', 'A Bride\'s Story': 'Kaoru Mori', Emma: 'Kaoru Mori',
    'What Did You Eat Yesterday?': 'Fumi Yoshinaga', 'My Brother\'s Husband': 'Gengoroh Tagame',
    'My Lesbian Experience with Loneliness': 'Nagata Kabi', 'Blank Canvas': 'Akiko Higashimura',
    'Dead Dead Demon\'s Dededede Destruction': 'Inio Asano', 'Witch Hat Atelier': 'Kamome Shirahama',
    Bakuman: 'Tsugumi Ohba', 'New Treasure Island': 'Osamu Tezuka', 'A Drifting Life': 'Yoshihiro Tatsumi',
    'The Poe Clan': 'Moto Hagio', 'To Terra': 'Keiko Takemiya', 'They Were Eleven': 'Moto Hagio',
    Adolf: 'Osamu Tezuka', Buddha: 'Osamu Tezuka', 'With the Light': 'Keiko Tobe',
    'Paradise Kiss': 'Ai Yazawa', 'Kare Kano': 'Masami Tsuda', 'Honey and Clover': 'Chica Umino',
    'Nodame Cantabile': 'Tomoko Ninomiya', 'Chi\'s Sweet Home': 'Konami Kanata',
    'Space Brothers': 'Chūya Koyama', 'Silver Spoon': 'Hiromu Arakawa', 'My Love Story!!': 'Kazune Kawahara',
    'To Your Eternity': 'Yoshitoki Oima', 'The Ancient Magus\' Bride': 'Kore Yamazaki',
    Beastars: 'Paru Itagaki', 'Blue Period': 'Tsubasa Yamaguchi', 'Oshi no Ko': 'Aka Akasaka',
    'Blue Exorcist': 'Kazue Kato', Gantz: 'Hiroya Oku', 'Battle Angel Alita': 'Yukito Kishiro',
};
rows.forEach(row => {
    if (row[4] === 'MANGA' && MANGA_AUTHOR[row[0]]) row[1] = MANGA_AUTHOR[row[0]];
});

add('JP', 'NOVEL', 'Haruki Murakami', [
    [1987, 'Norwegian Wood', 94], [1994, 'The Wind-Up Bird Chronicle', 90],
    [2002, 'Kafka on the Shore', 92], [2009, '1Q84', 88], [2013, 'Colorless Tsukuru Tazaki and His Years of Pilgrimage', 78],
    [2017, 'Killing Commendatore', 74], [1982, 'A Wild Sheep Chase', 76], [1985, 'Hard-Boiled Wonderland and the End of the World', 80],
    [1999, 'Sputnik Sweetheart', 72], [2004, 'After Dark', 74], [1979, 'Hear the Wind Sing', 66],
    [2014, 'Men Without Women', 70],
]);
add('JP', 'NOVEL', 'Yukio Mishima', [
    [1949, 'Confessions of a Mask', 86], [1956, 'The Temple of the Golden Pavilion', 84],
    [1965, 'The Sea of Fertility', 78], [1963, 'The Sailor Who Fell from Grace with the Sea', 80],
]);
add('JP', 'NOVEL', 'Kenzaburō Ōe', [
    [1964, 'A Personal Matter', 82], [1967, 'The Silent Cry', 76],
]);
add('JP', 'NOVEL', 'Yoko Ogawa', [
    [2003, 'The Housekeeper and the Professor', 80], [1994, 'The Memory Police', 78],
]);
add('JP', 'NOVEL', 'Sayaka Murata', [
    [2016, 'Convenience Store Woman', 84], [2019, 'Earthlings', 72],
]);
add('JP', 'NOVEL', 'Hiromi Kawakami', [
    [2001, 'Strange Weather in Tokyo', 74], [2016, 'People from My Neighborhood', 66],
]);
add('JP', 'NOVEL', 'Banana Yoshimoto', [
    [1988, 'Kitchen', 82], [1993, 'Lizard', 64],
]);
add('JP', 'NOVEL', 'Keigo Higashino', [
    [2005, 'The Devotion of Suspect X', 84], [2011, 'Salvation of a Saint', 70],
    [2008, 'Newcomer', 66], [2012, 'Malice', 68],
]);
add('JP', 'NOVEL', 'Makoto Shinkai', [
    [2016, 'Your Name', 90], [2019, 'Weathering with You', 76],
]);
add('KR', 'NOVEL', 'Han Kang', [
    [2007, 'The Vegetarian', 92], [2014, 'Human Acts', 86], [2016, 'The White Book', 74],
    [2011, 'Greek Lessons', 72], [2021, 'We Do Not Part', 78],
]);
add('KR', 'NOVEL', 'Shin Kyung-sook', [[2008, 'Please Look After Mom', 84]]);
add('KR', 'NOVEL', 'Cho Nam-joo', [[2016, 'Kim Jiyoung, Born 1982', 86]]);
add('KR', 'NOVEL', 'Kim Young-ha', [
    [1996, 'I Have the Right to Destroy Myself', 70], [2010, 'Black Flower', 64],
]);
add('KR', 'NOVEL', 'Hwang Sok-yong', [
    [2002, 'The Guest', 72], [2017, 'Familiar Things', 64],
]);
add('KR', 'NOVEL', 'Bae Suah', [[2010, 'Nowhere to Be Found', 62]]);
add('KR', 'NOVEL', 'Pyun Hye-young', [[2010, 'The Hole', 66]]);
add('CN', 'NOVEL', 'Mo Yan', [
    [1986, 'Red Sorghum', 90], [2006, 'Life and Death Are Wearing Me Out', 78],
    [2009, 'Frog', 74], [1996, 'Big Breasts and Wide Hips', 70],
]);
add('CN', 'NOVEL', 'Yu Hua', [
    [1993, 'To Live', 88], [1995, 'Chronicle of a Blood Merchant', 74],
]);
add('CN', 'FANTASY', 'Liu Cixin', [
    [2008, 'The Three-Body Problem', 94], [2008, 'The Dark Forest', 88], [2010, 'Death\'s End', 86],
    [2004, 'Ball Lightning', 70],
]);
add('CN', 'NOVEL', 'Yan Lianke', [
    [2005, 'Dream of Ding Village', 74], [2011, 'The Four Books', 70], [2004, 'Serve the People!', 68],
]);
add('CN', 'HISTORY', 'Jung Chang', [
    [1991, 'Wild Swans', 92], [2005, 'Mao: The Unknown Story', 78],
]);
add('CN', 'NOVEL', 'Gao Xingjian', [[1990, 'Soul Mountain', 80]]);
add('CN', 'NOVEL', 'Ma Jian', [
    [2008, 'Beijing Coma', 74], [2013, 'The Dark Road', 66],
]);
add('HK', 'EPIC', 'Jin Yong', [
    [1957, 'Legend of the Condor Heroes', 94], [1959, 'The Return of the Condor Heroes', 90],
    [1961, 'Heaven Sword and Dragon Sabre', 86], [1967, 'The Smiling, Proud Wanderer', 82],
    [1969, 'The Deer and the Cauldron', 78], [1955, 'The Book and the Sword', 74],
    [1963, 'Demi-Gods and Semi-Devils', 80], [1959, 'Sword Stained with Royal Blood', 68],
]);
add('HK', 'NOVEL', 'Eileen Chang', [
    [1943, 'Love in a Fallen City', 86], [1979, 'Lust, Caution', 82],
    [1948, 'Half a Lifelong Romance', 74],
]);
add('TW', 'NOVEL', 'Wu Ming-Yi', [[2015, 'The Stolen Bicycle', 74]]);
add('TW', 'NOVEL', 'Pai Hsien-yung', [[1983, 'Crystal Boys', 72]]);
add('TW', 'NOVEL', 'Qiu Miaojin', [[1994, 'Notes of a Crocodile', 70]]);
add('TW', 'NOVEL', 'Sanmao', [[1976, 'Stories of the Sahara', 78]]);

const manhwa = [
    [2018, 'Solo Leveling', 'Chugong'], [2010, 'Tower of God', 'SIU'],
    [2011, 'The God of High School', 'Yongje Park'], [2007, 'Noblesse', 'Son Jae-ho'],
    [2014, 'Lookism', 'Park Tae-jun'], [2018, 'True Beauty', 'Yaongyi'],
    [2017, 'Sweet Home', 'Carnby Kim'], [2014, 'Bastard', 'Carnby Kim'],
    [2017, 'The Boxer', 'JH'], [2013, 'Wind Breaker', 'Yongseok Jo'],
    [2018, 'Weak Hero', 'Seopass'], [2014, 'Study Group', 'Hyungwook Shin'],
    [2017, 'Viral Hit', 'Park Tae-jun'], [2020, 'Omniscient Reader', 'Sing Shong'],
    [2018, 'Eleceed', 'Son Jeho'], [2007, 'The Breaker', 'Jeon Geuk-jin'],
    [2010, 'Cheese in the Trap', 'Soonkki'], [2010, 'Annarasumanara', 'Ilkwon Ha'],
    [2014, 'Yumi\'s Cells', 'Lee Dong-gun'], [2016, 'Itaewon Class', 'Kwang Jin'],
    [2015, 'Moving', 'Kang Full'], [2019, 'Hellbound', 'Yeon Sang-ho'],
    [2020, 'The Remarried Empress', 'Alphatart'], [2017, 'Who Made Me a Princess', 'Plutus'],
    [2017, 'Under the Oak Tree', 'Kim Suji'], [2020, 'Your Throne', 'SAM'],
    [2019, 'Return of the Blossoming Blade', 'Biga'],
    [2021, 'The Greatest Estate Developer', 'Lee Hyunmin'],
    [2018, 'SSS-Class Suicide Hunter', 'Shin Noah'],
    [2018, 'The S-Classes That I Raised', 'Geunseo'],
    [2019, 'Solo Max-Level Newbie', 'Swing'], [2018, 'Nano Machine', 'Hanjoong Wolya'],
    [2018, 'Legend of the Northern Blade', 'Woo-Gak'],
    [2020, 'The World After the Fall', 'Sing Shong'],
    [2018, 'Return of the Disaster-Class Hero', 'San.G'],
    [2018, 'Teenage Mercenary', 'YC'], [2018, 'Manager Kim', 'Park Tae-jun'],
    [2020, 'Questism', 'Park Tae-jun'], [2017, 'How to Fight', 'Park Tae-jun'],
    [2011, 'Orange Marmalade', 'Seokwoo'], [2014, 'Spirit Fingers', 'Han Kyoung Chal'],
    [2015, 'Odd Girl Out', 'Morangg'], [2016, 'My ID is Gangnam Beauty', 'Gi Maeng-gi'],
    [2014, 'Distant Sky', 'Yoon In-Wan'], [2017, 'Pigpen', 'Carnby Kim'],
    [2018, 'Shotgun Boy', 'Carnby Kim'], [2016, 'The Horizon', 'JH'],
    [2016, 'Something About Us', 'Lee Yun-ji'], [2011, 'Girls of the Wild\'s', 'Hun'],
    [2013, 'The Gamer', 'Sung Sang-young'], [2013, 'Dice', 'Yun Hyunseok'],
    [2012, 'Hardcore Leveling Warrior', 'Sehoon Kim'], [2021, 'Jungle Juice', 'Hyeong Eun'],
    [2020, 'Hero Killer', 'Kkulbeol'], [2021, 'The Ember Knight', 'Hwanggyu Kim'],
    [2004, 'Gourmet Hound', 'Leehama'], [2016, 'Veritas', 'Yoon Joon-shik'],
];
manhwa.forEach(([year, title, author]) => rows.push([title, author, year, 'KR', 'MANHWA', 0]));
add('NZ', 'MANHWA', 'Rachel Smythe', [[2018, 'Lore Olympus', 84]]);
add('ES', 'MANHWA', 'Miriam Bonastre Tur', [[2015, 'Hooky', 68]]);
add('FR', 'MANHWA', 'Ephemerys', [[2017, 'Purple Hyacinth', 66]]);

add('IN', 'NOVEL', 'R.K. Narayan', [
    [1935, 'Swami and Friends', 86], [1937, 'The Bachelor of Arts', 74],
    [1945, 'The English Teacher', 76], [1952, 'The Financial Expert', 70],
    [1955, 'Waiting for the Mahatma', 72], [1958, 'The Guide', 90],
    [1961, 'The Man-Eater of Malgudi', 78], [1967, 'The Vendor of Sweets', 70],
    [1943, 'Malgudi Days', 88], [1983, 'A Tiger for Malgudi', 68],
]);
add('IN', 'NOVEL', 'Mulk Raj Anand', [
    [1935, 'Untouchable', 86], [1936, 'Coolie', 78],
]);
add('IN', 'NOVEL', 'Raja Rao', [[1938, 'Kanthapura', 80]]);
add('IN', 'NOVEL', 'Kamala Markandaya', [[1954, 'Nectar in a Sieve', 78]]);
add('IN', 'NOVEL', 'Khushwant Singh', [
    [1956, 'Train to Pakistan', 88], [1990, 'Delhi', 70],
]);
add('IN', 'NOVEL', 'Anita Desai', [
    [1980, 'Clear Light of Day', 80], [1984, 'In Custody', 74], [1999, 'Fasting, Feasting', 72],
]);
add('IN', 'NOVEL', 'Rohinton Mistry', [
    [1995, 'A Fine Balance', 92], [1991, 'Such a Long Journey', 74], [2002, 'Family Matters', 72],
]);
add('IN', 'NOVEL', 'Vikram Seth', [
    [1993, 'A Suitable Boy', 94], [1986, 'The Golden Gate', 74], [1999, 'An Equal Music', 72],
]);
add('IN', 'NOVEL', 'Amitav Ghosh', [
    [1988, 'The Shadow Lines', 84], [1986, 'The Circle of Reason', 70],
    [2000, 'The Glass Palace', 80], [2004, 'The Hungry Tide', 78],
    [2008, 'Sea of Poppies', 86], [2011, 'River of Smoke', 74], [2015, 'Flood of Fire', 72],
    [2019, 'Gun Island', 70],
]);
add('IN', 'NOVEL', 'Arundhati Roy', [
    [1997, 'The God of Small Things', 96], [2017, 'The Ministry of Utmost Happiness', 80],
]);
add('IN', 'NOVEL', 'Aravind Adiga', [
    [2008, 'The White Tiger', 90], [2011, 'Last Man in Tower', 70], [2016, 'Selection Day', 68],
]);
add('IN', 'NOVEL', 'Kiran Desai', [
    [2006, 'The Inheritance of Loss', 88], [1998, 'Hullabaloo in the Guava Orchard', 68],
]);
add('IN', 'NOVEL', 'Vikram Chandra', [[2006, 'Sacred Games', 84]]);
add('IN', 'NOVEL', 'Suketu Mehta', [[2004, 'Maximum City', 82]]);
add('IN', 'NOVEL', 'Jeet Thayil', [[2012, 'Narcopolis', 74]]);
add('IN', 'NOVEL', 'Perumal Murugan', [
    [2010, 'One Part Woman', 80], [2013, 'Pyre', 70],
]);
add('IN', 'NOVEL', 'Geetanjali Shree', [[2018, 'Tomb of Sand', 84]]);
add('IN', 'NOVEL', 'Jerry Pinto', [[2012, 'Em and the Big Hoom', 76]]);
add('IN', 'NOVEL', 'Manu Joseph', [[2010, 'Serious Men', 74]]);
add('IN', 'NOVEL', 'Anuja Chauhan', [
    [2008, 'The Zoya Factor', 72], [2013, 'Those Pricey Thakur Girls', 68],
]);
add('IN', 'ROMANCE', 'Chetan Bhagat', [
    [2004, 'Five Point Someone', 80], [2005, 'One Night @ the Call Center', 70],
    [2008, 'The 3 Mistakes of My Life', 68], [2009, '2 States', 78],
    [2014, 'Half Girlfriend', 66],
]);
add('IN', 'ROMANCE', 'Ravinder Singh', [
    [2008, 'I Too Had a Love Story', 72], [2011, 'Can Love Happen Twice?', 60],
]);
add('IN', 'CHILDREN', 'Ruskin Bond', [
    [1956, 'The Room on the Roof', 80], [1980, 'The Blue Umbrella', 78],
    [1988, 'The Night Train at Deoli', 72], [1973, 'The Room of Many Colours', 60],
]);
add('IN', 'CHILDREN', 'Sudha Murty', [
    [2004, 'How I Taught My Grandmother to Read', 74], [2011, 'The Magic of the Lost Temple', 64],
    [2017, 'The Serpent\'s Revenge', 66], [2012, 'Grandma\'s Bag of Stories', 68],
    [2006, 'Wise and Otherwise', 66], [2012, 'The Day I Stopped Drinking Milk', 62],
    [2017, 'Three Thousand Stitches', 70],
]);
add('IN', 'MYTHOLOGY', 'Amish Tripathi', [
    [2010, 'The Immortals of Meluha', 84], [2011, 'The Secret of the Nagas', 76],
    [2013, 'The Oath of the Vayuputras', 74], [2015, 'Scion of Ikshvaku', 72],
    [2017, 'Sita: Warrior of Mithila', 74], [2019, 'Raavan: Enemy of Aryavarta', 70],
]);
add('IN', 'MYTHOLOGY', 'Devdutt Pattanaik', [
    [2010, 'Jaya: An Illustrated Retelling of the Mahabharata', 82],
    [2013, 'Sita: An Illustrated Retelling of the Ramayana', 78],
    [2006, 'Myth = Mithya', 70], [2011, '7 Secrets of Shiva', 64],
]);
add('IN', 'MYTHOLOGY', 'Chitra Banerjee Divakaruni', [
    [2008, 'The Palace of Illusions', 84], [2019, 'The Forest of Enchantments', 78],
]);
add('IN', 'MYTHOLOGY', 'Kavita Kané', [
    [2013, 'Karna\'s Wife', 72], [2014, 'Sita\'s Sister', 68], [2015, 'Menaka\'s Choice', 66],
]);
add('IN', 'MYTHOLOGY', 'Anand Neelakantan', [
    [2012, 'Asura: Tale of the Vanquished', 76], [2013, 'Ajaya: Roll of the Dice', 70],
]);
add('IN', 'THRILLER', 'Ashwin Sanghi', [
    [2007, 'The Rozabal Line', 68], [2010, 'Chanakya\'s Chant', 74], [2012, 'The Krishna Key', 72],
]);
add('IN', 'THRILLER', 'Satyajit Ray', [
    [1965, 'The Emperor\'s Ring', 74], [1971, 'The Golden Fortress', 78],
    [1975, 'The Mystery of the Elephant God', 72], [1974, 'The Royal Bengal Mystery', 70],
]);
add('IN', 'HISTORY', 'Ramachandra Guha', [
    [2007, 'India After Gandhi', 88], [2013, 'Gandhi Before India', 74],
    [2018, 'Gandhi: The Years That Changed the World', 76],
]);
add('IN', 'HISTORY', 'Romila Thapar', [[2002, 'Early India', 78]]);
add('IN', 'HISTORY', 'Sunil Khilnani', [[1997, 'The Idea of India', 76]]);
add('IN', 'HISTORY', 'Amartya Sen', [
    [2005, 'The Argumentative Indian', 82], [2006, 'Identity and Violence', 74],
]);
add('IN', 'HISTORY', 'Urvashi Butalia', [[1998, 'The Other Side of Silence', 78]]);
add('IN', 'HISTORY', 'Shashi Tharoor', [
    [1989, 'The Great Indian Novel', 80], [2016, 'Inglorious Empire', 82],
]);
add('IN', 'TRUE_CRIME', 'S. Hussain Zaidi', [
    [2012, 'Dongri to Dubai', 74], [2011, 'Mafia Queens of Mumbai', 72],
    [2002, 'Black Friday', 76],
]);
add('IN', 'TRUE_CRIME', 'Avirook Sen', [[2015, 'Aarushi', 70]]);
add('IN', 'COMIC', 'Anant Pai', [
    [1967, 'Krishna', 80], [1971, 'Hanuman', 74], [1973, 'Ganesha', 70],
    [1970, 'Buddha', 72], [1972, 'Birbal the Wise', 74], [1969, 'Shakuntala', 68],
    [1974, 'Savitri', 64], [1976, 'Tales of Durga', 70], [1978, 'Karna', 72],
    [1980, 'Chanakya', 68], [1975, 'Ashoka', 74], [1977, 'Shivaji', 76],
    [1979, 'Rana Pratap', 70], [1981, 'Guru Nanak', 72], [1982, 'Mirabai', 64],
    [1983, 'Vivekananda', 66], [1968, 'Rama', 78], [1972, 'Abhimanyu', 62],
]);
add('IN', 'COMIC', 'Sarnath Banerjee', [
    [2004, 'Corridor', 66], [2011, 'The Harappa Files', 64],
]);
add('IN', 'COMIC', 'Amruta Patil', [[2008, 'Kari', 68]]);
add('IN', 'FANTASY', 'Samit Basu', [[2004, 'The Simoqin Prophecies', 66]]);
add('IN', 'FANTASY', 'Indra Das', [[2015, 'The Devourers', 70]]);
add('PK', 'NOVEL', 'Mohsin Hamid', [
    [2000, 'Moth Smoke', 74], [2007, 'The Reluctant Fundamentalist', 90],
    [2013, 'How to Get Filthy Rich in Rising Asia', 74], [2017, 'Exit West', 86],
]);
add('PK', 'NOVEL', 'Kamila Shamsie', [
    [2017, 'Home Fire', 84], [2009, 'Burnt Shadows', 74], [2002, 'Kartography', 66],
]);
add('PK', 'NOVEL', 'Mohammed Hanif', [
    [2008, 'A Case of Exploding Mangoes', 82], [2011, 'Our Lady of Alice Bhatti', 68],
]);
add('PK', 'NOVEL', 'Bapsi Sidhwa', [
    [1988, 'Cracking India', 82], [1978, 'The Crow Eaters', 64],
]);
add('PK', 'NOVEL', 'Nadeem Aslam', [[2004, 'Maps for Lost Lovers', 72]]);
add('PK', 'NOVEL', 'Saadat Hasan Manto', [[1955, 'Toba Tek Singh', 84]]);
add('BD', 'NOVEL', 'Tahmima Anam', [
    [2007, 'A Golden Age', 78], [2011, 'The Good Muslim', 68], [2016, 'The Bones of Grace', 62],
]);
add('BD', 'NOVEL', 'Humayun Ahmed', [
    [1972, 'Nondito Noroke', 74], [1973, 'Shonkhonil Karagar', 66],
]);
add('LK', 'NOVEL', 'Shehan Karunatilaka', [
    [2010, 'Chinaman', 78], [2022, 'The Seven Moons of Maali Almeida', 86],
]);
add('LK', 'NOVEL', 'Romesh Gunesekera', [[1994, 'Reef', 70]]);
add('LK', 'NOVEL', 'Shyam Selvadurai', [[1994, 'Funny Boy', 76]]);
add('NP', 'NOVEL', 'Samrat Upadhyay', [
    [2001, 'Arresting God in Kathmandu', 66], [2003, 'The Guru of Love', 62],
]);
add('NP', 'NOVEL', 'Manjushree Thapa', [[2001, 'The Tutor of History', 64]]);
add('NP', 'NOVEL', 'Narayan Wagle', [[2005, 'Palpasa Café', 66]]);

add('BR', 'NOVEL', 'Jorge Amado', [
    [1958, 'Gabriela, Clove and Cinnamon', 88], [1966, 'Dona Flor and Her Two Husbands', 86],
    [1937, 'Captains of the Sands', 84], [1969, 'Tent of Miracles', 70],
    [1977, 'Tieta', 68], [1943, 'The Violent Land', 78], [1936, 'Sea of Death', 66],
]);
add('BR', 'NOVEL', 'Clarice Lispector', [
    [1943, 'Near to the Wild Heart', 84], [1964, 'The Passion According to G.H.', 86],
    [1973, 'Água Viva', 78], [1977, 'The Hour of the Star', 90], [1960, 'Family Ties', 74],
]);
add('BR', 'NOVEL', 'Paulo Coelho', [
    [1988, 'The Alchemist', 96], [1987, 'The Pilgrimage', 74], [1990, 'Brida', 70],
    [1998, 'Veronika Decides to Die', 76], [2005, 'The Zahir', 68], [2003, 'Eleven Minutes', 70],
    [1994, 'By the River Piedra I Sat Down and Wept', 66], [2018, 'Hippie', 60],
]);
add('BR', 'NOVEL', 'João Guimarães Rosa', [[1956, 'The Devil to Pay in the Backlands', 90]]);
add('BR', 'NOVEL', 'Graciliano Ramos', [[1938, 'Barren Lives', 84]]);
add('BR', 'NOVEL', 'Rachel de Queiroz', [[1939, 'The Three Marias', 70]]);
add('BR', 'NOVEL', 'Érico Veríssimo', [[1949, 'Time and the Wind', 74]]);
add('BR', 'NOVEL', 'Raduan Nassar', [
    [1975, 'Ancient Tillage', 72], [1978, 'A Cup of Rage', 68],
]);
add('BR', 'NOVEL', 'Milton Hatoum', [[1989, 'Tale of a Certain Orient', 70]]);
add('BR', 'NOVEL', 'Chico Buarque', [
    [2003, 'Budapest', 70], [2009, 'Spilt Milk', 68],
]);
add('BR', 'NOVEL', 'Conceição Evaristo', [[2003, 'Ponciá Vicêncio', 74]]);
add('BR', 'NOVEL', 'Itamar Vieira Junior', [[2019, 'Crooked Plow', 78]]);
add('BR', 'NOVEL', 'Paulo Lins', [[1997, 'City of God', 84]]);
add('BR', 'THRILLER', 'Rubem Fonseca', [
    [1983, 'High Art', 68], [1985, 'Bufo & Spallanzani', 64],
]);
add('BR', 'NOVEL', 'Lygia Fagundes Telles', [[1973, 'The Girl in the Photograph', 70]]);
add('BR', 'NOVEL', 'João Ubaldo Ribeiro', [[1984, 'An Invincible Memory', 66]]);
add('BR', 'FANTASY', 'Moacyr Scliar', [[1980, 'The Centaur in the Garden', 66]]);
add('BR', 'CHILDREN', 'Ziraldo', [[1980, 'The Nutty Boy', 72]]);
add('BR', 'CHILDREN', 'Monteiro Lobato', [
    [1931, 'Reinações de Narizinho', 74], [1939, 'O Picapau Amarelo', 76],
]);
add('BR', 'COMIC', 'Mauricio de Sousa', [
    [1963, 'Monica\'s Gang', 86], [1960, 'Cebolinha', 70], [1961, 'Cascão', 66],
    [1964, 'Magali', 64], [1961, 'Chico Bento', 72],
]);
add('BR', 'TRUE_CRIME', 'Drauzio Varella', [[1999, 'Estação Carandiru', 72]]);
add('AR', 'NOVEL', 'Jorge Luis Borges', [
    [1944, 'Ficciones', 96], [1949, 'The Aleph', 92], [1975, 'The Book of Sand', 78],
    [1935, 'A Universal History of Iniquity', 70],
]);
add('AR', 'NOVEL', 'Julio Cortázar', [
    [1963, 'Hopscotch', 92], [1959, 'Blow-Up and Other Stories', 78],
    [1962, 'Cronopios and Famas', 72],
]);
add('AR', 'NOVEL', 'Ernesto Sabato', [
    [1948, 'The Tunnel', 82], [1961, 'On Heroes and Tombs', 76],
]);
add('AR', 'FANTASY', 'Adolfo Bioy Casares', [[1940, 'The Invention of Morel', 86]]);
add('AR', 'NOVEL', 'Manuel Puig', [
    [1976, 'Kiss of the Spider Woman', 86], [1968, 'Betrayed by Rita Hayworth', 66],
]);
add('AR', 'NOVEL', 'César Aira', [
    [2000, 'An Episode in the Life of a Landscape Painter', 70],
    [1990, 'How I Became a Nun', 64],
]);
add('AR', 'THRILLER', 'Samanta Schweblin', [
    [2014, 'Fever Dream', 84], [2018, 'Little Eyes', 70],
]);
add('AR', 'THRILLER', 'Mariana Enríquez', [
    [2016, 'Things We Lost in the Fire', 78], [2019, 'Our Share of Night', 80],
]);
add('AR', 'THRILLER', 'Claudia Piñeiro', [
    [2005, 'Thursday Night Widows', 74], [2021, 'Elena Knows', 78],
]);
add('AR', 'NOVEL', 'Ricardo Piglia', [[1980, 'Artificial Respiration', 70]]);
add('AR', 'NOVEL', 'Tomás Eloy Martínez', [[1995, 'Santa Evita', 76]]);
add('AR', 'TRUE_CRIME', 'Rodolfo Walsh', [[1957, 'Operation Massacre', 78]]);
add('AR', 'COMIC', 'Quino', [[1964, 'Mafalda', 90]]);
add('AR', 'COMIC', 'Roberto Fontanarrosa', [[1972, 'Inodoro Pereyra', 66]]);
add('CO', 'NOVEL', 'Gabriel García Márquez', [
    [1967, 'One Hundred Years of Solitude', 99], [1985, 'Love in the Time of Cholera', 96],
    [1981, 'Chronicle of a Death Foretold', 88], [1975, 'The Autumn of the Patriarch', 76],
    [1961, 'No One Writes to the Colonel', 78], [1955, 'Leaf Storm', 68],
    [1994, 'Of Love and Other Demons', 74], [1989, 'The General in His Labyrinth', 72],
    [1996, 'News of a Kidnapping', 70],
]);
add('CO', 'NOVEL', 'Laura Restrepo', [[2004, 'Delirium', 72]]);
add('CO', 'NOVEL', 'Juan Gabriel Vásquez', [
    [2011, 'The Sound of Things Falling', 80], [2015, 'Reputations', 66],
]);
add('CO', 'NOVEL', 'Fernando Vallejo', [[1994, 'Our Lady of the Assassins', 74]]);
add('CO', 'NOVEL', 'Héctor Abad', [[2006, 'Oblivion', 72]]);
add('CO', 'NOVEL', 'Álvaro Mutis', [[1993, 'The Adventures and Misadventures of Maqroll', 70]]);
add('CO', 'THRILLER', 'Jorge Franco', [[1999, 'Rosario Tijeras', 70]]);
add('CL', 'NOVEL', 'Roberto Bolaño', [
    [1998, 'The Savage Detectives', 92], [2004, '2666', 94],
    [2000, 'By Night in Chile', 74], [1996, 'Distant Star', 72],
    [1999, 'Amulet', 66], [1996, 'Nazi Literature in the Americas', 70],
]);
add('CL', 'NOVEL', 'Isabel Allende', [
    [1982, 'The House of the Spirits', 94], [1984, 'Of Love and Shadows', 70],
    [1987, 'Eva Luna', 78], [1999, 'Daughter of Fortune', 72],
    [2005, 'Zorro', 68], [2006, 'Inés of My Soul', 66],
    [2019, 'A Long Petal of the Sea', 74], [2022, 'Violeta', 70],
]);
add('CL', 'NOVEL', 'José Donoso', [[1970, 'The Obscene Bird of Night', 80]]);
add('CL', 'CHILDREN', 'Luis Sepúlveda', [
    [1989, 'The Old Man Who Read Love Stories', 78],
    [1996, 'The Story of a Seagull and the Cat Who Taught Her to Fly', 74],
]);
add('CL', 'NOVEL', 'Antonio Skármeta', [[1985, 'Burning Patience', 76]]);
add('CL', 'NOVEL', 'Alejandro Zambra', [
    [2011, 'Ways of Going Home', 70], [2006, 'Bonsai', 66],
]);
add('CL', 'NOVEL', 'Benjamín Labatut', [
    [2020, 'When We Cease to Understand the World', 80], [2023, 'The MANIAC', 74],
]);
add('CL', 'COMIC', 'René Ríos', [[1949, 'Condorito', 82]]);
add('PE', 'NOVEL', 'Mario Vargas Llosa', [
    [1963, 'The Time of the Hero', 82], [1969, 'Conversation in the Cathedral', 84],
    [1977, 'Aunt Julia and the Scriptwriter', 80], [1981, 'The War of the End of the World', 82],
    [2000, 'The Feast of the Goat', 86], [2006, 'The Bad Girl', 70],
    [2010, 'The Dream of the Celt', 66],
]);
add('PE', 'NOVEL', 'José María Arguedas', [[1958, 'Deep Rivers', 78]]);
add('PE', 'NOVEL', 'Alfredo Bryce Echenique', [[1970, 'A World for Julius', 74]]);
add('PE', 'THRILLER', 'Santiago Roncagliolo', [[2006, 'Red April', 72]]);
add('CU', 'NOVEL', 'Alejo Carpentier', [
    [1949, 'The Kingdom of This World', 84], [1953, 'The Lost Steps', 76],
    [1962, 'Explosion in a Cathedral', 74],
]);
add('CU', 'NOVEL', 'Guillermo Cabrera Infante', [[1967, 'Three Trapped Tigers', 78]]);
add('CU', 'NOVEL', 'Reinaldo Arenas', [
    [1992, 'Before Night Falls', 82], [1967, 'Singing from the Well', 64],
]);
add('CU', 'THRILLER', 'Leonardo Padura', [
    [1991, 'Havana Blue', 74], [1994, 'Havana Gold', 68],
    [2009, 'The Man Who Loved Dogs', 76],
]);
add('UY', 'NOVEL', 'Juan Carlos Onetti', [
    [1950, 'A Brief Life', 78], [1961, 'The Shipyard', 74],
]);
add('UY', 'NOVEL', 'Mario Benedetti', [[1960, 'The Truce', 76]]);
add('UY', 'HISTORY', 'Eduardo Galeano', [
    [1971, 'Open Veins of Latin America', 90], [1982, 'Genesis', 74],
    [1984, 'Faces and Masks', 68], [1986, 'Century of the Wind', 68],
    [1995, 'Soccer in Sun and Shadow', 72],
]);
add('DO', 'NOVEL', 'Julia Alvarez', [
    [1994, 'In the Time of the Butterflies', 86], [1991, 'How the García Girls Lost Their Accents', 78],
]);
add('DO', 'FANTASY', 'Rita Indiana', [[2015, 'Tentacle', 70]]);
add('JM', 'NOVEL', 'Marlon James', [
    [2014, 'A Brief History of Seven Killings', 88], [2009, 'The Book of Night Women', 74],
    [2019, 'Black Leopard, Red Wolf', 80],
]);
add('JM', 'NOVEL', 'Roger Mais', [[1954, 'Brother Man', 66]]);
add('BB', 'NOVEL', 'George Lamming', [[1953, 'In the Castle of My Skin', 74]]);
add('TT', 'NOVEL', 'V.S. Naipaul', [
    [1961, 'A House for Mr Biswas', 92], [1979, 'A Bend in the River', 84],
    [1959, 'Miguel Street', 76], [1971, 'In a Free State', 70],
    [1987, 'The Enigma of Arrival', 74],
]);
add('TT', 'NOVEL', 'Earl Lovelace', [[1979, 'The Dragon Can\'t Dance', 76]]);
add('TT', 'NOVEL', 'Sam Selvon', [[1956, 'The Lonely Londoners', 82]]);
add('GY', 'NOVEL', 'Wilson Harris', [[1960, 'Palace of the Peacock', 72]]);
add('LC', 'EPIC', 'Derek Walcott', [[1990, 'Omeros', 88]]);
add('VE', 'NOVEL', 'Karina Sainz Borgo', [[2019, 'It Would Be Night in Caracas', 70]]);
add('VE', 'EPIC', 'Arturo Uslar Pietri', [[1931, 'The Red Lances', 68]]);

export const BOOKS_WORLD = rows;
