/** Africa, the Middle East, Southeast Asia, Oceania, and the remaining quota. */
const rows = [];
const add = (country, genre, author, entries) => {
    entries.forEach(([year, title, fame]) => rows.push([title, author, year, country, genre, fame || 0]));
};

add('NG', 'NOVEL', 'Chinua Achebe', [
    [1958, 'Things Fall Apart', 98], [1960, 'No Longer at Ease', 80],
    [1964, 'Arrow of God', 84], [1966, 'A Man of the People', 74],
    [1987, 'Anthills of the Savannah', 76],
]);
add('NG', 'NOVEL', 'Wole Soyinka', [
    [1965, 'The Interpreters', 78], [1973, 'Season of Anomy', 66],
]);
add('NG', 'NOVEL', 'Buchi Emecheta', [
    [1979, 'The Joys of Motherhood', 82], [1974, 'Second-Class Citizen', 74],
]);
add('NG', 'FANTASY', 'Amos Tutuola', [[1952, 'The Palm-Wine Drinkard', 80]]);
add('NG', 'FANTASY', 'Ben Okri', [
    [1991, 'The Famished Road', 90], [1993, 'Songs of Enchantment', 68],
]);
add('NG', 'NOVEL', 'Chimamanda Ngozi Adichie', [
    [2003, 'Purple Hibiscus', 84], [2006, 'Half of a Yellow Sun', 92],
    [2013, 'Americanah', 90], [2009, 'The Thing Around Your Neck', 70],
]);
add('NG', 'HISTORY', 'Chimamanda Ngozi Adichie', [[2014, 'We Should All Be Feminists', 86]]);
add('NG', 'NOVEL', 'Helon Habila', [
    [2002, 'Waiting for an Angel', 70], [2007, 'Measuring Time', 64],
    [2010, 'Oil on Water', 68],
]);
add('NG', 'NOVEL', 'Sefi Atta', [[2005, 'Everything Good Will Come', 68]]);
add('NG', 'NOVEL', 'Chigozie Obioma', [
    [2015, 'The Fishermen', 80], [2019, 'An Orchestra of Minorities', 72],
]);
add('NG', 'FANTASY', 'Akwaeke Emezi', [
    [2018, 'Freshwater', 76], [2019, 'Pet', 64],
]);
add('NG', 'NOVEL', 'Ayọ̀bámi Adébáyọ̀', [[2017, 'Stay with Me', 78]]);
add('NG', 'NOVEL', 'Lola Shoneyin', [[2010, 'The Secret Lives of Baba Segi\'s Wives', 74]]);
add('NG', 'NOVEL', 'Elnathan John', [[2015, 'Born on a Tuesday', 66]]);
add('NG', 'NOVEL', 'Teju Cole', [[2011, 'Open City', 78]]);
add('NG', 'NOVEL', 'Chris Abani', [
    [2004, 'Graceland', 72], [2007, 'The Virgin of Flames', 60],
]);
add('NG', 'NOVEL', 'Chika Unigwe', [[2009, 'On Black Sisters Street', 66]]);
add('NG', 'FANTASY', 'Nnedi Okorafor', [
    [2010, 'Who Fears Death', 82], [2014, 'Lagoon', 74],
    [2015, 'Binti', 76], [2011, 'Akata Witch', 72],
    [2021, 'Remote Control', 64], [2015, 'The Book of Phoenix', 66],
]);
add('NG', 'FANTASY', 'Tomi Adeyemi', [
    [2018, 'Children of Blood and Bone', 84], [2019, 'Children of Virtue and Vengeance', 70],
]);
add('NG', 'NOVEL', 'Cyprian Ekwensi', [[1954, 'People of the City', 64]]);
add('NG', 'NOVEL', 'Flora Nwapa', [[1966, 'Efuru', 70]]);
add('NG', 'NOVEL', 'Elechi Amadi', [[1966, 'The Concubine', 68]]);
add('GH', 'NOVEL', 'Ayi Kwei Armah', [
    [1968, 'The Beautyful Ones Are Not Yet Born', 84], [1973, 'Two Thousand Seasons', 66],
]);
add('GH', 'NOVEL', 'Ama Ata Aidoo', [
    [1970, 'No Sweetness Here', 64], [1977, 'Our Sister Killjoy', 68],
]);
add('GH', 'NOVEL', 'Yaa Gyasi', [[2016, 'Homegoing', 88]]);
add('GH', 'NOVEL', 'Amma Darko', [[1995, 'Beyond the Horizon', 60]]);
add('KE', 'NOVEL', 'Ngũgĩ wa Thiong\'o', [
    [1964, 'Weep Not, Child', 78], [1965, 'The River Between', 74],
    [1967, 'A Grain of Wheat', 86], [1977, 'Petals of Blood', 80],
    [1980, 'Devil on the Cross', 72], [2006, 'Wizard of the Crow', 78],
    [1986, 'Matigari', 64], [2020, 'The Perfect Nine', 70],
]);
add('KE', 'NOVEL', 'Yvonne Adhiambo Owuor', [[2014, 'Dust', 72]]);
add('KE', 'NOVEL', 'Binyavanga Wainaina', [[2011, 'One Day I Will Write About This Place', 70]]);
add('KE', 'NOVEL', 'Peter Kimani', [[2017, 'Dance of the Jakaranda', 64]]);
add('KE', 'NOVEL', 'Grace Ogot', [[1966, 'The Promised Land', 62]]);
add('TZ', 'NOVEL', 'Abdulrazak Gurnah', [
    [1994, 'Paradise', 84], [2001, 'By the Sea', 74], [2020, 'Afterlives', 82],
    [2005, 'Desertion', 66], [2011, 'The Last Gift', 62], [1987, 'Memory of Departure', 60],
]);
add('ZA', 'NOVEL', 'J.M. Coetzee', [
    [1977, 'In the Heart of the Country', 70], [1980, 'Waiting for the Barbarians', 90],
    [1983, 'Life & Times of Michael K', 86], [1986, 'Foe', 74],
    [1990, 'Age of Iron', 72], [1999, 'Disgrace', 94],
    [2003, 'Elizabeth Costello', 68], [2005, 'Slow Man', 60],
    [2007, 'Diary of a Bad Year', 62], [2009, 'Summertime', 66],
]);
add('ZA', 'NOVEL', 'Nadine Gordimer', [
    [1974, 'The Conservationist', 80], [1979, 'Burger\'s Daughter', 76],
    [1981, 'July\'s People', 78], [1994, 'None to Accompany Me', 60],
    [1998, 'The House Gun', 62],
]);
add('ZA', 'NOVEL', 'André Brink', [
    [1979, 'A Dry White Season', 76], [1974, 'Looking on Darkness', 60],
]);
add('ZA', 'NOVEL', 'Zakes Mda', [
    [1995, 'Ways of Dying', 72], [2000, 'The Heart of Redness', 74],
]);
add('ZA', 'NOVEL', 'Damon Galgut', [
    [2003, 'The Good Doctor', 70], [2021, 'The Promise', 82],
]);
add('ZA', 'NOVEL', 'K. Sello Duiker', [[2000, 'Thirteen Cents', 66]]);
add('ZA', 'NOVEL', 'Kopano Matlwa', [[2007, 'Coconut', 64]]);
add('ZA', 'THRILLER', 'Lauren Beukes', [
    [2008, 'Moxyland', 64], [2010, 'Zoo City', 72], [2013, 'The Shining Girls', 74],
]);
add('ZA', 'THRILLER', 'Deon Meyer', [
    [1999, 'Dead Before Dying', 66], [2003, 'Heart of the Hunter', 64],
    [2007, 'Devil\'s Peak', 68], [2010, 'Trackers', 64], [2014, 'Cobra', 62],
    [2016, 'Fever', 66],
]);
add('ZA', 'NOVEL', 'Phaswane Mpe', [[2001, 'Welcome to Our Hillbrow', 68]]);
add('ZA', 'NOVEL', 'Niq Mhlongo', [[2004, 'Dog Eat Dog', 60]]);
add('ZA', 'COMIC', 'Loyiso Mkize', [[2014, 'Kwezi', 64]]);
add('ZA', 'COMIC', 'Strika Entertainment', [[2005, 'Supa Strikas', 66]]);
add('ZW', 'NOVEL', 'Tsitsi Dangarembga', [
    [1988, 'Nervous Conditions', 86], [2006, 'The Book of Not', 64],
    [2018, 'This Mournable Body', 70],
]);
add('ZW', 'NOVEL', 'Dambudzo Marechera', [[1978, 'The House of Hunger', 74]]);
add('ZW', 'NOVEL', 'NoViolet Bulawayo', [
    [2013, 'We Need New Names', 78], [2022, 'Glory', 72],
]);
add('ZW', 'NOVEL', 'Petina Gappah', [
    [2009, 'An Elegy for Easterly', 66], [2015, 'The Book of Memory', 68],
]);
add('ZM', 'NOVEL', 'Namwali Serpell', [[2019, 'The Old Drift', 76]]);
add('BW', 'NOVEL', 'Bessie Head', [
    [1968, 'When Rain Clouds Gather', 70], [1971, 'Maru', 66],
    [1974, 'A Question of Power', 72],
]);
add('SN', 'NOVEL', 'Mariama Bâ', [[1979, 'So Long a Letter', 82]]);
add('SN', 'NOVEL', 'Ousmane Sembène', [
    [1960, 'God\'s Bits of Wood', 80], [1973, 'Xala', 68],
]);
add('SN', 'NOVEL', 'Mohamed Mbougar Sarr', [[2021, 'The Most Secret Memory of Men', 76]]);
add('SN', 'NOVEL', 'Fatou Diome', [[2003, 'The Belly of the Atlantic', 66]]);
add('CI', 'NOVEL', 'Ahmadou Kourouma', [
    [1998, 'Allah Is Not Obliged', 74], [1970, 'The Suns of Independence', 70],
]);
add('CI', 'COMIC', 'Marguerite Abouet', [
    [2005, 'Aya of Yop City', 74], [2006, 'Aya: The Secrets Come Out', 60],
]);
add('DZ', 'NOVEL', 'Assia Djebar', [
    [1985, 'Fantasia: An Algerian Cavalcade', 76], [1995, 'So Vast the Prison', 64],
]);
add('DZ', 'THRILLER', 'Yasmina Khadra', [
    [2002, 'The Swallows of Kabul', 74], [2005, 'The Attack', 76],
    [2008, 'What the Day Owes the Night', 70],
]);
add('DZ', 'NOVEL', 'Kamel Daoud', [[2013, 'The Meursault Investigation', 78]]);
add('DZ', 'NOVEL', 'Ahlam Mosteghanemi', [[1993, 'Memory in the Flesh', 72]]);
add('MA', 'NOVEL', 'Tahar Ben Jelloun', [
    [1985, 'The Sand Child', 76], [1987, 'The Sacred Night', 68],
    [2004, 'The Last Friend', 60],
]);
add('MA', 'NOVEL', 'Driss Chraïbi', [[1954, 'The Simple Past', 66]]);
add('MA', 'NOVEL', 'Mohamed Choukri', [[1973, 'For Bread Alone', 72]]);
add('MA', 'NOVEL', 'Leïla Abouzeid', [[1989, 'Year of the Elephant', 60]]);
add('TN', 'NOVEL', 'Albert Memmi', [[1953, 'The Pillar of Salt', 70]]);
add('ET', 'NOVEL', 'Maaza Mengiste', [[2019, 'The Shadow King', 76]]);
add('ET', 'HISTORY', 'Abraham Verghese', [[2009, 'Cutting for Stone', 82]]);
add('UG', 'NOVEL', 'Jennifer Nansubuga Makumbi', [
    [2014, 'Kintu', 74], [2017, 'The First Woman', 66],
]);
add('UG', 'NOVEL', 'Moses Isegawa', [[1998, 'Abyssinian Chronicles', 64]]);
add('RW', 'NOVEL', 'Scholastique Mukasonga', [
    [2008, 'The Barefoot Woman', 70], [2012, 'Our Lady of the Nile', 68],
]);
add('CM', 'NOVEL', 'Mongo Beti', [[1956, 'The Poor Christ of Bomba', 66]]);
add('CM', 'NOVEL', 'Ferdinand Oyono', [[1956, 'Houseboy', 68]]);
add('CM', 'NOVEL', 'Imbolo Mbue', [[2016, 'Behold the Dreamers', 74]]);
add('CD', 'NOVEL', 'Fiston Mwanza Mujila', [[2014, 'Tram 83', 68]]);
add('LR', 'NOVEL', 'Wayétu Moore', [[2018, 'She Would Be King', 64]]);

