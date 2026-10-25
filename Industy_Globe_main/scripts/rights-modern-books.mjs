/** Copyrighted books. Real titles and authors stay in this file only. */
const rows = [];
const add = (country, genre, author, entries) => {
    entries.forEach(([year, title, fame]) => {
        rows.push([title, author, year, country, genre, fame || 0]);
    });
};

add('GB', 'FANTASY', 'J.K. Rowling', [
    [1997, 'Harry Potter and the Philosopher\'s Stone', 99],
    [1998, 'Harry Potter and the Chamber of Secrets', 96],
    [1999, 'Harry Potter and the Prisoner of Azkaban', 96],
    [2000, 'Harry Potter and the Goblet of Fire', 95],
    [2003, 'Harry Potter and the Order of the Phoenix', 94],
    [2005, 'Harry Potter and the Half-Blood Prince', 94],
    [2007, 'Harry Potter and the Deathly Hallows', 97],
    [2001, 'Fantastic Beasts and Where to Find Them', 80],
    [2008, 'The Tales of Beedle the Bard', 72],
    [2012, 'The Casual Vacancy', 74],
]);
add('GB', 'FANTASY', 'J.R.R. Tolkien', [
    [1937, 'The Hobbit', 96],
    [1954, 'The Fellowship of the Ring', 98],
    [1954, 'The Two Towers', 96],
    [1955, 'The Return of the King', 97],
    [1977, 'The Silmarillion', 88],
]);
add('GB', 'FANTASY', 'Philip Pullman', [
    [1995, 'Northern Lights', 90],
    [1997, 'The Subtle Knife', 86],
    [2000, 'The Amber Spyglass', 88],
    [2019, 'The Book of Dust', 78],
]);
add('GB', 'FANTASY', 'C.S. Lewis', [
    [1950, 'The Lion, the Witch and the Wardrobe', 94],
    [1951, 'Prince Caspian', 84],
    [1952, 'The Voyage of the Dawn Treader', 84],
    [1953, 'The Silver Chair', 80],
    [1954, 'The Horse and His Boy', 78],
    [1955, 'The Magician\'s Nephew', 82],
    [1956, 'The Last Battle', 80],
]);
add('GB', 'FANTASY', 'Terry Pratchett', [
    [1983, 'The Colour of Magic', 84],
    [1986, 'The Light Fantastic', 78],
    [1987, 'Equal Rites', 80],
    [1987, 'Mort', 86],
    [1988, 'Sourcery', 74],
    [1989, 'Guards! Guards!', 88],
    [1990, 'Moving Pictures', 74],
    [1991, 'Reaper Man', 82],
    [1992, 'Witches Abroad', 80],
    [1992, 'Small Gods', 86],
    [1993, 'Lords and Ladies', 76],
    [1994, 'Soul Music', 74],
    [1995, 'Interesting Times', 72],
    [1996, 'Maskerade', 74],
    [1996, 'Feet of Clay', 80],
    [1997, 'Jingo', 76],
    [1998, 'The Last Continent', 72],
    [1999, 'Carpe Jugulum', 74],
    [2000, 'The Truth', 76],
    [2001, 'Thief of Time', 74],
    [2001, 'The Last Hero', 72],
    [2002, 'Night Watch', 88],
    [2003, 'Monstrous Regiment', 80],
    [2004, 'Going Postal', 86],
    [2005, 'Thud!', 78],
    [2007, 'Making Money', 74],
    [2009, 'Unseen Academicals', 72],
    [2013, 'Raising Steam', 70],
]);
add('GB', 'FANTASY', 'Susanna Clarke', [
    [2004, 'Jonathan Strange and Mr Norrell', 86],
    [2020, 'Piranesi', 84],
]);
add('GB', 'FANTASY', 'Neil Gaiman', [
    [2001, 'American Gods', 88],
    [2005, 'Anansi Boys', 76],
    [2013, 'The Ocean at the End of the Lane', 82],
    [2017, 'Norse Mythology', 80],
]);
add('GB', 'MYTHOLOGY', 'Stephen Fry', [
    [2017, 'Mythos', 82],
    [2018, 'Heroes', 78],
    [2020, 'Troy', 76],
]);
add('GB', 'MYTHOLOGY', 'Madeline Miller', [
    [2011, 'The Song of Achilles', 90],
    [2018, 'Circe', 92],
]);
add('GB', 'MYTHOLOGY', 'Pat Barker', [
    [2018, 'The Silence of the Girls', 82],
    [2021, 'The Women of Troy', 76],
]);
add('GB', 'MYTHOLOGY', 'Natalie Haynes', [
    [2019, 'A Thousand Ships', 78],
    [2020, 'Pandora\'s Jar', 74],
]);
add('GB', 'CHILDREN', 'Roald Dahl', [
    [1964, 'Charlie and the Chocolate Factory', 96],
    [1988, 'Matilda', 94],
    [1961, 'James and the Giant Peach', 88],
    [1982, 'The BFG', 90],
    [1970, 'Fantastic Mr Fox', 84],
    [1980, 'The Twits', 78],
    [1983, 'The Witches', 86],
    [1975, 'Danny the Champion of the World', 76],
]);
add('GB', 'THRILLER', 'Agatha Christie', [
    [1934, 'Murder on the Orient Express', 96],
    [1939, 'And Then There Were None', 97],
    [1936, 'The A.B.C. Murders', 84],
    [1937, 'Death on the Nile', 92],
    [1941, 'Evil Under the Sun', 78],
    [1950, 'A Murder Is Announced', 76],
    [1938, 'Appointment with Death', 72],
    [1942, 'The Body in the Library', 74],
    [1967, 'Endless Night', 70],
    [1933, 'Lord Edgware Dies', 72],
]);
add('GB', 'THRILLER', 'Ian Fleming', [
    [1953, 'Casino Royale', 92],
    [1954, 'Live and Let Die', 80],
    [1955, 'Moonraker', 78],
    [1957, 'From Russia, with Love', 84],
    [1958, 'Dr. No', 86],
    [1959, 'Goldfinger', 90],
    [1961, 'Thunderball', 78],
    [1963, 'On Her Majesty\'s Secret Service', 82],
    [1964, 'You Only Live Twice', 80],
    [1965, 'The Man with the Golden Gun', 74],
]);
add('GB', 'THRILLER', 'John le Carré', [
    [1963, 'The Spy Who Came in from the Cold', 94],
    [1974, 'Tinker Tailor Soldier Spy', 92],
    [1977, 'The Honourable Schoolboy', 78],
    [1979, 'Smiley\'s People', 82],
    [1986, 'A Perfect Spy', 76],
    [2001, 'The Constant Gardener', 80],
]);
add('GB', 'NOVEL', 'George Orwell', [
    [1945, 'Animal Farm', 96],
    [1949, 'Nineteen Eighty-Four', 98],
]);
add('GB', 'NOVEL', 'William Golding', [[1954, 'Lord of the Flies', 94]]);
add('GB', 'NOVEL', 'Kazuo Ishiguro', [
    [1989, 'The Remains of the Day', 94],
    [2005, 'Never Let Me Go', 92],
    [2021, 'Klara and the Sun', 80],
    [1986, 'An Artist of the Floating World', 76],
]);
add('GB', 'NOVEL', 'Salman Rushdie', [
    [1981, 'Midnight\'s Children', 96],
    [1988, 'The Satanic Verses', 90],
    [1995, 'The Moor\'s Last Sigh', 74],
    [2019, 'Quichotte', 70],
]);
add('GB', 'NOVEL', 'Zadie Smith', [
    [2000, 'White Teeth', 88],
    [2005, 'On Beauty', 76],
    [2012, 'NW', 74],
    [2016, 'Swing Time', 72],
]);
add('GB', 'NOVEL', 'Ian McEwan', [
    [2001, 'Atonement', 92],
    [1998, 'Amsterdam', 74],
    [2014, 'The Children Act', 72],
    [1987, 'The Child in Time', 70],
]);
add('GB', 'NOVEL', 'Julian Barnes', [
    [2011, 'The Sense of an Ending', 84],
    [1984, 'Flaubert\'s Parrot', 74],
]);
add('GB', 'NOVEL', 'Hilary Mantel', [
    [2009, 'Wolf Hall', 94],
    [2012, 'Bring Up the Bodies', 88],
    [2020, 'The Mirror and the Light', 84],
]);
add('GB', 'EPIC', 'Ken Follett', [
    [1989, 'The Pillars of the Earth', 90],
    [2007, 'World Without End', 78],
    [2010, 'Fall of Giants', 76],
    [2017, 'A Column of Fire', 72],
]);
add('GB', 'HISTORY', 'Mary Beard', [
    [2015, 'SPQR', 84],
    [2008, 'Pompeii', 76],
]);
add('GB', 'HISTORY', 'Antony Beevor', [
    [1998, 'Stalingrad', 86],
    [2002, 'Berlin: The Downfall 1945', 80],
    [2009, 'D-Day', 78],
]);
add('GB', 'TRUE_CRIME', 'Truman Capote', [[1966, 'In Cold Blood', 94]]);
add('GB', 'COMIC', 'Alan Moore', [
    [1986, 'Watchmen', 96],
    [1988, 'V for Vendetta', 90],
    [1999, 'From Hell', 82],
    [1984, 'Marvelman', 70],
]);
add('GB', 'COMIC', 'Neil Gaiman', [
    [1989, 'The Sandman: Preludes and Nocturnes', 90],
    [1990, 'The Sandman: The Doll\'s House', 82],
]);
add('GB', 'ROMANCE', 'Helen Fielding', [
    [1996, 'Bridget Jones\'s Diary', 88],
    [1999, 'Bridget Jones: The Edge of Reason', 74],
]);
add('GB', 'THRILLER', 'Paula Hawkins', [[2015, 'The Girl on the Train', 86]]);
add('GB', 'THRILLER', 'Gillian Flynn', [[2012, 'Gone Girl', 92]]);
add('IE', 'NOVEL', 'Sally Rooney', [
    [2017, 'Conversations with Friends', 80],
    [2018, 'Normal People', 90],
    [2021, 'Beautiful World, Where Are You', 74],
]);
add('IE', 'NOVEL', 'Colm Tóibín', [
    [2009, 'Brooklyn', 86],
    [2004, 'The Master', 74],
]);
add('IE', 'NOVEL', 'Anne Enright', [
    [2007, 'The Gathering', 78],
    [2015, 'The Green Road', 70],
]);
add('IE', 'NOVEL', 'John Banville', [[2005, 'The Sea', 74]]);
add('IE', 'NOVEL', 'Sebastian Barry', [[2008, 'The Secret Scripture', 76]]);
add('FR', 'NOVEL', 'Albert Camus', [
    [1942, 'The Stranger', 96],
    [1947, 'The Plague', 94],
    [1956, 'The Fall', 82],
]);
add('FR', 'NOVEL', 'Simone de Beauvoir', [
    [1949, 'The Second Sex', 94],
    [1954, 'The Mandarins', 76],
]);
add('FR', 'NOVEL', 'Marguerite Duras', [
    [1984, 'The Lover', 88],
    [1950, 'The Sea Wall', 70],
]);
add('FR', 'NOVEL', 'Annie Ernaux', [
    [2008, 'The Years', 86],
    [1983, 'A Man\'s Place', 74],
    [2016, 'A Girl\'s Story', 72],
]);
add('FR', 'NOVEL', 'Patrick Modiano', [
    [1978, 'Missing Person', 78],
    [2014, 'So You Don\'t Get Lost in the Neighborhood', 68],
]);
add('FR', 'NOVEL', 'Michel Houellebecq', [
    [1998, 'Atomised', 80],
    [2015, 'Submission', 76],
    [2010, 'The Map and the Territory', 70],
]);
add('FR', 'NOVEL', 'Leïla Slimani', [
    [2016, 'Lullaby', 78],
    [2020, 'In the Country of Others', 70],
]);
add('FR', 'COMIC', 'René Goscinny', [
    [1961, 'Asterix the Gaul', 94],
    [1965, 'Asterix and Cleopatra', 86],
    [1966, 'Asterix in Britain', 84],
    [1971, 'Asterix and the Chieftain\'s Shield', 74],
]);
add('BE', 'COMIC', 'Hergé', [
    [1943, 'The Secret of the Unicorn', 88],
    [1946, 'The Blue Lotus', 82],
    [1950, 'Destination Moon', 76],
    [1960, 'Tintin in Tibet', 90],
    [1963, 'The Castafiore Emerald', 74],
]);
add('BE', 'COMIC', 'Morris', [
    [1949, 'Lucky Luke: Dick Digger\'s Gold Mine', 70],
    [1957, 'Lucky Luke: The Dalton Cousins', 74],
]);
add('FR', 'COMIC', 'Marjane Satrapi', [
    [2000, 'Persepolis', 92],
    [2004, 'Persepolis 2', 80],
]);
add('FR', 'FANTASY', 'Antoine de Saint-Exupéry', [[1943, 'The Little Prince', 98]]);
add('DE', 'NOVEL', 'Günter Grass', [
    [1959, 'The Tin Drum', 92],
    [1961, 'Cat and Mouse', 72],
    [1963, 'Dog Years', 70],
]);
add('DE', 'NOVEL', 'Heinrich Böll', [
    [1971, 'Group Portrait with Lady', 70],
    [1963, 'The Clown', 74],
]);
add('DE', 'NOVEL', 'Thomas Mann', [
    [1947, 'Doctor Faustus', 86],
    [1951, 'The Holy Sinner', 68],
]);
add('DE', 'NOVEL', 'Bernhard Schlink', [[1995, 'The Reader', 88]]);
add('DE', 'NOVEL', 'Jenny Erpenbeck', [
    [2015, 'Go, Went, Gone', 74],
    [2021, 'Kairos', 76],
]);
add('DE', 'HISTORY', 'W.G. Sebald', [
    [1995, 'The Rings of Saturn', 82],
    [2001, 'Austerlitz', 88],
]);
add('IT', 'NOVEL', 'Elena Ferrante', [
    [2011, 'My Brilliant Friend', 94],
    [2012, 'The Story of a New Name', 84],
    [2013, 'Those Who Leave and Those Who Stay', 82],
    [2014, 'The Story of the Lost Child', 86],
]);
add('IT', 'NOVEL', 'Italo Calvino', [
    [1972, 'Invisible Cities', 90],
    [1979, 'If on a winter\'s night a traveler', 88],
    [1957, 'The Baron in the Trees', 80],
]);
add('IT', 'NOVEL', 'Umberto Eco', [
    [1980, 'The Name of the Rose', 94],
    [1988, 'Foucault\'s Pendulum', 82],
    [2000, 'Baudolino', 70],
]);
add('IT', 'NOVEL', 'Giuseppe Tomasi di Lampedusa', [[1958, 'The Leopard', 90]]);
add('IT', 'THRILLER', 'Andrea Camilleri', [
    [1994, 'The Shape of Water', 78],
    [1996, 'The Snack Thief', 72],
    [2000, 'The Voice of the Violin', 68],
]);
add('ES', 'NOVEL', 'Carlos Ruiz Zafón', [
    [2001, 'The Shadow of the Wind', 90],
    [2008, 'The Angel\'s Game', 76],
    [2016, 'The Labyrinth of the Spirits', 72],
]);
add('ES', 'NOVEL', 'Javier Marías', [
    [1992, 'A Heart So White', 80],
    [2017, 'Berta Isla', 68],
]);
add('ES', 'NOVEL', 'Javier Cercas', [[2001, 'Soldiers of Salamis', 78]]);
add('ES', 'NOVEL', 'Arturo Pérez-Reverte', [
    [1996, 'The Club Dumas', 76],
    [1988, 'The Fencing Master', 68],
]);
add('ES', 'COMIC', 'Francisco Ibáñez', [
    [1958, 'Mortadelo y Filemón', 84],
    [1971, 'El Sulfato Atómico', 68],
]);
add('SE', 'THRILLER', 'Stieg Larsson', [
    [2005, 'The Girl with the Dragon Tattoo', 94],
    [2006, 'The Girl Who Played with Fire', 86],
    [2007, 'The Girl Who Kicked the Hornets\' Nest', 84],
]);
add('SE', 'NOVEL', 'Fredrik Backman', [
    [2012, 'A Man Called Ove', 88],
    [2016, 'Beartown', 80],
    [2019, 'Anxious People', 74],
]);
add('NO', 'NOVEL', 'Karl Ove Knausgård', [
    [2009, 'My Struggle, Book 1', 86],
    [2011, 'My Struggle, Book 2', 74],
]);
add('NO', 'NOVEL', 'Jo Nesbø', [
    [2000, 'The Redbreast', 80],
    [2007, 'The Snowman', 86],
    [2013, 'Police', 72],
]);
add('RU', 'NOVEL', 'Mikhail Bulgakov', [
    [1967, 'The Master and Margarita', 96],
]);
add('RU', 'NOVEL', 'Boris Pasternak', [[1957, 'Doctor Zhivago', 94]]);
add('RU', 'NOVEL', 'Aleksandr Solzhenitsyn', [
    [1962, 'One Day in the Life of Ivan Denisovich', 92],
    [1973, 'The Gulag Archipelago', 94],
]);
add('RU', 'NOVEL', 'Vladimir Nabokov', [
    [1955, 'Lolita', 96],
    [1962, 'Pale Fire', 88],
    [1969, 'Ada or Ardor', 74],
]);
add('PL', 'NOVEL', 'Olga Tokarczuk', [
    [2014, 'Flights', 84],
    [2007, 'Drive Your Plow Over the Bones of the Dead', 82],
]);
add('CZ', 'NOVEL', 'Milan Kundera', [
    [1984, 'The Unbearable Lightness of Being', 94],
    [1979, 'The Book of Laughter and Forgetting', 80],
]);
add('PT', 'NOVEL', 'José Saramago', [
    [1995, 'Blindness', 92],
    [1982, 'Baltasar and Blimunda', 76],
    [2002, 'The Double', 70],
    [1997, 'All the Names', 72],
]);
add('GR', 'NOVEL', 'Nikos Kazantzakis', [[1946, 'Zorba the Greek', 90]]);
add('NL', 'NOVEL', 'Harry Mulisch', [[1992, 'The Discovery of Heaven', 78]]);
add('FI', 'NOVEL', 'Tove Jansson', [
    [1945, 'The Moomins and the Great Flood', 80],
    [1946, 'Comet in Moominland', 76],
    [1962, 'Tales from Moominvalley', 74],
]);
add('FI', 'CHILDREN', 'Tove Jansson', [[1948, 'Finn Family Moomintroll', 84]]);
add('DK', 'CHILDREN', 'Hans Christian Andersen', []);

