// Seeds pre-approved users into Firestore preApprovedUsers collection.
// Doc ID = lowercase email. Skips "noemail" entries and duplicate emails (first wins).
// Run: node scripts/seed-pre-approved-users.js

const fs = require('fs');
const https = require('https');

const PROJECT_ID = 'faith-responders-prod';

function getAccessToken() {
  const config = JSON.parse(fs.readFileSync('C:/ClaudeProfiles/personal/.config/configstore/firebase-tools.json', 'utf8'));
  return config.tokens.access_token;
}

function firestoreSet(token, docPath, data) {
  return new Promise((resolve, reject) => {
    const fields = {};
    for (const [k, v] of Object.entries(data)) {
      if (typeof v === 'string') fields[k] = { stringValue: v };
      else if (typeof v === 'number') fields[k] = { integerValue: String(v) };
    }
    const body = JSON.stringify({ fields });
    const path = `/v1/projects/${PROJECT_ID}/databases/(default)/documents/${docPath}`;
    const options = {
      hostname: 'firestore.googleapis.com',
      path,
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };
    const req = https.request(options, (res) => {
      let d = '';
      res.on('data', (c) => (d += c));
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) resolve();
        else reject(new Error(`HTTP ${res.statusCode}: ${d}`));
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

const RAW_USERS = [
  { firstName: 'Robert', lastName: 'Belknap', phoneNumber: '(478) 397-8712', email: 'rwbelknap1957@gmail.com' },
  { firstName: 'James', lastName: 'Abely', phoneNumber: '(202) 746-5905', email: 'jamesabely@hotmail.com' },
  { firstName: 'Mark', lastName: 'Addington', phoneNumber: '(229) 798-2402', email: 'mark@nashvillemc.org' },
  { firstName: 'Lorrie', lastName: 'Allchin', phoneNumber: '(229) 460-2650', email: 'lorrie.allchin@gmail.com' },
  { firstName: 'Fran', lastName: 'And Gene Christianson', phoneNumber: '(478) 731-6987', email: 'gacfac@earthlink.net' },
  { firstName: 'Douglas', lastName: 'Anderson', phoneNumber: '(614) 271-2377', email: 'anderson.29@sbcglobal.net' },
  { firstName: 'Robert', lastName: 'Beverly', phoneNumber: '(229) 206-2949', email: 'rtbeverlymc@gmail.com' },
  { firstName: 'Christopher', lastName: 'Blackburn', phoneNumber: '(512) 363-0907', email: 'toddblackburn45@yahoo.com' },
  { firstName: 'Dawn', lastName: 'Brown', phoneNumber: '(229) 590-0793', email: 'dbrown@brownspond.com' },
  { firstName: 'Evelyn', lastName: 'Brown', phoneNumber: '(706) 464-5698', email: 'evelyn_brown12@yahoo.com' },
  { firstName: 'Jim', lastName: 'Brown', phoneNumber: '(229) 375-1464', email: 'jrbrown394@windstream.net' },
  { firstName: 'Rhonda', lastName: 'Brown', phoneNumber: '(229) 460-6984', email: 'rhonda_brown@windstream.net' },
  { firstName: 'Thomas', lastName: 'Brown', phoneNumber: '(229) 996-2920', email: 'tom.brown@brownspond.com' },
  { firstName: 'Christine', lastName: 'Brunet', phoneNumber: '(985) 852-7870', email: 'cbrunet@charter.net' },
  { firstName: 'William', lastName: 'Brunet', phoneNumber: '(985) 226-7593', email: 'wbrunet@charter.net' },
  { firstName: 'Patti', lastName: 'Buckhiester', phoneNumber: '(706) 366-3388', email: 'buckhiespj@gmail.com' },
  { firstName: 'Andy', lastName: 'Cain', phoneNumber: '(912) 269-9567', email: 'caincrew@bellsouth.com' },
  { firstName: 'Beth', lastName: 'Cain', phoneNumber: '(912) 266-5197', email: 'caincrew@bellsouth.net' },
  { firstName: 'Tracy', lastName: 'Carroll', phoneNumber: '(346) 978-8067', email: 'tracy@logiclander.com' },
  { firstName: 'Stephen', lastName: 'Childers', phoneNumber: '(706) 905-1701', email: 'stephenmchilders@gmail.com' },
  { firstName: 'Gene', lastName: 'Christianson', phoneNumber: '(478) 731-0350', email: 'gacfac@mindspring.com' },
  { firstName: 'Angela', lastName: 'Conley', phoneNumber: '(281) 948-1667', email: 'angeva2000@yahoo.com' },
  { firstName: 'Jack', lastName: 'Cooey', phoneNumber: '(912) 358-9693', email: 'jcooey@jc-mep.com' },
  { firstName: 'David', lastName: 'Cox', phoneNumber: '(904) 610-2019', email: 'brodavefla@gmail.com' },
  { firstName: 'Letcher', lastName: 'Crawford Jr', phoneNumber: '(478) 319-5721', email: 'letchercrawfordjr@yahoo.com' },
  { firstName: 'Heather', lastName: 'Crof', phoneNumber: '(229) 251-5198', email: 'hcrot@parkave.church' },
  { firstName: 'Sue', lastName: 'Cunningham', phoneNumber: '(419) 571-2847', email: 'anaffielover@yahoo.com' },
  { firstName: 'Cathey', lastName: 'Cuttuno', phoneNumber: '(912) 658-4110', email: 'catheyhandley@aol.com' },
  { firstName: 'Anresa', lastName: 'Davis', phoneNumber: '(770) 380-2849', email: 'anresad@gmail.com' },
  { firstName: 'Linda', lastName: 'Davis', phoneNumber: '(832) 423-8911', email: 'davisld222@gmail.com' },
  { firstName: 'Phil', lastName: 'Davis', phoneNumber: '(404) 567-6090', email: 'pddcoo@duck.com' },
  { firstName: 'Kirsten', lastName: 'Dixon', phoneNumber: '(912) 506-8392', email: 'kirstendixon0228@gmail.com' },
  { firstName: 'Slade', lastName: 'Dominick', phoneNumber: '(229) 942-1666', email: 'u.s.marine3096@gmail.com' },
  { firstName: 'Rick', lastName: 'Dorer', phoneNumber: '(706) 662-1430', email: 'dorerr@bellsouth.net' },
  { firstName: 'Christopher', lastName: 'Dowse', phoneNumber: '(229) 569-0708', email: 'csdowse@gmail.com' },
  { firstName: 'Dalton', lastName: 'Drocea', phoneNumber: '(229) 561-7690', email: 'daltondrocea@gmail.com' },
  { firstName: 'Tiberius', lastName: 'Drocea', phoneNumber: '(229) 460-6311', email: 'tdro1@icloud.com' },
  { firstName: 'Delvin', lastName: 'Foret', phoneNumber: '(985) 791-4430', email: 'delvinforet@bellsouth.net' },
  { firstName: 'Bruce', lastName: 'Getz', phoneNumber: '(706) 573-9306', email: 'bigdaddy230.bg@gmail.com' },
  { firstName: 'Debbie', lastName: 'H Browning', phoneNumber: '(229) 402-2126', email: 'dhbrowning7428@gmail.com' },
  { firstName: 'Philip', lastName: 'H Eastman', phoneNumber: '(770) 265-0187', email: 'philipheastman@gmail.com' },
  { firstName: 'Sherman', lastName: 'Hall', phoneNumber: '(229) 403-7448', email: 'shall4218@att.net' },
  { firstName: 'Meshack', lastName: 'Halonyere Oduke', phoneNumber: '+254714213505', email: 'odukemesh72@gmail.com' },
  { firstName: 'Kasey', lastName: 'Harbuck', phoneNumber: '(706) 326-7338', email: 'kasey.harbuck@gmail.com' },
  { firstName: 'Eric', lastName: 'Harlan', phoneNumber: '(912) 604-2069', email: 'eric.harlan54@gmail.com' },
  { firstName: 'Chad', lastName: 'Harris', phoneNumber: '(229) 449-1135', email: 'wharris831@outlook.com' },
  { firstName: 'Preston', lastName: 'Harris', phoneNumber: '(229) 942-7818', email: 'ellenharris57@icloud.com' },
  { firstName: 'Gene', lastName: 'Hartin', phoneNumber: '(706) 442-1508', email: 'gha7927292@aol.com' },
  { firstName: 'Darcy', lastName: 'Hatin', phoneNumber: '(478) 396-6333', email: 'd.hatin@aol.com' },
  { firstName: 'Pamela', lastName: 'Herndon', phoneNumber: '(912) 324-9244', email: 'chapelchickpam@duck.com' },
  { firstName: 'Kay', lastName: 'Horton', phoneNumber: '(770) 363-2876', email: 'kayathome@att.net' },
  { firstName: 'Robin', lastName: 'Hudson', phoneNumber: '(225) 715-9797', email: 'robinhudson9797@gmail.com' },
  { firstName: 'Jed', lastName: 'Hunter', phoneNumber: '(229) 740-1612', email: 'jed.hunter@yahoo.com' },
  { firstName: 'Lonnie', lastName: 'J Boudloche', phoneNumber: '(985) 860-9745', email: 'zoomme1952@hotmail.com' },
  { firstName: 'Jenna', lastName: 'Jackson', phoneNumber: '(404) 545-5197', email: 'jennajacksonrealtor@gmail.com' },
  { firstName: 'Stan', lastName: 'Jones', phoneNumber: '(229) 942-1834', email: 'jonesstan959@gmail.com' },
  { firstName: 'Ralph', lastName: 'K Leighty', phoneNumber: '(412) 298-6664', email: 'kentleighty@gmail.com' },
  { firstName: 'Larry', lastName: 'K. Lees', phoneNumber: '(770) 906-0403', email: 'leeslarry1971@gmail.com' },
  { firstName: 'Russ', lastName: 'Kamradt', phoneNumber: '(904) 563-7097', email: 'russkamradt@hotmail.com' },
  { firstName: 'Jeanna', lastName: 'Kate Shivers', phoneNumber: '(229) 314-3928', email: 'jk3shivers@gmail.com' },
  { firstName: 'Barry', lastName: 'Kinservik', phoneNumber: '(229) 942-7224', email: 'kinservik.barry@gmail.com' },
  { firstName: 'Mark', lastName: 'Kinservik', phoneNumber: '(229) 938-0854', email: 'kinservikga@gmail.com' },
  { firstName: 'Duane', lastName: 'Knowles', phoneNumber: '(904) 838-8500', email: 'duane@eacoproducts.com' },
  { firstName: 'Betsy', lastName: 'Kraushaar', phoneNumber: '(914) 441-8419', email: 'betsyzk@gmail.com' },
  { firstName: 'Thomas', lastName: 'L Smith', phoneNumber: '(229) 378-0323', email: 'tldsmith@icloud.com' },
  { firstName: 'Nannette', lastName: 'Lambert', phoneNumber: '(912) 755-2663', email: 'lambena12@gmail.com' },
  { firstName: 'Terry', lastName: 'Lindsey', phoneNumber: '(985) 226-5525', email: 'terry.a.lindsey@charter.net' },
  { firstName: 'Rudy', lastName: 'Lomonaco', phoneNumber: '(912) 844-6439', email: 'rudy_lomonaco@comcast.net' },
  { firstName: 'Carl', lastName: 'Lowell', phoneNumber: '(229) 815-6062', email: 'carllowell280@gmail.com' },
  { firstName: 'Dea', lastName: 'Lowell', phoneNumber: '(229) 425-4023', email: 'lulu1966.di@gmail.com' },
  { firstName: 'Randy', lastName: 'Luukkonen', phoneNumber: '(912) 580-6817', email: 'northlandmn4@gmail.com' },
  { firstName: 'Jane', lastName: 'Lyles', phoneNumber: '(985) 324-2099', email: 'janelyles02@gmail.com' },
  { firstName: 'David', lastName: 'M. Young', phoneNumber: '(231) 633-3574', email: 'dmyoung1524@yahoo.com' },
  { firstName: 'Phil', lastName: 'Mack', phoneNumber: '(224) 730-8566', email: 'pjmack54@sbcglobal.net' },
  { firstName: 'Lisa', lastName: 'Madler', phoneNumber: '(706) 366-1533', email: 'madterriers@gmail.com' },
  { firstName: 'Don', lastName: 'Matherne', phoneNumber: '(985) 804-4475', email: 'inteuder14002000@yahoo.com' },
  { firstName: 'Judy', lastName: 'Matherne', phoneNumber: '(985) 790-9707', email: 'judymatherne@yahoo.com' },
  { firstName: 'Edward', lastName: 'Mccall', phoneNumber: '(912) 270-2660', email: 'mccalls1@comcast.net' },
  { firstName: 'Cheryl', lastName: 'Mcglone', phoneNumber: '(912) 484-4114', email: 'cmcglone@monroemarketing.net' },
  { firstName: 'Pat', lastName: 'Mcglone', phoneNumber: '(912) 484-0578', email: 'cyclone2882@gmail.com' },
  { firstName: 'Joseph', lastName: 'Mclaurin', phoneNumber: '(601) 325-1268', email: 'joeymackspta@gmail.com' },
  { firstName: 'Maryann', lastName: 'Medlock Reiselbara', phoneNumber: '(850) 238-1825', email: 'mreiselbara@yahoo.com' },
  { firstName: 'Theresa', lastName: 'Miazga', phoneNumber: '(561) 516-2103', email: 'office@fmcmh' },
  { firstName: 'David', lastName: 'Mills', phoneNumber: '(706) 296-3734', email: 'dpmillsjr@gmail.com' },
  { firstName: 'Brennan', lastName: 'Morris', phoneNumber: '(229) 942-0704', email: 'morrisboomboom@yahoo.com' },
  { firstName: 'Daniel', lastName: 'Mushinski', phoneNumber: '(281) 948-8642', email: 'dgmushinski@aol.com' },
  { firstName: 'Rodney', lastName: 'Nix', phoneNumber: '(229) 686-0178', email: 'rbnix_19@yahoo.com' },
  { firstName: 'Ronnie', lastName: 'P. Matherne', phoneNumber: '(225) 776-0263', email: 'rmath1959@gmail.com' },
  { firstName: 'Frank', lastName: 'Parmer', phoneNumber: '(706) 577-2378', email: 'benold@skoz.org' },
  { firstName: 'Stephen', lastName: 'Pattillo', phoneNumber: '(706) 570-1573', email: 'stevepattillo@hotmail.com' },
  { firstName: 'Pat', lastName: 'Peace', phoneNumber: '(985) 870-1783', email: 'patpeace@evansbaskets.com' },
  { firstName: 'Sarah', lastName: 'Pease', phoneNumber: '(203) 570-8773', email: 'sarahpease227@gmail.com' },
  { firstName: 'Rudy', lastName: 'Peeples', phoneNumber: '(912) 222-8010', email: 'rudypeeples6@gmail.com' },
  { firstName: 'Pete', lastName: 'Perez', phoneNumber: '(904) 874-7482', email: 'pbperez008@comcast.net' },
  { firstName: 'Terry', lastName: 'Peters', phoneNumber: '(706) 344-2013', email: 'zpet549@gmail.com' },
  { firstName: 'Lurinda', lastName: 'Platt', phoneNumber: '(954) 612-0038', email: 'lurhot@hotmail.com' },
  { firstName: 'Janet', lastName: 'Porch', phoneNumber: '(229) 942-4267', email: 'jporch280@gmail.com' },
  { firstName: 'Rick', lastName: 'Postell', phoneNumber: '(229) 646-4329', email: 'rpostell@chaparralboas' },
  { firstName: 'Darrell', lastName: 'Presley', phoneNumber: '(229) 740-2564', email: 'darrellpresley@gmail.com' },
  { firstName: 'Darel', lastName: 'Rayburn', phoneNumber: '(229) 563-0781', email: 'dcrmmr4@windstream.net' },
  { firstName: 'Myan', lastName: 'Rayburn', phoneNumber: '(229) 563-1856', email: 'missyrayburn68@gmail.com' },
  { firstName: 'Ethan', lastName: 'Regan', phoneNumber: '(507) 276-9643', email: 'regane7688@gmail.com' },
  { firstName: 'Kelley', lastName: 'Regan', phoneNumber: '(205) 541-9640', email: 'kelleymac23@gmail.com' },
  { firstName: 'Deb', lastName: 'Richards', phoneNumber: '(912) 270-3631', email: 'richga@bellsouth.net' },
  { firstName: 'Pete', lastName: 'Richards', phoneNumber: '(912) 275-9095', email: 'prichga@gmail.com' },
  { firstName: 'Regina', lastName: 'Richardson', phoneNumber: '(229) 686-4110', email: 'reginarichardson1961@gmail.com' },
  { firstName: 'Steven', lastName: 'Riddle', phoneNumber: '(404) 450-9083', email: 'rid.steven23@gmail.com' },
  { firstName: 'Victoria', lastName: 'Riles Herron', phoneNumber: '(229) 815-2915', email: 'b17tori@yahoo.com' },
  { firstName: 'Patrick', lastName: 'Rupp', phoneNumber: '(985) 381-2363', email: 'prupp118@gmail.com' },
  { firstName: 'Jonathan', lastName: 'Russo', phoneNumber: '(985) 381-4243', email: 'jpr400@hotmail.com' },
  { firstName: 'Pamela', lastName: 'Russo', phoneNumber: '(985) 856-6479', email: 'pdr2005@aol.com' },
  { firstName: 'Steve', lastName: 'Sample', phoneNumber: '(229) 395-6615', email: 'steven.sample.dds@gmail.com' },
  { firstName: 'Justin', lastName: 'Shepherd', phoneNumber: '(706) 304-3467', email: 'justin.shep89@gmail.com' },
  { firstName: 'Casey', lastName: 'Shivers', phoneNumber: '(229) 314-9302', email: 'pcs.shivers@yahoo.com' },
  { firstName: 'Jami', lastName: 'Shivers', phoneNumber: '(229) 314-9301', email: 'jami@wetfeetministries.org' },
  { firstName: 'David', lastName: 'Singleton', phoneNumber: '(478) 213-9452', email: 'ranger175vs@hotmail.com' },
  { firstName: 'Ronnie', lastName: 'Smiley', phoneNumber: '(912) 657-2012', email: 'rcsmileydmdpc@yahoo.com' },
  { firstName: 'Curt', lastName: 'Smith', phoneNumber: '(770) 597-8891', email: '71curt@gmail.com' },
  { firstName: 'Jennifer', lastName: 'Smith', phoneNumber: '(229) 938-7781', email: 'jennifer@wetfeetministries.org' },
  { firstName: 'Mitchell', lastName: 'Smith', phoneNumber: '(229) 942-1243', email: 'mitchell@wetfeetministries.org' },
  { firstName: 'Joe', lastName: 'Stephenson', phoneNumber: '(912) 217-0203', email: 'j.stephenson2016@att.net' },
  { firstName: 'Roger', lastName: 'Summerall', phoneNumber: '(912) 660-6425', email: 'rsummerall27@gmail.com' },
  { firstName: 'Jennifer', lastName: 'Sumner', phoneNumber: '(229) 251-8648', email: 'mypointsspark@gmail.com' },
  { firstName: 'Sarah', lastName: 'Surratt', phoneNumber: '(229) 300-8907', email: 'sarahsurratt7@gmail.com' },
  { firstName: 'Glenn', lastName: 'Sweigart', phoneNumber: '(912) 658-3986', email: 'gsweig@hotmail.com' },
  { firstName: 'Sheilah', lastName: 'Szwedt', phoneNumber: '(985) 870-6458', email: 'szwedtsheilah9@gmail.com' },
  { firstName: 'Christopher', lastName: 'Teeple Hill', phoneNumber: '(912) 269-1988', email: 'thill@shupesurvey.com' },
  { firstName: 'Jonathan', lastName: 'Tennant', phoneNumber: '(912) 269-4973', email: 'jonathanktennant@gmail.com' },
  { firstName: 'Joe', lastName: 'Thigpen', phoneNumber: '(770) 639-4157', email: 'joethigpen@bellsouth.net' },
  { firstName: 'Joy', lastName: 'Tingle', phoneNumber: '(985) 688-6231', email: 'jtingle46@gmailcom' },
  { firstName: 'Michael', lastName: 'Tingle', phoneNumber: '(985) 852-0104', email: 'retiree44@gmail.com' },
  { firstName: 'Michael', lastName: 'True', phoneNumber: '(573) 586-7788', email: 'truemw185@gmail.com' },
  { firstName: 'William', lastName: 'Tucker', phoneNumber: '(912) 506-3546', email: 'william.tucker37@yahoo.com' },
  { firstName: 'Geary', lastName: 'Underwood', phoneNumber: '(796) 527-9727', email: 'gearyu@yahoo.com' },
  { firstName: 'Wendy', lastName: 'Vespa', phoneNumber: '(412) 965-2059', email: 'wvespa@gmail.com' },
  { firstName: 'Jessica', lastName: 'Walczak', phoneNumber: '(912) 230-2673', email: 'jessicawalczak0717@gmail.com' },
  { firstName: 'Thom', lastName: 'Ward', phoneNumber: '(706) 718-3699', email: 'ward.thom@outlook.com' },
  { firstName: 'Grant', lastName: 'Watkins', phoneNumber: '(912) 536-4987', email: 'gwatkins89@gmail.com' },
  { firstName: 'Stanley', lastName: 'Wertz', phoneNumber: '(419) 378-2503', email: 'stanley@thefaithresponders.org' },
  { firstName: 'Annie', lastName: 'Westbury', phoneNumber: '(251) 622-3799', email: 'anniewestbury811@gmail.com' },
  { firstName: 'Terry', lastName: 'Westbury', phoneNumber: '(229) 938-4601', email: 'ffted207@yahoo.com' },
  { firstName: 'Martha', lastName: 'Williams', phoneNumber: '(912) 269-4191', email: 'spooky79.mw@gmail.com' },
  { firstName: 'Mac', lastName: 'Wooldridge', phoneNumber: '(706) 464-0871', email: 'macdaddy1977@gmail.com' },
  { firstName: 'Tommy', lastName: 'Wright', phoneNumber: '(239) 254-0604', email: 'tewjr51@yahoo.com' },
  { firstName: 'Scott', lastName: 'Yarbrough', phoneNumber: '(229) 316-3824', email: 'smt6042@outlook.com' },
  { firstName: 'Bill', lastName: 'Yawn', phoneNumber: '(775) 240-5144', email: 'ybill5144@gmail.com' },
];

async function main() {
  const token = getAccessToken();

  // Deduplicate by lowercase email (first occurrence wins)
  const seen = new Set();
  const users = [];
  for (const u of RAW_USERS) {
    if (!u.email || u.email === 'noemail') continue;
    const key = u.email.toLowerCase().trim();
    if (seen.has(key)) {
      console.log(`Skipping duplicate email: ${key} (${u.firstName} ${u.lastName})`);
      continue;
    }
    seen.add(key);
    users.push({ ...u, email: key });
  }

  console.log(`Seeding ${users.length} pre-approved users...`);
  let count = 0;
  for (const user of users) {
    const docPath = `preApprovedUsers/${encodeURIComponent(user.email)}`;
    await firestoreSet(token, docPath, {
      firstName: user.firstName,
      lastName: user.lastName,
      phoneNumber: user.phoneNumber,
      email: user.email,
    });
    count++;
    if (count % 20 === 0) console.log(`  ${count}/${users.length}...`);
  }

  console.log(`Done. Seeded ${count} users.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