add('EG', 'NOVEL', 'Naguib Mahfouz', [
    [1956, 'Palace Walk', 94], [1957, 'Palace of Desire', 86], [1957, 'Sugar Street', 84],
    [1947, 'Midaq Alley', 88], [1959, 'Children of the Alley', 82],
    [1961, 'The Thief and the Dogs', 76], [1966, 'Adrift on the Nile', 72],
    [1967, 'Miramar', 74], [1977, 'The Harafish', 78],
    [1979, 'Arabian Nights and Days', 74], [1985, 'Akhenaten, Dweller in Truth', 70],
    [1983, 'The Journey of Ibn Fattouma', 66], [1974, 'Karnak Café', 64],
    [1962, 'Autumn Quail', 60], [1965, 'The Beggar', 60],
]);
add('EG', 'NOVEL', 'Alaa Al Aswany', [
    [2002, 'The Yacoubian Building', 84], [2007, 'Chicago', 64],
    [2013, 'The Automobile Club of Egypt', 66],
]);
add('EG', 'NOVEL', 'Nawal El Saadawi', [
    [1975, 'Woman at Point Zero', 84], [1983, 'Memoirs from the Women\'s Prison', 66],
]);
add('EG', 'NOVEL', 'Ahdaf Soueif', [[1999, 'The Map of Love', 72]]);
add('TR', 'NOVEL', 'Orhan Pamuk', [
    [1985, 'The White Castle', 74], [1990, 'The Black Book', 80],
    [1998, 'My Name Is Red', 94], [2002, 'Snow', 88],
    [2008, 'The Museum of Innocence', 86], [2014, 'A Strangeness in My Mind', 74],
    [2016, 'The Red-Haired Woman', 68], [2021, 'Nights of Plague', 70],
    [1983, 'Silent House', 64],
]);
add('TR', 'HISTORY', 'Orhan Pamuk', [[2003, 'Istanbul: Memories and the City', 82]]);
add('TR', 'NOVEL', 'Elif Shafak', [
    [2006, 'The Bastard of Istanbul', 82], [2009, 'The Forty Rules of Love', 86],
    [2012, 'Honor', 70], [2016, 'Three Daughters of Eve', 68],
    [2019, '10 Minutes 38 Seconds in This Strange World', 78],
    [2021, 'The Island of Missing Trees', 76], [2014, 'The Architect\'s Apprentice', 66],
]);
add('TR', 'NOVEL', 'Yaşar Kemal', [[1955, 'Memed, My Hawk', 82]]);
add('TR', 'NOVEL', 'Sabahattin Ali', [[1943, 'Madonna in a Fur Coat', 80]]);
add('TR', 'NOVEL', 'Ahmet Hamdi Tanpınar', [[1961, 'The Time Regulation Institute', 76]]);
add('TR', 'NOVEL', 'Burhan Sönmez', [[2015, 'Istanbul Istanbul', 64]]);
add('IL', 'NOVEL', 'Amos Oz', [
    [1968, 'My Michael', 74], [1987, 'Black Box', 66],
    [2002, 'A Tale of Love and Darkness', 88], [2014, 'Judas', 72],
    [2009, 'Scenes from Village Life', 64],
]);
add('IL', 'NOVEL', 'David Grossman', [
    [1986, 'See Under: Love', 78], [1991, 'The Book of Intimate Grammar', 66],
    [2008, 'To the End of the Land', 84], [2014, 'A Horse Walks into a Bar', 76],
    [2021, 'More Than I Love My Life', 64],
]);
add('IL', 'NOVEL', 'Etgar Keret', [
    [1992, 'The Bus Driver Who Wanted to Be God', 70], [2019, 'Fly Already', 60],
]);
add('IL', 'NOVEL', 'Meir Shalev', [[1988, 'The Blue Mountain', 64]]);
add('IL', 'THRILLER', 'Batya Gur', [[1988, 'The Saturday Morning Murder', 60]]);
add('IR', 'COMIC', 'Marjane Satrapi', [[2004, 'Embroideries', 66]]);
add('IR', 'NOVEL', 'Sadegh Hedayat', [[1936, 'The Blind Owl', 86]]);
add('IR', 'NOVEL', 'Shahrnush Parsipur', [[1989, 'Women Without Men', 72]]);
add('IR', 'HISTORY', 'Azar Nafisi', [[2003, 'Reading Lolita in Tehran', 84]]);
add('IR', 'NOVEL', 'Mahmoud Dowlatabadi', [[1984, 'Kelidar', 64]]);
add('IR', 'NOVEL', 'Shahriar Mandanipour', [[2009, 'Censoring an Iranian Love Story', 66]]);
add('LB', 'NOVEL', 'Amin Maalouf', [
    [1986, 'Leo Africanus', 80], [1988, 'Samarkand', 78],
    [1993, 'The Rock of Tanios', 70], [2000, 'Balthasar\'s Odyssey', 64],
]);
add('LB', 'HISTORY', 'Amin Maalouf', [[1983, 'The Crusades Through Arab Eyes', 76]]);
add('LB', 'NOVEL', 'Hanan al-Shaykh', [[1980, 'The Story of Zahra', 72]]);
add('LB', 'NOVEL', 'Elias Khoury', [[1998, 'Gate of the Sun', 78]]);
add('LB', 'NOVEL', 'Rabih Alameddine', [[2016, 'The Angel of History', 66]]);
add('SA', 'NOVEL', 'Rajaa Alsanea', [[2005, 'Girls of Riyadh', 72]]);
add('SA', 'NOVEL', 'Abdelrahman Munif', [
    [1984, 'Cities of Salt', 80], [1986, 'The Trench', 62],
]);
add('IQ', 'FANTASY', 'Ahmed Saadawi', [[2013, 'Frankenstein in Baghdad', 82]]);
add('IQ', 'NOVEL', 'Hassan Blasim', [[2009, 'The Madman of Freedom Square', 66]]);
add('IQ', 'NOVEL', 'Sinan Antoon', [[2012, 'The Corpse Washer', 64]]);
add('PS', 'NOVEL', 'Ghassan Kanafani', [
    [1963, 'Men in the Sun', 82], [1969, 'Returning to Haifa', 74],
]);
add('JO', 'NOVEL', 'Ibrahim Nasrallah', [[2009, 'Time of White Horses', 60]]);
add('AE', 'NOVEL', 'Mohammed Al Murr', [[1994, 'Dubai Tales', 56]]);