add('US', 'NOVEL', 'Harper Lee', [
    [1960, 'To Kill a Mockingbird', 98],
    [2015, 'Go Set a Watchman', 70],
]);
add('US', 'NOVEL', 'Toni Morrison', [
    [1987, 'Beloved', 97],
    [1977, 'Song of Solomon', 88],
    [1970, 'The Bluest Eye', 90],
    [1973, 'Sula', 80],
    [1992, 'Jazz', 74],
]);
add('US', 'NOVEL', 'Ralph Ellison', [[1952, 'Invisible Man', 94]]);
add('US', 'NOVEL', 'James Baldwin', [
    [1953, 'Go Tell It on the Mountain', 90],
    [1956, 'Giovanni\'s Room', 88],
    [1974, 'If Beale Street Could Talk', 84],
]);
add('US', 'NOVEL', 'John Steinbeck', [
    [1939, 'The Grapes of Wrath', 96],
    [1952, 'East of Eden', 94],
    [1937, 'Of Mice and Men', 92],
]);
add('US', 'NOVEL', 'J.D. Salinger', [
    [1951, 'The Catcher in the Rye', 96],
    [1961, 'Franny and Zooey', 78],
]);
add('US', 'NOVEL', 'Joseph Heller', [[1961, 'Catch-22', 94]]);
add('US', 'NOVEL', 'Ken Kesey', [[1962, 'One Flew Over the Cuckoo\'s Nest', 92]]);
add('US', 'NOVEL', 'Jack Kerouac', [[1957, 'On the Road', 90]]);
add('US', 'NOVEL', 'Sylvia Plath', [[1963, 'The Bell Jar', 90]]);
add('US', 'NOVEL', 'Kurt Vonnegut', [
    [1969, 'Slaughterhouse-Five', 94],
    [1963, 'Cat\'s Cradle', 84],
    [1973, 'Breakfast of Champions', 76],
]);
add('US', 'NOVEL', 'Philip Roth', [
    [1969, 'Portnoy\'s Complaint', 82],
    [1997, 'American Pastoral', 90],
    [2000, 'The Human Stain', 80],
    [2004, 'The Plot Against America', 84],
]);
add('US', 'NOVEL', 'Cormac McCarthy', [
    [1985, 'Blood Meridian', 92],
    [1992, 'All the Pretty Horses', 84],
    [2005, 'No Country for Old Men', 90],
    [2006, 'The Road', 92],
]);
add('US', 'NOVEL', 'Don DeLillo', [
    [1985, 'White Noise', 88],
    [1997, 'Underworld', 82],
    [1988, 'Libra', 74],
]);
add('US', 'NOVEL', 'Donna Tartt', [
    [1992, 'The Secret History', 88],
    [2013, 'The Goldfinch', 90],
]);
add('US', 'NOVEL', 'Jonathan Franzen', [
    [2001, 'The Corrections', 86],
    [2010, 'Freedom', 78],
]);
add('US', 'NOVEL', 'Alice Walker', [[1982, 'The Color Purple', 92]]);
add('US', 'NOVEL', 'Maya Angelou', [[1969, 'I Know Why the Caged Bird Sings', 92]]);
add('US', 'NOVEL', 'Octavia E. Butler', [
    [1979, 'Kindred', 92],
    [1993, 'Parable of the Sower', 88],
    [1998, 'Parable of the Talents', 78],
]);
add('US', 'NOVEL', 'Colson Whitehead', [
    [2016, 'The Underground Railroad', 90],
    [2019, 'The Nickel Boys', 86],
    [2021, 'Harlem Shuffle', 74],
]);
add('US', 'NOVEL', 'Barbara Kingsolver', [
    [1998, 'The Poisonwood Bible', 86],
    [2022, 'Demon Copperhead', 84],
]);
add('US', 'NOVEL', 'Ann Patchett', [
    [2001, 'Bel Canto', 80],
    [2019, 'The Dutch House', 74],
]);
add('US', 'NOVEL', 'Marilynne Robinson', [
    [1980, 'Housekeeping', 78],
    [2004, 'Gilead', 88],
    [2008, 'Home', 72],
]);
add('US', 'NOVEL', 'Jhumpa Lahiri', [
    [1999, 'Interpreter of Maladies', 84],
    [2003, 'The Namesake', 86],
]);
add('US', 'NOVEL', 'Min Jin Lee', [[2017, 'Pachinko', 88]]);
add('US', 'NOVEL', 'Celeste Ng', [
    [2014, 'Everything I Never Told You', 76],
    [2017, 'Little Fires Everywhere', 84],
]);
add('US', 'NOVEL', 'Tommy Orange', [[2018, 'There There', 78]]);
add('US', 'NOVEL', 'Louise Erdrich', [
    [1984, 'Love Medicine', 80],
    [2012, 'The Round House', 78],
    [2020, 'The Night Watchman', 80],
]);
add('US', 'NOVEL', 'Brit Bennett', [[2020, 'The Vanishing Half', 82]]);
add('US', 'NOVEL', 'Ocean Vuong', [[2019, 'On Earth We\'re Briefly Gorgeous', 80]]);
add('US', 'NOVEL', 'Jeffrey Eugenides', [
    [1993, 'The Virgin Suicides', 82],
    [2002, 'Middlesex', 86],
]);
add('US', 'NOVEL', 'Richard Wright', [
    [1940, 'Native Son', 90],
    [1945, 'Black Boy', 84],
]);
add('US', 'NOVEL', 'Zora Neale Hurston', [[1937, 'Their Eyes Were Watching God', 94]]);
add('US', 'NOVEL', 'Saul Bellow', [
    [1953, 'The Adventures of Augie March', 82],
    [1964, 'Herzog', 84],
]);
add('US', 'NOVEL', 'John Updike', [
    [1960, 'Rabbit, Run', 82],
    [1981, 'Rabbit Is Rich', 74],
]);
add('US', 'THRILLER', 'Stephen King', [
    [1974, 'Carrie', 88],
    [1975, 'Salem\'s Lot', 82],
    [1977, 'The Shining', 96],
    [1978, 'The Stand', 92],
    [1980, 'Firestarter', 74],
    [1983, 'Pet Sematary', 84],
    [1986, 'It', 94],
    [1987, 'Misery', 90],
    [1990, 'The Stand: Complete Edition', 70],
    [1996, 'The Green Mile', 90],
    [1998, 'Bag of Bones', 68],
    [2009, 'Under the Dome', 74],
    [2011, '11/22/63', 86],
    [2013, 'Doctor Sleep', 78],
    [2018, 'The Outsider', 72],
    [2019, 'The Institute', 74],
    [2021, 'Billy Summers', 68],
]);
add('US', 'FANTASY', 'Stephen King', [
    [1982, 'The Gunslinger', 86],
    [1987, 'The Drawing of the Three', 78],
    [1991, 'The Waste Lands', 74],
    [1997, 'Wizard and Glass', 72],
    [2003, 'Wolves of the Calla', 68],
    [2004, 'Song of Susannah', 66],
    [2004, 'The Dark Tower', 80],
]);
add('US', 'THRILLER', 'Thomas Harris', [
    [1981, 'Red Dragon', 84],
    [1988, 'The Silence of the Lambs', 96],
    [1999, 'Hannibal', 74],
]);
add('US', 'THRILLER', 'Michael Crichton', [
    [1990, 'Jurassic Park', 96],
    [1995, 'The Lost World', 78],
    [1969, 'The Andromeda Strain', 76],
]);
add('US', 'FANTASY', 'Frank Herbert', [
    [1965, 'Dune', 98],
    [1969, 'Dune Messiah', 76],
    [1976, 'Children of Dune', 74],
]);
add('US', 'FANTASY', 'George R.R. Martin', [
    [1996, 'A Game of Thrones', 98],
    [1998, 'A Clash of Kings', 90],
    [2000, 'A Storm of Swords', 92],
    [2005, 'A Feast for Crows', 80],
    [2011, 'A Dance with Dragons', 86],
]);
add('US', 'FANTASY', 'Ursula K. Le Guin', [
    [1968, 'A Wizard of Earthsea', 92],
    [1969, 'The Left Hand of Darkness', 94],
    [1974, 'The Dispossessed', 88],
    [1971, 'The Tombs of Atuan', 76],
]);
add('US', 'FANTASY', 'N.K. Jemisin', [
    [2015, 'The Fifth Season', 90],
    [2016, 'The Obelisk Gate', 78],
    [2017, 'The Stone Sky', 82],
]);
add('US', 'FANTASY', 'Brandon Sanderson', [
    [2006, 'Mistborn: The Final Empire', 86],
    [2010, 'The Way of Kings', 90],
    [2014, 'Words of Radiance', 82],
    [2007, 'The Well of Ascension', 72],
]);
add('US', 'FANTASY', 'Patrick Rothfuss', [
    [2007, 'The Name of the Wind', 90],
    [2011, 'The Wise Man\'s Fear', 82],
]);
add('US', 'FANTASY', 'Robert Jordan', [
    [1990, 'The Eye of the World', 86],
    [1990, 'The Great Hunt', 72],
    [1991, 'The Dragon Reborn', 70],
]);
add('US', 'FANTASY', 'Suzanne Collins', [
    [2008, 'The Hunger Games', 96],
    [2009, 'Catching Fire', 88],
    [2010, 'Mockingjay', 86],
]);
add('US', 'FANTASY', 'Rick Riordan', [
    [2005, 'The Lightning Thief', 92],
    [2006, 'The Sea of Monsters', 78],
    [2007, 'The Titan\'s Curse', 76],
    [2009, 'The Last Olympian', 74],
]);
add('US', 'CHILDREN', 'E.B. White', [
    [1952, 'Charlotte\'s Web', 96],
    [1945, 'Stuart Little', 84],
]);
add('US', 'CHILDREN', 'Maurice Sendak', [[1963, 'Where the Wild Things Are', 94]]);
add('US', 'CHILDREN', 'Dr. Seuss', [
    [1957, 'The Cat in the Hat', 96],
    [1960, 'Green Eggs and Ham', 92],
    [1954, 'Horton Hears a Who!', 82],
]);
add('US', 'CHILDREN', 'Madeleine L\'Engle', [[1962, 'A Wrinkle in Time', 92]]);
add('US', 'CHILDREN', 'Lois Lowry', [[1993, 'The Giver', 90]]);
add('US', 'CHILDREN', 'Louis Sachar', [[1998, 'Holes', 86]]);
add('US', 'CHILDREN', 'Katherine Paterson', [[1977, 'Bridge to Terabithia', 84]]);
add('US', 'CHILDREN', 'Judy Blume', [
    [1970, 'Are You There God? It\'s Me, Margaret', 88],
    [1972, 'Tales of a Fourth Grade Nothing', 76],
]);
add('US', 'CHILDREN', 'Jeff Kinney', [
    [2007, 'Diary of a Wimpy Kid', 90],
    [2008, 'Rodrick Rules', 74],
    [2009, 'The Last Straw', 68],
]);
add('US', 'CHILDREN', 'Dav Pilkey', [
    [1997, 'The Adventures of Captain Underpants', 84],
    [2016, 'Dog Man', 78],
]);
add('US', 'CHILDREN', 'R.J. Palacio', [[2012, 'Wonder', 86]]);
add('US', 'ROMANCE', 'Nicholas Sparks', [
    [1996, 'The Notebook', 90],
    [1999, 'A Walk to Remember', 80],
    [2003, 'The Guardian', 64],
    [1998, 'Message in a Bottle', 70],
]);
add('US', 'ROMANCE', 'Colleen Hoover', [
    [2016, 'It Ends with Us', 90],
    [2022, 'It Starts with Us', 74],
    [2018, 'Verity', 82],
    [2016, 'Ugly Love', 70],
]);
add('US', 'ROMANCE', 'Emily Henry', [
    [2020, 'Beach Read', 78],
    [2021, 'People We Meet on Vacation', 80],
    [2022, 'Book Lovers', 76],
]);
add('US', 'ROMANCE', 'Nora Roberts', [
    [1994, 'Born in Fire', 64],
    [2001, 'Heaven and Earth', 60],
]);
add('US', 'TRUE_CRIME', 'Vincent Bugliosi', [[1974, 'Helter Skelter', 84]]);
add('US', 'TRUE_CRIME', 'Ann Rule', [[1980, 'The Stranger Beside Me', 80]]);
add('US', 'TRUE_CRIME', 'Erik Larson', [[2003, 'The Devil in the White City', 88]]);
add('US', 'TRUE_CRIME', 'John Berendt', [[1994, 'Midnight in the Garden of Good and Evil', 82]]);
add('US', 'TRUE_CRIME', 'Michelle McNamara', [[2018, 'I\'ll Be Gone in the Dark', 80]]);
add('US', 'TRUE_CRIME', 'David Grann', [
    [2017, 'Killers of the Flower Moon', 90],
    [2009, 'The Lost City of Z', 76],
]);
add('US', 'TRUE_CRIME', 'John Carreyrou', [[2018, 'Bad Blood', 84]]);
add('US', 'TRUE_CRIME', 'Patrick Radden Keefe', [[2021, 'Empire of Pain', 82]]);
add('US', 'TRUE_CRIME', 'Dave Cullen', [[2009, 'Columbine', 74]]);
add('US', 'TRUE_CRIME', 'Robert Graysmith', [[1986, 'Zodiac', 76]]);
add('US', 'TRUE_CRIME', 'Norman Mailer', [[1979, 'The Executioner\'s Song', 80]]);
add('US', 'HISTORY', 'Howard Zinn', [[1980, 'A People\'s History of the United States', 86]]);
add('US', 'HISTORY', 'Doris Kearns Goodwin', [[2005, 'Team of Rivals', 84]]);
add('US', 'HISTORY', 'Isabel Wilkerson', [
    [2010, 'The Warmth of Other Suns', 88],
    [2020, 'Caste', 86],
]);
add('US', 'HISTORY', 'Ron Chernow', [
    [2004, 'Alexander Hamilton', 88],
    [2011, 'Washington: A Life', 74],
]);
add('US', 'HISTORY', 'David McCullough', [
    [2001, 'John Adams', 82],
    [1992, 'Truman', 74],
]);
add('US', 'HISTORY', 'Jared Diamond', [[1997, 'Guns, Germs, and Steel', 90]]);
add('US', 'HISTORY', 'Rebecca Skloot', [[2010, 'The Immortal Life of Henrietta Lacks', 86]]);
add('US', 'HISTORY', 'Michelle Alexander', [[2010, 'The New Jim Crow', 86]]);
add('US', 'HISTORY', 'Dee Brown', [[1970, 'Bury My Heart at Wounded Knee', 84]]);
add('US', 'HISTORY', 'Rachel Carson', [[1962, 'Silent Spring', 90]]);
add('US', 'HISTORY', 'Barbara Tuchman', [[1962, 'The Guns of August', 82]]);
add('US', 'COMIC', 'Art Spiegelman', [[1986, 'Maus', 96]]);
add('US', 'COMIC', 'Frank Miller', [
    [1986, 'The Dark Knight Returns', 94],
    [1987, 'Batman: Year One', 88],
]);
add('US', 'COMIC', 'Alison Bechdel', [[2006, 'Fun Home', 88]]);
add('US', 'COMIC', 'Craig Thompson', [[2003, 'Blankets', 78]]);
add('US', 'COMIC', 'Jeff Smith', [[1991, 'Bone', 84]]);
add('US', 'COMIC', 'Brian K. Vaughan', [
    [2012, 'Saga, Volume 1', 86],
    [2002, 'Y: The Last Man', 80],
]);
add('US', 'COMIC', 'Robert Kirkman', [[2003, 'The Walking Dead, Volume 1', 86]]);
add('US', 'COMIC', 'Gene Luen Yang', [[2006, 'American Born Chinese', 82]]);
add('US', 'COMIC', 'Raina Telgemeier', [
    [2010, 'Smile', 80],
    [2012, 'Drama', 72],
]);
add('US', 'COMIC', 'Jerry Craft', [[2019, 'New Kid', 74]]);
add('US', 'COMIC', 'John Lewis', [[2013, 'March: Book One', 86]]);
add('US', 'COMIC', 'George Takei', [[2019, 'They Called Us Enemy', 78]]);
add('US', 'COMIC', 'G. Willow Wilson', [[2014, 'Ms. Marvel: No Normal', 82]]);
add('US', 'COMIC', 'Ta-Nehisi Coates', [[2016, 'Black Panther: A Nation Under Our Feet', 80]]);
add('US', 'COMIC', 'Mark Waid', [[1996, 'Kingdom Come', 78]]);
add('US', 'COMIC', 'Grant Morrison', [[2005, 'All-Star Superman', 82]]);
add('US', 'MYTHOLOGY', 'Rick Riordan', [
    [2010, 'The Red Pyramid', 74],
    [2011, 'The Throne of Fire', 66],
]);
add('US', 'MANHWA', 'uru-chan', [[2016, 'UnOrdinary', 72]]);
add('US', 'MANHWA', 'Leeanne M. Krecic', [[2016, 'Let\'s Play', 64]]);
add('US', 'MANHWA', 'LambCat', [[2016, 'Cursed Princess Club', 70]]);
add('CA', 'NOVEL', 'Margaret Atwood', [
    [1985, 'The Handmaid\'s Tale', 97],
    [2019, 'The Testaments', 84],
    [2000, 'The Blind Assassin', 78],
    [1996, 'Alias Grace', 82],
    [2003, 'Oryx and Crake', 76],
    [1969, 'The Edible Woman', 68],
]);
add('CA', 'NOVEL', 'Alice Munro', [
    [1971, 'Lives of Girls and Women', 80],
    [2004, 'Runaway', 78],
    [2012, 'Dear Life', 76],
]);
add('CA', 'NOVEL', 'Michael Ondaatje', [
    [1992, 'The English Patient', 94],
    [2000, 'Anil\'s Ghost', 72],
]);
add('CA', 'NOVEL', 'Robertson Davies', [
    [1970, 'Fifth Business', 76],
    [1981, 'The Rebel Angels', 64],
]);
add('CA', 'FANTASY', 'Guy Gavriel Kay', [
    [1990, 'Tigana', 78],
    [1995, 'The Lions of Al-Rassan', 76],
]);
add('CA', 'NOVEL', 'Yann Martel', [[2001, 'Life of Pi', 90]]);
add('CA', 'NOVEL', 'Esi Edugyan', [
    [2011, 'Half-Blood Blues', 70],
    [2018, 'Washington Black', 74],
]);
add('CA', 'CHILDREN', 'L.M. Montgomery', []);
add('MX', 'NOVEL', 'Juan Rulfo', [[1955, 'Pedro Páramo', 92]]);
add('MX', 'NOVEL', 'Carlos Fuentes', [
    [1962, 'The Death of Artemio Cruz', 86],
    [1985, 'The Old Gringo', 72],
    [1975, 'Terra Nostra', 70],
]);
add('MX', 'NOVEL', 'Laura Esquivel', [[1989, 'Like Water for Chocolate', 90]]);
add('MX', 'NOVEL', 'Octavio Paz', [[1950, 'The Labyrinth of Solitude', 88]]);
add('MX', 'NOVEL', 'Elena Poniatowska', [[1971, 'Massacre in Mexico', 74]]);
add('MX', 'NOVEL', 'Valeria Luiselli', [
    [2019, 'Lost Children Archive', 78],
    [2016, 'The Story of My Teeth', 66],
]);
add('MX', 'NOVEL', 'Yuri Herrera', [[2009, 'Signs Preceding the End of the World', 76]]);
add('MX', 'NOVEL', 'Fernanda Melchor', [[2017, 'Hurricane Season', 80]]);
add('MX', 'HISTORY', 'Enrique Krauze', [[1997, 'Mexico: Biography of Power', 72]]);

import { BOOKS_WORLD } from './rights-modern-books-world.mjs';
import { BOOKS_REST } from './rights-modern-books-rest.mjs';
import { BOOKS_FILL } from './rights-modern-books-fill.mjs';

export const MODERN_BOOKS = rows.concat(BOOKS_WORLD, BOOKS_REST, BOOKS_FILL);