add('ID', 'NOVEL', 'Pramoedya Ananta Toer', [
    [1980, 'This Earth of Mankind', 90], [1980, 'Child of All Nations', 78],
    [1985, 'Footsteps', 74], [1988, 'House of Glass', 72],
    [1982, 'The Girl from the Coast', 68],
]);
add('ID', 'NOVEL', 'Andrea Hirata', [
    [2005, 'The Rainbow Troops', 84], [2006, 'The Dreamer', 66],
    [2007, 'Edensor', 62], [2008, 'Maryamah Karpov', 60],
]);
add('ID', 'NOVEL', 'Eka Kurniawan', [
    [2002, 'Beauty Is a Wound', 82], [2004, 'Man Tiger', 74],
    [2014, 'Vengeance Is Mine, All Others Pay Cash', 70],
]);
add('ID', 'NOVEL', 'Dee Lestari', [
    [2001, 'Supernova', 68], [2009, 'Paper Boats', 66], [2006, 'Filosofi Kopi', 64],
]);
add('ID', 'NOVEL', 'Leila S. Chudori', [
    [2012, 'Pulang', 70], [2017, 'Laut Bercerita', 72],
]);
add('ID', 'NOVEL', 'Ahmad Tohari', [[1982, 'The Dancer', 70]]);
add('ID', 'NOVEL', 'Ayu Utami', [[1998, 'Saman', 68]]);
add('ID', 'ROMANCE', 'Habiburrahman El Shirazy', [
    [2004, 'Verses of Love', 72], [2007, 'When Love Glorifies God', 60],
]);
add('ID', 'NOVEL', 'Tere Liye', [
    [2005, 'Hafalan Shalat Delisa', 66], [2009, 'Rindu', 64],
    [2015, 'Pulang', 60], [2016, 'Hujan', 68],
    [2014, 'Bumi', 70], [2015, 'Bulan', 62], [2016, 'Matahari', 60],
]);
add('ID', 'NOVEL', 'Okky Madasari', [
    [2012, 'The Outcast', 62], [2013, 'Bound', 56],
]);
add('ID', 'NOVEL', 'Laksmi Pamuntjak', [[2012, 'Amba', 64]]);
add('ID', 'NOVEL', 'Intan Paramaditha', [[2017, 'The Wandering', 66]]);
add('ID', 'NOVEL', 'Y.B. Mangunwijaya', [[1981, 'The Weaverbirds', 64]]);
add('PH', 'NOVEL', 'F. Sionil José', [
    [1962, 'The Pretenders', 74], [1984, 'Mass', 64], [1984, 'Po-on', 70],
]);
add('PH', 'NOVEL', 'Nick Joaquin', [
    [1961, 'The Woman Who Had Two Navels', 76], [1983, 'Cave and Shadows', 60],
]);
add('PH', 'NOVEL', 'Lualhati Bautista', [
    [1983, 'Dekada \'70', 78], [1984, 'Bata, Bata… Pa\'no Ka Ginawa?', 70],
]);
add('PH', 'NOVEL', 'Bob Ong', [
    [2001, 'ABNKKBSNPLAko?!', 72], [2005, 'Stainless Longganisa', 60],
]);
add('PH', 'NOVEL', 'Ricky Lee', [[2008, 'Para Kay B', 64]]);
add('PH', 'NOVEL', 'Jessica Hagedorn', [[1990, 'Dogeaters', 74]]);
add('PH', 'NOVEL', 'Gina Apostol', [
    [2018, 'Insurrecto', 70], [2010, 'Gun Dealers\' Daughter', 62],
]);
add('PH', 'NOVEL', 'Miguel Syjuco', [[2008, 'Ilustrado', 72]]);
add('PH', 'COMIC', 'Budjette Tan', [
    [2008, 'Trese: Murder on Balete Drive', 74], [2008, 'Trese: Unreported Murders', 64],
]);
add('PH', 'COMIC', 'Arnold Arre', [[1999, 'The Mythology Class', 68]]);
add('PH', 'HISTORY', 'Ambeth Ocampo', [[1990, 'Rizal Without the Overcoat', 70]]);
add('TH', 'EPIC', 'Kukrit Pramoj', [[1953, 'Four Reigns', 82]]);
add('TH', 'NOVEL', 'Chart Korbjitti', [
    [1981, 'The Judgment', 72], [1988, 'Mad Dogs & Co.', 60],
]);
add('TH', 'NOVEL', 'Prabda Yoon', [[2000, 'The Sad Part Was', 64]]);
add('TH', 'NOVEL', 'Duanwad Pimwana', [
    [2002, 'Bright', 62], [2016, 'Arid Dreams', 64],
]);
add('TH', 'FANTASY', 'S.P. Somtow', [[1994, 'Jasmine Nights', 66]]);
add('TH', 'NOVEL', 'Pitchaya Sudbanthad', [[2019, 'Bangkok Wakes to Rain', 66]]);
add('VN', 'NOVEL', 'Bảo Ninh', [[1991, 'The Sorrow of War', 86]]);
add('VN', 'NOVEL', 'Dương Thu Hương', [
    [1988, 'Paradise of the Blind', 78], [1991, 'Novel Without a Name', 72],
]);
add('VN', 'NOVEL', 'Nguyễn Phan Quế Mai', [
    [2020, 'The Mountains Sing', 80], [2023, 'Dust Child', 68],
]);
add('VN', 'NOVEL', 'Viet Thanh Nguyen', [
    [2015, 'The Sympathizer', 90], [2021, 'The Committed', 70],
]);
add('VN', 'HISTORY', 'Viet Thanh Nguyen', [[2016, 'Nothing Ever Dies', 68]]);
add('VN', 'CHILDREN', 'Nguyễn Nhật Ánh', [
    [1989, 'Give Me a Ticket Back to Childhood', 72],
    [2010, 'I See Yellow Flowers on the Green Grass', 74],
    [1990, 'Blue Eyes', 60],
]);
add('VN', 'NOVEL', 'Lê Lý Hayslip', [[1989, 'When Heaven and Earth Changed Places', 70]]);
add('MY', 'NOVEL', 'Tan Twan Eng', [
    [2007, 'The Gift of Rain', 76], [2012, 'The Garden of Evening Mists', 84],
    [2023, 'The House of Doors', 70],
]);
add('MY', 'NOVEL', 'Tash Aw', [
    [2005, 'The Harmony Silk Factory', 74], [2013, 'Five Star Billionaire', 66],
    [2019, 'We, the Survivors', 64],
]);
add('MY', 'NOVEL', 'Hanna Alkaf', [
    [2019, 'The Weight of Our Sky', 66], [2022, 'Queen of the Tiles', 60],
]);
add('MY', 'NOVEL', 'Preeta Samarasan', [[2008, 'Evening Is the Whole Day', 64]]);
add('MY', 'NOVEL', 'Rani Manicka', [[2002, 'The Rice Mother', 68]]);
add('SG', 'ROMANCE', 'Kevin Kwan', [
    [2013, 'Crazy Rich Asians', 86], [2015, 'China Rich Girlfriend', 68],
    [2017, 'Rich People Problems', 66],
]);
add('SG', 'NOVEL', 'Catherine Lim', [
    [1978, 'Little Ironies', 66], [1995, 'The Bondmaid', 64],
]);
add('SG', 'NOVEL', 'Suchen Christine Lim', [[1992, 'Fistful of Colours', 60]]);
add('SG', 'COMIC', 'Sonny Liew', [[2015, 'The Art of Charlie Chan Hock Chye', 78]]);
add('SG', 'NOVEL', 'Amanda Lee Koe', [[2013, 'Ministry of Moral Panic', 62]]);
add('SG', 'NOVEL', 'Rachel Heng', [[2023, 'The Great Reclamation', 66]]);
add('SG', 'NOVEL', 'Sharlene Teo', [[2018, 'Ponti', 64]]);
add('MM', 'NOVEL', 'Wendy Law-Yone', [
    [1983, 'The Coffin Tree', 62], [1993, 'Irrawaddy Tango', 58],
]);
add('MM', 'NOVEL', 'Pascal Khoo Thwe', [[2002, 'From the Land of Green Ghosts', 64]]);
add('MM', 'NOVEL', 'Journal Kyaw Ma Ma Lay', [[1955, 'Not Out of Hate', 66]]);

add('AU', 'NOVEL', 'Tim Winton', [
    [1991, 'Cloudstreet', 90], [2008, 'Breath', 78], [2001, 'Dirt Music', 76],
    [1994, 'The Riders', 66], [2013, 'Eyrie', 62], [2018, 'The Shepherd\'s Hut', 70],
]);
add('AU', 'NOVEL', 'Peter Carey', [
    [1988, 'Oscar and Lucinda', 88], [2000, 'True History of the Kelly Gang', 86],
    [1985, 'Illywhacker', 70], [1997, 'Jack Maggs', 72], [1981, 'Bliss', 64],
]);
add('AU', 'NOVEL', 'Thomas Keneally', [
    [1982, 'Schindler\'s Ark', 94], [1972, 'The Chant of Jimmie Blacksmith', 74],
    [2013, 'The Daughters of Mars', 64],
]);
add('AU', 'NOVEL', 'Kate Grenville', [
    [2005, 'The Secret River', 86], [2008, 'The Lieutenant', 64],
    [1999, 'The Idea of Perfection', 60],
]);
add('AU', 'NOVEL', 'Richard Flanagan', [
    [2013, 'The Narrow Road to the Deep North', 90], [2001, 'Gould\'s Book of Fish', 74],
    [1997, 'The Sound of One Hand Clapping', 64],
]);
add('AU', 'NOVEL', 'Christos Tsiolkas', [
    [2008, 'The Slap', 82], [2013, 'Barracuda', 66], [2019, 'Damascus', 64],
]);
add('AU', 'NOVEL', 'Helen Garner', [
    [1977, 'Monkey Grip', 74], [2008, 'The Spare Room', 70],
    [2014, 'This House of Grief', 72],
]);
add('AU', 'NOVEL', 'Patrick White', [
    [1957, 'Voss', 86], [1955, 'The Tree of Man', 74],
    [1961, 'Riders in the Chariot', 70], [1973, 'The Eye of the Storm', 64],
]);
add('AU', 'NOVEL', 'David Malouf', [
    [1993, 'Remembering Babylon', 78], [1990, 'The Great World', 70],
    [1975, 'Johnno', 64], [2009, 'Ransom', 68],
]);
add('AU', 'ROMANCE', 'Colleen McCullough', [[1977, 'The Thorn Birds', 90]]);
add('AU', 'EPIC', 'Colleen McCullough', [
    [1990, 'The First Man in Rome', 70], [1991, 'The Grass Crown', 62],
]);
add('AU', 'NOVEL', 'Bryce Courtenay', [[1989, 'The Power of One', 84]]);
add('AU', 'NOVEL', 'Markus Zusak', [[2005, 'The Book Thief', 92]]);
add('AU', 'ROMANCE', 'Liane Moriarty', [
    [2014, 'Big Little Lies', 88], [2018, 'Nine Perfect Strangers', 74],
    [2013, 'The Husband\'s Secret', 70], [2021, 'Apples Never Fall', 68],
]);
add('AU', 'THRILLER', 'Jane Harper', [
    [2016, 'The Dry', 84], [2017, 'Force of Nature', 70],
    [2018, 'The Lost Man', 68], [2022, 'Exiles', 66],
]);
add('AU', 'NOVEL', 'Hannah Kent', [
    [2013, 'Burial Rites', 78], [2016, 'The Good People', 64],
]);
add('AU', 'NOVEL', 'Trent Dalton', [
    [2018, 'Boy Swallows Universe', 82], [2020, 'All Our Shimmering Skies', 66],
]);
add('AU', 'NOVEL', 'Craig Silvey', [[2009, 'Jasper Jones', 76]]);
add('AU', 'NOVEL', 'Alexis Wright', [
    [2006, 'Carpentaria', 80], [2023, 'Praiseworthy', 72],
]);
add('AU', 'NOVEL', 'Kim Scott', [[1999, 'Benang', 66]]);
add('AU', 'NOVEL', 'Tara June Winch', [[2019, 'The Yield', 74]]);
add('AU', 'NOVEL', 'Melissa Lucashenko', [[2018, 'Too Much Lip', 70]]);
add('AU', 'FANTASY', 'Garth Nix', [
    [1995, 'Sabriel', 82], [2001, 'Lirael', 72], [2003, 'Abhorsen', 70],
]);
add('AU', 'FANTASY', 'Isobelle Carmody', [[1987, 'Obernewtyn', 68]]);
add('AU', 'CHILDREN', 'John Marsden', [
    [1993, 'Tomorrow, When the War Began', 84], [1994, 'The Dead of the Night', 64],
    [1995, 'The Third Day, the Frost', 60], [1996, 'Darkness, Be My Friend', 60],
    [1997, 'Burning for Revenge', 58], [1998, 'The Night Is for Hunting', 58],
    [1999, 'The Other Side of Dawn', 62],
]);
add('AU', 'CHILDREN', 'Andy Griffiths', [
    [2011, 'The 13-Storey Treehouse', 80], [2012, 'The 26-Storey Treehouse', 68],
    [2013, 'The 39-Storey Treehouse', 64], [2014, 'The 52-Storey Treehouse', 60],
    [2015, 'The 65-Storey Treehouse', 58], [2016, 'The 78-Storey Treehouse', 56],
]);
add('AU', 'CHILDREN', 'Mem Fox', [
    [1983, 'Possum Magic', 82], [2004, 'Where Is the Green Sheep?', 70],
    [1993, 'Time for Bed', 64],
]);
add('AU', 'CHILDREN', 'Morris Gleitzman', [
    [2005, 'Once', 74], [2008, 'Then', 64], [2010, 'Now', 60],
    [1992, 'Blabber Mouth', 58], [1990, 'Two Weeks with the Queen', 62],
]);
add('AU', 'CHILDREN', 'Jackie French', [
    [2002, 'Diary of a Wombat', 74], [1999, 'Hitler\'s Daughter', 66],
]);
add('AU', 'CHILDREN', 'Melina Marchetta', [
    [1992, 'Looking for Alibrandi', 78], [2006, 'On the Jellicoe Road', 74],
]);
add('AU', 'COMIC', 'Shaun Tan', [[2006, 'The Arrival', 86]]);
add('AU', 'HISTORY', 'Robert Hughes', [[1986, 'The Fatal Shore', 80]]);
add('NZ', 'NOVEL', 'Keri Hulme', [[1984, 'The Bone People', 86]]);
add('NZ', 'NOVEL', 'Eleanor Catton', [[2013, 'The Luminaries', 88]]);
add('NZ', 'NOVEL', 'Janet Frame', [
    [1957, 'Owls Do Cry', 74], [1982, 'To the Is-Land', 66],
]);
add('NZ', 'NOVEL', 'Witi Ihimaera', [
    [1987, 'The Whale Rider', 86], [1986, 'The Matriarch', 64],
]);
add('NZ', 'NOVEL', 'Patricia Grace', [[1986, 'Potiki', 70]]);
add('NZ', 'NOVEL', 'Lloyd Jones', [[2006, 'Mister Pip', 80]]);
add('NZ', 'FANTASY', 'Elizabeth Knox', [[1998, 'The Vintner\'s Luck', 68]]);
add('NZ', 'CHILDREN', 'Margaret Mahy', [
    [1982, 'The Haunting', 70], [1984, 'The Changeover', 68],
]);
add('NZ', 'NOVEL', 'Catherine Chidgey', [[2022, 'The Axeman\'s Carnival', 64]]);
add('NZ', 'NOVEL', 'Becky Manawatu', [[2019, 'Auē', 70]]);
add('FJ', 'NOVEL', 'Satendra Nandan', [[1991, 'The Wounded Sea', 56]]);
add('WS', 'NOVEL', 'Albert Wendt', [[1977, 'Pouliuli', 64]]);
add('WS', 'NOVEL', 'Sia Figiel', [[1996, 'Where We Once Belonged', 66]]);
add('PG', 'NOVEL', 'Vincent Eri', [[1970, 'The Crocodile', 64]]);

add('IN', 'NOVEL', 'Anita Nair', [[2001, 'Ladies Coupé', 66]]);
add('IN', 'NOVEL', 'Manju Kapur', [[1998, 'Difficult Daughters', 68]]);
add('IN', 'NOVEL', 'Shashi Deshpande', [[1988, 'That Long Silence', 66]]);
add('IN', 'NOVEL', 'Githa Hariharan', [[1992, 'The Thousand Faces of Night', 62]]);
add('IN', 'HISTORY', 'P. Sainath', [[1996, 'Everybody Loves a Good Drought', 72]]);
add('IN', 'HISTORY', 'Pankaj Mishra', [[2017, 'Age of Anger', 70]]);
add('IN', 'TRUE_CRIME', 'S. Hussain Zaidi', [[2014, 'Byculla to Bangkok', 58]]);
add('PK', 'NOVEL', 'Daniyal Mueenuddin', [[2009, 'In Other Rooms, Other Wonders', 74]]);
add('PK', 'NOVEL', 'Fatima Bhutto', [[2019, 'The Runaways', 62]]);
add('BR', 'NOVEL', 'Lygia Fagundes Telles', [[1954, 'Ciranda de Pedra', 60]]);
add('BR', 'NOVEL', 'Conceição Evaristo', [[2006, 'Becos da Memória', 64]]);
add('BR', 'NOVEL', 'Geovani Martins', [[2018, 'The Sun on My Head', 66]]);
add('AR', 'NOVEL', 'Samanta Schweblin', [[2015, 'Mouthful of Birds', 62]]);
add('AR', 'NOVEL', 'Mariana Enríquez', [[2017, 'The Dangers of Smoking in Bed', 70]]);
add('CO', 'NOVEL', 'Pilar Quintana', [[2017, 'The Bitch', 68]]);
add('CO', 'NOVEL', 'Evelio Rosero', [[2007, 'The Armies', 66]]);
add('CL', 'NOVEL', 'Nona Fernández', [[2016, 'Space Invaders', 64]]);
add('CL', 'NOVEL', 'Lina Meruane', [[2012, 'Seeing Red', 64]]);
add('PE', 'NOVEL', 'Mario Vargas Llosa', [[1973, 'Captain Pantoja and the Special Service', 68]]);
add('MX', 'NOVEL', 'Fernanda Melchor', [[2021, 'Paradais', 66]]);
add('US', 'TRUE_CRIME', 'Bryan Burrough', [[2004, 'Public Enemies', 70]]);
add('US', 'TRUE_CRIME', 'Jeff Guinn', [[2013, 'The Last Gunfight', 60]]);
add('US', 'TRUE_CRIME', 'Gilbert King', [[2012, 'Devil in the Grove', 72]]);
add('US', 'TRUE_CRIME', 'Sarah Weinman', [[2018, 'The Real Lolita', 62]]);
add('US', 'ROMANCE', 'Abby Jimenez', [[2019, 'The Friend Zone', 64]]);
add('US', 'ROMANCE', 'Tessa Bailey', [[2021, 'It Happened One Summer', 66]]);
add('GB', 'ROMANCE', 'Sally Thorne', [[2016, 'The Hating Game', 70]]);
add('GB', 'TRUE_CRIME', 'Kate Summerscale', [[2008, 'The Suspicions of Mr Whicher', 74]]);
add('GB', 'TRUE_CRIME', 'Hallie Rubenhold', [[2019, 'The Five', 76]]);
add('GB', 'MYTHOLOGY', 'Jennifer Saint', [
    [2021, 'Ariadne', 72], [2022, 'Elektra', 64],
]);
add('GB', 'MYTHOLOGY', 'Claire North', [[2015, 'The Gameshouse', 60]]);
add('FR', 'TRUE_CRIME', 'Emmanuel Carrère', [[2000, 'The Adversary', 74]]);
add('JP', 'TRUE_CRIME', 'Richard Lloyd Parry', [[2011, 'People Who Eat Darkness', 68]]);

export const BOOKS_REST = rows;
