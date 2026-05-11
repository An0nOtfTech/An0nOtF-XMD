// plugins/tools/fake.js
// Fake identity generator
// .fake         — random country identity
// .fake us      — specific country identity (name/code/alias)

module.exports = [

    {
        name: 'fake',
        category: 'tools',
        ownerOnly: false,
        description: 'Generate fake identity (.fake or .fake [country])',

        async func(m, sock, args) {
            const countryInput = args.join(' ').trim() || null;
            const identity = generateIdentity(countryInput);

            const text =
                `FAKE IDENTITY 🪪\n` +
                `━━━━━━━━━━━━━━━\n` +
                `「🌍」 𝗖𝗼𝘂𝗻𝘁𝗿𝘆  : ${identity.flag} ${identity.country}\n` +
                `「👤」 𝗡𝗮𝗺𝗲    : ${identity.name}\n` +
                `「⚧」 𝗚𝗲𝗻𝗱𝗲𝗿  : ${identity.gender}\n` +
                `「🎂」 𝗔𝗴𝗲     : ${identity.age}\n` +
                `「🌏」 𝗘𝘁𝗵𝗻𝗶𝗰 : ${identity.ethnicity}\n` +
                `━━━━━━━━━━━━━━━\n` +
                `「📍」 𝗔𝗱𝗱𝗿𝗲𝘀𝘀 : ${identity.address}\n` +
                `「📞」 𝗣𝗵𝗼𝗻𝗲   : ${identity.phone}\n` +
                `「📧」 𝗘𝗺𝗮𝗶𝗹   : ${identity.email}\n` +
                `━━━━━━━━━━━━━━━\n` +
                ` ╚━━━━━━「🅰️n0nOtF  𝐅𝐀𝐊𝐄R」━━━━━━╝`;

            // Send with profile picture
            try {
                const imgRes = await global.axios.get(identity.profilePic, {
                    responseType: 'arraybuffer', timeout: 8000
                });
                await sock.sendMessage(m.key.remoteJid, {
                    image: Buffer.from(imgRes.data),
                    caption: text
                }, { quoted: m });
            } catch (e) {
                // Fallback to text only if image fails
                await sock.sendMessage(m.key.remoteJid, { text }, { quoted: m });
            }
        }
    }

];

// ── Data ───────────────────────────────────────────────────────

const FLAGS = {
    'US':'🇺🇸','GB':'🇬🇧','CA':'🇨🇦','AU':'🇦🇺','DE':'🇩🇪','FR':'🇫🇷',
    'IT':'🇮🇹','ES':'🇪🇸','JP':'🇯🇵','CN':'🇨🇳','IN':'🇮🇳','BR':'🇧🇷',
    'RU':'🇷🇺','KR':'🇰🇷','MX':'🇲🇽','ZA':'🇿🇦','NG':'🇳🇬','KE':'🇰🇪',
    'EG':'🇪🇬','SA':'🇸🇦','AE':'🇦🇪','TR':'🇹🇷','NL':'🇳🇱','SE':'🇸🇪',
    'NO':'🇳🇴','DK':'🇩🇰','FI':'🇫🇮','PL':'🇵🇱','GR':'🇬🇷','PT':'🇵🇹',
    'AR':'🇦🇷','CL':'🇨🇱','CO':'🇨🇴','PE':'🇵🇪','VE':'🇻🇪','ID':'🇮🇩',
    'MY':'🇲🇾','TH':'🇹🇭','VN':'🇻🇳','PH':'🇵🇭','SG':'🇸🇬','PK':'🇵🇰',
    'BD':'🇧🇩','LK':'🇱🇰','NP':'🇳🇵','IR':'🇮🇷','IQ':'🇮🇶','MA':'🇲🇦',
    'DZ':'🇩🇿','GH':'🇬🇭','ET':'🇪🇹','TZ':'🇹🇿','UG':'🇺🇬','SN':'🇸🇳',
};

const COUNTRY_NAMES = {
    'US':'United States','GB':'United Kingdom','CA':'Canada','AU':'Australia',
    'DE':'Germany','FR':'France','IT':'Italy','ES':'Spain','JP':'Japan',
    'CN':'China','IN':'India','BR':'Brazil','RU':'Russia','KR':'South Korea',
    'MX':'Mexico','ZA':'South Africa','NG':'Nigeria','KE':'Kenya','EG':'Egypt',
    'SA':'Saudi Arabia','AE':'United Arab Emirates','TR':'Turkey','NL':'Netherlands',
    'SE':'Sweden','NO':'Norway','DK':'Denmark','FI':'Finland','PL':'Poland',
    'GR':'Greece','PT':'Portugal','AR':'Argentina','CL':'Chile','CO':'Colombia',
    'PE':'Peru','VE':'Venezuela','ID':'Indonesia','MY':'Malaysia','TH':'Thailand',
    'VN':'Vietnam','PH':'Philippines','SG':'Singapore','PK':'Pakistan',
    'BD':'Bangladesh','LK':'Sri Lanka','NP':'Nepal','IR':'Iran','IQ':'Iraq',
    'MA':'Morocco','DZ':'Algeria','GH':'Ghana','ET':'Ethiopia','TZ':'Tanzania',
    'UG':'Uganda','SN':'Senegal',
};

const ALIASES = {
    'USA':'US','UNITED STATES':'US','AMERICA':'US',
    'UK':'GB','UNITED KINGDOM':'GB','BRITAIN':'GB','ENGLAND':'GB',
    'UAE':'AE','UNITED ARAB EMIRATES':'AE',
    'KSA':'SA','SAUDI':'SA','SAUDI ARABIA':'SA',
    'SOUTH KOREA':'KR','KOREA':'KR',
    'RUSSIA':'RU','CHINA':'CN','JAPAN':'JP','INDIA':'IN','BRAZIL':'BR',
    'NIGERIA':'NG','KENYA':'KE','SOUTH AFRICA':'ZA','GERMANY':'DE',
    'FRANCE':'FR','ITALY':'IT','SPAIN':'ES','PORTUGAL':'PT',
    'NETHERLANDS':'NL','SWEDEN':'SE','NORWAY':'NO','DENMARK':'DK',
    'FINLAND':'FI','POLAND':'PL','GREECE':'GR','TURKEY':'TR','EGYPT':'EG',
    'MEXICO':'MX','ARGENTINA':'AR','COLOMBIA':'CO','PERU':'PE','CHILE':'CL',
    'VENEZUELA':'VE','INDONESIA':'ID','MALAYSIA':'MY','THAILAND':'TH',
    'VIETNAM':'VN','PHILIPPINES':'PH','SINGAPORE':'SG','PAKISTAN':'PK',
    'BANGLADESH':'BD','SRI LANKA':'LK','NEPAL':'NP','IRAN':'IR','IRAQ':'IQ',
    'MOROCCO':'MA','ALGERIA':'DZ','GHANA':'GH','ETHIOPIA':'ET','TANZANIA':'TZ',
    'UGANDA':'UG','SENEGAL':'SN','CANADA':'CA','AUSTRALIA':'AU',
};

const ETHNICITY_MAP = {
    'US':'Caucasian','GB':'Caucasian','CA':'Caucasian','AU':'Caucasian',
    'DE':'Caucasian','FR':'Caucasian','IT':'Caucasian','ES':'Caucasian',
    'PT':'Caucasian','NL':'Caucasian','SE':'Caucasian','NO':'Caucasian',
    'DK':'Caucasian','FI':'Caucasian','PL':'Caucasian','GR':'Caucasian',
    'RU':'Caucasian','IN':'South Asian','PK':'South Asian','BD':'South Asian',
    'LK':'South Asian','NP':'South Asian',
    'CN':'East Asian','JP':'East Asian','KR':'East Asian','VN':'East Asian',
    'TH':'East Asian','ID':'East Asian','MY':'East Asian','PH':'East Asian',
    'NG':'African','KE':'African','ZA':'African','EG':'African',
    'GH':'African','ET':'African','TZ':'African','UG':'African','SN':'African',
    'SA':'Middle Eastern','AE':'Middle Eastern','TR':'Middle Eastern',
    'IR':'Middle Eastern','IQ':'Middle Eastern',
    'BR':'Latin','MX':'Latin','AR':'Latin','CO':'Latin',
    'PE':'Latin','VE':'Latin','CL':'Latin',
};

const COUNTRY_ETHNICITY = {
    'NG':'african','KE':'african','ZA':'african','GH':'african','EG':'african',
    'ET':'african','TZ':'african','UG':'african','SN':'african',
    'CN':'asian','JP':'asian','KR':'asian','VN':'asian',
    'TH':'asian','ID':'asian','MY':'asian','PH':'asian',
    'IN':'south_asian','PK':'south_asian','BD':'south_asian',
    'LK':'south_asian','NP':'south_asian',
    'SA':'middle_eastern','AE':'middle_eastern','IR':'middle_eastern',
    'IQ':'middle_eastern','TR':'middle_eastern',
    'US':'european','GB':'european','CA':'european','AU':'european',
    'DE':'european','FR':'european','IT':'european','ES':'european',
    'BR':'latin','MX':'latin','AR':'latin','CO':'latin',
    'PE':'latin','VE':'latin','CL':'latin',
};

const PROFILE_PICTURES = {
    african_male: [
        'https://images.unsplash.com/photo-1564564321837-a57b7070ac4f?w=400&h=400&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1544725176-7c40e5a71c5e?w=400&h=400&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1534308143481-c55f00be8bd7?w=400&h=400&fit=crop&crop=face',
    ],
    african_female: [
        'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=400&h=400&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=400&h=400&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1545912452-8aea7e25a3d3?w=400&h=400&fit=crop&crop=face',
    ],
    asian_male: [
        'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&h=400&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=400&h=400&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&h=400&fit=crop&crop=face',
    ],
    asian_female: [
        'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&h=400&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&h=400&fit=crop&crop=face',
    ],
    european_male: [
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=400&h=400&fit=crop&crop=face',
    ],
    european_female: [
        'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400&h=400&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1534751516642-a1af1ef26a56?w=400&h=400&fit=crop&crop=face',
    ],
    middle_eastern_male: [
        'https://images.unsplash.com/photo-1522529599102-193c0d76b5b6?w=400&h=400&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=400&h=400&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&h=400&fit=crop&crop=face',
    ],
    middle_eastern_female: [
        'https://images.unsplash.com/photo-1554151228-14d9def656e4?w=400&h=400&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?w=400&h=400&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&h=400&fit=crop&crop=face',
    ],
    south_asian_male: [
        'https://images.unsplash.com/photo-1545167622-3a6d756cdd44?w=400&h=400&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1564564321837-a57b7070ac4f?w=400&h=400&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face',
    ],
    south_asian_female: [
        'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&h=400&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&h=400&fit=crop&crop=face',
    ],
    latin_male: [
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1564564321837-a57b7070ac4f?w=400&h=400&fit=crop&crop=face',
    ],
    latin_female: [
        'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400&h=400&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1534751516642-a1af1ef26a56?w=400&h=400&fit=crop&crop=face',
    ],
};

const NAMES = {
    NG_male:   ['Chinedu','Emeka','Oluwatobi','Adebayo','Chukwuemeka','Obinna','Ifeanyi','Segun','Femi','Kunle','Adewale','Babajide','Chidi','Ebuka','Folarin','Gbenga','Ikenna'],
    NG_female: ['Chiamaka','Nneka','Oluwaseun','Aisha','Fatima','Zainab','Amina','Halima','Mariam','Rahma','Adanna','Bukola','Chioma','Ebele','Folake','Ifunanya','Kemi'],
    NG_last:   ['Adeyemi','Okafor','Balogun','Eze','Ogunleye','Nwachukwu','Okoro','Ibe','Uche','Obi','Adewumi','Bello','Chukwu','Ezeudu','Okonkwo','Oladipo'],
    KE_male:   ['John','David','James','Michael','Joseph','William','Robert','Peter','Paul','Daniel','Stephen','Simon','Thomas','Charles','Martin','Kevin'],
    KE_female: ['Mary','Elizabeth','Susan','Margaret','Grace','Faith','Mercy','Joy','Ann','Sarah','Jane','Lucy','Rose','Catherine','Esther','Ruth'],
    KE_last:   ['Mwangi','Maina','Kamau','Kipchoge','Ochieng','Auma','Akinyi','Atieno','Adhiambo','Nyong','Omondi','Kariuki','Korir','Njeru','Wambui','Njeri'],
    IN_male:   ['Aarav','Vihaan','Arjun','Reyansh','Mohammed','Sai','Aryan','Advik','Dhruv','Kabir','Rohan','Raj','Amit','Vikram','Sanjay','Rahul'],
    IN_female: ['Aadhya','Saanvi','Ananya','Pari','Diya','Aarya','Ira','Anika','Myra','Sara','Priya','Neha','Kavita','Shreya','Pooja','Meera'],
    IN_last:   ['Sharma','Kumar','Singh','Patel','Reddy','Gupta','Mehta','Verma','Jain','Malhotra','Chopra','Desai','Nair','Menon','Pillai','Iyengar'],
    PK_male:   ['Mohammed','Ahmed','Ali','Hassan','Hussain','Omar','Bilal','Usman','Abdullah','Ibrahim','Farhan','Kamran','Salman','Zubair','Tariq','Asif'],
    PK_female: ['Fatima','Aisha','Zainab','Maryam','Khadija','Hafsa','Sana','Ayesha','Sadia','Nadia','Bushra','Hina','Mehwish','Rabia','Saima','Zara'],
    PK_last:   ['Khan','Ali','Ahmed','Hussain','Shah','Malik','Raza','Baig','Chaudhry','Sheikh','Mirza','Qureshi','Ansari','Gilani','Javed','Siddiqui'],
    US_male:   ['James','John','Robert','Michael','William','David','Richard','Joseph','Thomas','Charles','Christopher','Daniel','Matthew','Anthony','Donald','Mark'],
    US_female: ['Mary','Patricia','Jennifer','Linda','Barbara','Elizabeth','Susan','Jessica','Sarah','Karen','Lisa','Nancy','Betty','Margaret','Sandra','Ashley'],
    US_last:   ['Smith','Johnson','Williams','Brown','Jones','Garcia','Miller','Davis','Rodriguez','Martinez','Hernandez','Lopez','Gonzalez','Wilson','Anderson','Taylor'],
    GB_male:   ['Oliver','Harry','Jack','George','Noah','Charlie','Jacob','Alfie','Freddie','Oscar','William','Henry','Leo','Theo','Archie','James'],
    GB_female: ['Olivia','Amelia','Isla','Ava','Emily','Sophia','Grace','Lily','Freya','Poppy','Ella','Isabella','Charlotte','Mia','Evie','Sienna'],
    GB_last:   ['Smith','Jones','Williams','Taylor','Brown','Davies','Evans','Wilson','Thomas','Roberts','Johnson','Robinson','Thompson','White','Walker','Harris'],
    DE_male:   ['Luca','Paul','Felix','Jonas','Leon','Lukas','Finn','Elias','Noah','Maximilian','Niklas','Ben','Julian','Jan','Fabian','Moritz'],
    DE_female: ['Emma','Hannah','Mia','Lena','Lea','Leonie','Laura','Anna','Sara','Lina','Marie','Lara','Julia','Clara','Sophie','Lisa'],
    DE_last:   ['Müller','Schmidt','Schneider','Fischer','Weber','Meyer','Wagner','Becker','Schulz','Hoffmann','Koch','Bauer','Richter','Klein','Wolf','Schröder'],
    FR_male:   ['Gabriel','Lucas','Raphaël','Léo','Louis','Hugo','Tom','Noah','Théo','Mathis','Enzo','Nathan','Baptiste','Pierre','Clément','Alexandre'],
    FR_female: ['Emma','Jade','Louise','Alice','Chloé','Lina','Inès','Léa','Manon','Lucie','Clara','Zoé','Eva','Camille','Mathilde','Juliette'],
    FR_last:   ['Martin','Bernard','Thomas','Petit','Robert','Richard','Durand','Dubois','Moreau','Laurent','Simon','Michel','Lefebvre','Leroy','Roux','David'],
    SA_male:   ['Mohammed','Abdullah','Ahmed','Ali','Khalid','Omar','Hassan','Ibrahim','Yousef','Saad','Faisal','Majed','Turki','Fahad','Nasser','Sultan'],
    SA_female: ['Fatima','Aisha','Maryam','Noura','Sara','Hessa','Reem','Lama','Dina','Nada','Hind','Ghada','Wafa','Raneem','Arwa','Rawan'],
    SA_last:   ['Al-Ghamdi','Al-Harbi','Al-Shehri','Al-Qahtani','Al-Zahrani','Al-Otaibi','Al-Dosari','Al-Anazi','Al-Shahrani','Al-Khaldi'],
    JP_male:   ['Haruto','Yuto','Sota','Yuki','Hayato','Kota','Ren','Kaito','Shun','Yuma','Ryota','Taisei','Daiki','Sho','Tomoki','Naoto'],
    JP_female: ['Yui','Aoi','Hina','Rin','Mia','Sakura','Akari','Riko','Nana','Haruka','Yuna','Misaki','Nanami','Koharu','Saki','Ayaka'],
    JP_last:   ['Sato','Suzuki','Tanaka','Watanabe','Ito','Yamamoto','Nakamura','Hayashi','Kobayashi','Kato','Yoshida','Yamada','Sasaki','Matsumoto','Inoue','Kimura'],
    CN_male:   ['Wei','Fang','Jian','Ming','Lei','Hao','Yang','Bo','Tao','Jun','Kai','Long','Hui','Peng','Cheng','Xin'],
    CN_female: ['Fang','Ying','Li','Na','Xia','Jing','Mei','Hui','Lan','Yan','Qing','Hong','Juan','Xiu','Fen','Ping'],
    CN_last:   ['Wang','Li','Zhang','Liu','Chen','Yang','Huang','Zhao','Wu','Zhou','Xu','Sun','Ma','Zhu','Hu','Guo'],
    BR_male:   ['Miguel','Arthur','Heitor','Bernardo','Samuel','Pedro','Gabriel','Lorenzo','Nicolas','Davi','Lucas','Mateus','Rafael','Felipe','Guilherme','Thiago'],
    BR_female: ['Sofia','Alice','Laura','Isabella','Valentina','Heloísa','Luisa','Giovanna','Manuela','Beatriz','Ana','Júlia','Mariana','Livia','Camila','Larissa'],
    BR_last:   ['Silva','Santos','Oliveira','Souza','Rodrigues','Ferreira','Alves','Pereira','Lima','Gomes','Costa','Ribeiro','Martins','Carvalho','Almeida','Lopes'],
    MX_male:   ['Santiago','Mateo','Sebastián','Nicolás','Alejandro','Diego','Andrés','Samuel','Daniel','Carlos','Luis','Jorge','Mario','Antonio','Fernando','Rodrigo'],
    MX_female: ['Sofía','Isabella','Valentina','Camila','Valeria','Fernanda','María','Daniela','Paulina','Gabriela','Andrea','Alejandra','Karla','Mariana','Natalia','Lucia'],
    MX_last:   ['González','Rodríguez','Martínez','García','López','Hernández','Pérez','Sánchez','Ramírez','Torres','Flores','Jiménez','Morales','Reyes','Gutiérrez','Cruz'],
    RU_male:   ['Aleksandr','Dmitry','Maxim','Ivan','Sergey','Andrey','Alexey','Mikhail','Pavel','Nikolay','Vladimir','Artem','Roman','Evgeny','Kirill','Anton'],
    RU_female: ['Anna','Maria','Elena','Natalia','Tatiana','Olga','Svetlana','Irina','Oksana','Yuliya','Anastasia','Ekaterina','Alina','Viktoria','Daria','Lyudmila'],
    RU_last:   ['Ivanov','Smirnov','Kuznetsov','Popov','Vasilyev','Petrov','Sokolov','Mikhaylov','Novikov','Fedorov','Morozov','Volkov','Alekseyev','Lebedev','Semyonov','Egorov'],
    KR_male:   ['Minjun','Seonjun','Jiho','Junho','Hyunwoo','Donghyun','Jaemin','Taehyung','Jungkook','Yoongi','Namjoon','Seokjin','Hoseok','Sanghyun','Kyunghoon','Jiyong'],
    KR_female: ['Jiyeon','Minjung','Soyeon','Hyunjin','Chaewon','Jisoo','Jennie','Rosé','Lisa','Yeri','Irene','Seulgi','Wendy','Joy','Tzuyu','Sana'],
    KR_last:   ['Kim','Lee','Park','Choi','Jung','Kang','Cho','Yoon','Jang','Lim','Han','Oh','Seo','Shin','Kwon','Song'],
    ZA_male:   ['Sipho','Themba','Bongani','Lungelo','Sandile','Nkosinathi','Mthokozisi','Siyabonga','Dumisani','Lindani','Zakhele','Mduduzi','Musa','Sibusiso','Khulekani','Mfanafuthi'],
    ZA_female: ['Nomsa','Thandi','Zanele','Nokwanda','Lungisa','Nompumelelo','Ayanda','Nomvula','Sindisiwe','Zinhle','Lindiwe','Bongiwe','Nokukhanya','Nonhlanhla','Siphokazi','Ntombi'],
    ZA_last:   ['Dlamini','Nkosi','Zulu','Ndlovu','Khumalo','Mthembu','Mkhize','Ntanzi','Nxumalo','Zwane','Ngubane','Shabalala','Cele','Mthethwa','Hadebe','Mhlongo'],
    AU_male:   ['Oliver','Jack','William','Thomas','James','Liam','Lucas','Noah','Henry','Charlie','Mason','Ethan','Alexander','Benjamin','Samuel','Lachlan'],
    AU_female: ['Charlotte','Olivia','Ava','Isla','Mia','Amelia','Zoe','Sophie','Chloe','Harper','Grace','Matilda','Emily','Ruby','Ella','Lily'],
    AU_last:   ['Smith','Jones','Williams','Brown','Taylor','Johnson','White','Martin','Anderson','Thompson','Harris','Robinson','Jackson','Davis','Wilson','Clark'],
    AR_male:   ['Santiago','Mateo','Benjamín','Facundo','Agustín','Nicolás','Tomás','Lucas','Felipe','Ignacio','Rodrigo','Manuel','Joaquín','Valentín','Sebastián','Marcos'],
    AR_female: ['Valentina','Sofía','Camila','Isabella','Martina','Luciana','Florencia','Catalina','Agustina','Valeria','María','Julieta','Natalia','Paula','Josefina','Rocío'],
    AR_last:   ['González','Rodríguez','Gómez','Fernández','López','Martínez','Díaz','Pérez','García','Sánchez','Romero','Sosa','Torres','Álvarez','Ruiz','Ramírez'],
    DEFAULT_male:   ['Alex','Jordan','Sam','Chris','Taylor','Morgan','Riley','Casey','Jamie','Drew'],
    DEFAULT_female: ['Alex','Jordan','Sam','Taylor','Morgan','Riley','Casey','Jamie','Drew','Avery'],
    DEFAULT_last:   ['Smith','Johnson','Williams','Brown','Jones','Davis','Miller','Wilson','Moore','Taylor'],
};

const PHONE_FORMATS = {
    'US': (r) => `+1 (${r(3)}) ${r(3)}-${r(4)}`,
    'GB': (r) => `+44 7${r(3)} ${r(6)}`,
    'CA': (r) => `+1 (${r(3)}) ${r(3)}-${r(4)}`,
    'AU': (r) => `+61 4${r(2)} ${r(3)} ${r(3)}`,
    'DE': (r) => `+49 ${r(3)} ${r(7)}`,
    'FR': (r) => `+33 ${r(1)} ${r(2)} ${r(2)} ${r(2)} ${r(2)}`,
    'IT': (r) => `+39 ${r(3)} ${r(7)}`,
    'ES': (r) => `+34 ${r(3)} ${r(3)} ${r(3)}`,
    'JP': (r) => `+81 ${r(2)}-${r(4)}-${r(4)}`,
    'CN': (r) => `+86 ${r(3)} ${r(4)} ${r(4)}`,
    'IN': (r) => `+91 ${r(5)} ${r(5)}`,
    'BR': (r) => `+55 (${r(2)}) 9${r(4)}-${r(4)}`,
    'RU': (r) => `+7 (${r(3)}) ${r(3)}-${r(2)}-${r(2)}`,
    'KR': (r) => `+82 10-${r(4)}-${r(4)}`,
    'MX': (r) => `+52 ${r(3)} ${r(3)} ${r(4)}`,
    'ZA': (r) => `+27 ${r(2)} ${r(3)} ${r(4)}`,
    'NG': (r) => `+234 ${r(3)} ${r(3)} ${r(4)}`,
    'KE': (r) => `+254 7${r(2)} ${r(3)} ${r(3)}`,
    'EG': (r) => `+20 1${r(1)} ${r(4)} ${r(4)}`,
    'SA': (r) => `+966 5${r(1)} ${r(3)} ${r(4)}`,
    'AE': (r) => `+971 5${r(1)} ${r(3)} ${r(4)}`,
    'TR': (r) => `+90 5${r(2)} ${r(3)} ${r(4)}`,
    'PK': (r) => `+92 3${r(2)} ${r(7)}`,
    'BD': (r) => `+880 1${r(9)}`,
    'IN': (r) => `+91 ${r(5)} ${r(5)}`,
    'ID': (r) => `+62 8${r(2)}-${r(4)}-${r(4)}`,
    'PH': (r) => `+63 9${r(2)} ${r(3)} ${r(4)}`,
    'VN': (r) => `+84 9${r(1)} ${r(3)} ${r(4)}`,
    'TH': (r) => `+66 8${r(1)} ${r(3)} ${r(4)}`,
    'MY': (r) => `+60 1${r(1)}-${r(3)} ${r(4)}`,
    'SG': (r) => `+65 ${r(4)} ${r(4)}`,
    'NL': (r) => `+31 6 ${r(8)}`,
    'SE': (r) => `+46 7${r(1)}-${r(3)} ${r(4)}`,
    'NO': (r) => `+47 ${r(3)} ${r(2)} ${r(3)}`,
    'DK': (r) => `+45 ${r(2)} ${r(2)} ${r(2)} ${r(2)}`,
    'FI': (r) => `+358 5${r(1)} ${r(7)}`,
    'PL': (r) => `+48 ${r(3)} ${r(3)} ${r(3)}`,
    'GR': (r) => `+30 69${r(8)}`,
    'PT': (r) => `+351 9${r(1)} ${r(3)} ${r(4)}`,
    'AR': (r) => `+54 9 11 ${r(4)}-${r(4)}`,
    'CL': (r) => `+56 9 ${r(4)} ${r(4)}`,
    'CO': (r) => `+57 3${r(2)} ${r(7)}`,
    'PE': (r) => `+51 9${r(8)}`,
    'VE': (r) => `+58 4${r(2)}-${r(7)}`,
};

const ADDRESSES = {
    US: ['123 Oak Street, New York, NY 10001','456 Maple Ave, Los Angeles, CA 90001','789 Pine Road, Chicago, IL 60601','321 Elm St, Houston, TX 77001','654 Cedar Blvd, Phoenix, AZ 85001'],
    GB: ['12 Baker Street, London W1U 3BH','45 Victoria Road, Manchester M1 3HF','78 Church Lane, Birmingham B1 1AB','23 High Street, Edinburgh EH1 1YZ','56 Kings Road, Bristol BS1 4ND'],
    CA: ['100 King Street W, Toronto, ON M5X 1A1','200 Robson Street, Vancouver, BC V6B 1A1','300 Portage Ave, Winnipeg, MB R3B 2B2','400 Jasper Ave, Edmonton, AB T5J 1S9','500 Rue Sainte-Catherine, Montreal, QC H3B 1A1'],
    AU: ['42 George Street, Sydney NSW 2000','88 Collins Street, Melbourne VIC 3000','15 Queen Street, Brisbane QLD 4000','27 King Street, Perth WA 6000','3 Rundle Mall, Adelaide SA 5000'],
    DE: ['Hauptstraße 12, 10115 Berlin','Königstraße 45, 70173 Stuttgart','Marienplatz 8, 80331 München','Zeil 106, 60313 Frankfurt','Mönckebergstraße 3, 20095 Hamburg'],
    FR: ['15 Rue de Rivoli, 75001 Paris','32 Rue Victor Hugo, 69002 Lyon','8 Rue Paradis, 13001 Marseille','21 Rue Nationale, 31000 Toulouse','5 Place de la République, 67000 Strasbourg'],
    IN: ['12 MG Road, Bangalore 560001','45 Park Street, Kolkata 700016','78 Linking Road, Mumbai 400054','23 Connaught Place, New Delhi 110001','56 Anna Salai, Chennai 600002'],
    NG: ['14 Awolowo Road, Ikoyi, Lagos','27 Independence Avenue, Garki, Abuja','5 Nnamdi Azikiwe Street, Port Harcourt','89 Yakubu Gowon Way, Kano','33 Lagos Road, Ibadan'],
    KE: ['12 Kenyatta Avenue, Nairobi 00100','45 Moi Avenue, Mombasa 80100','7 Oginga Odinga Street, Kisumu 40100','23 Kimathi Street, Nakuru 20100','56 Kenyatta Highway, Eldoret 30100'],
    JP: ['1-2-3 Shinjuku, Tokyo 160-0022','4-5-6 Namba, Osaka 542-0076','7-8-9 Sakae, Nagoya 460-0008','2-3-4 Tenjin, Fukuoka 810-0001','5-6-7 Susukino, Sapporo 060-0061'],
    CN: ['123 Nanjing Road, Shanghai 200001','456 Wangfujing Dajie, Beijing 100006','789 Zhongshan Road, Guangzhou 510030','321 Jiefang Road, Shenzhen 518001','654 Renmin Road, Chengdu 610015'],
    BR: ['Av. Paulista 1000, São Paulo SP 01310-100','Rua das Flores 500, Rio de Janeiro RJ 20040-020','Av. Brasil 200, Brasília DF 70070-000','Rua do Comércio 300, Salvador BA 40015-130','Av. Boa Viagem 400, Recife PE 51011-000'],
    SA: ['King Fahd Road, Riyadh 11564','Tahlia Street, Jeddah 21433','Prince Mohammed Bin Fahd Road, Dammam 32254','Al Madinah Al Munawwarah Road, Mecca 24231','King Khalid Road, Medina 42311'],
    DEFAULT: ['123 Main Street, City Center 10001','456 Central Avenue, Downtown 20002','789 Park Road, Uptown 30003','321 River Lane, Westside 40004','654 Hill Drive, Eastside 50005'],
};

// ── Generator ──────────────────────────────────────────────────

function rand(n) {
    // Returns n random digits as string
    return Array.from({length: n}, () => Math.floor(Math.random() * 10)).join('');
}

function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function resolveCountry(input) {
    if (!input) {
        const codes = Object.keys(COUNTRY_NAMES);
        const code = pick(codes);
        return { code, name: COUNTRY_NAMES[code], flag: FLAGS[code] || '🏳️' };
    }
    const up = input.toUpperCase().trim();
    const code = ALIASES[up] || (COUNTRY_NAMES[up] ? up : null);
    if (code) return { code, name: COUNTRY_NAMES[code], flag: FLAGS[code] || '🏳️' };
    // Try partial match on country names
    for (const [c, name] of Object.entries(COUNTRY_NAMES)) {
        if (name.toUpperCase().includes(up)) return { code: c, name, flag: FLAGS[c] || '🏳️' };
    }
    return { code: 'US', name: 'United States', flag: '🇺🇸' };
}

function generateName(code, gender) {
    const g = gender === 'Male' ? 'male' : 'female';
    const firstArr = NAMES[`${code}_${g}`] || NAMES[`DEFAULT_${g}`];
    const lastArr  = NAMES[`${code}_last`] || NAMES['DEFAULT_last'];
    const first = pick(firstArr);
    const last  = pick(lastArr);
    // East Asian: last name first
    const full = ['CN','JP','KR'].includes(code) ? `${last} ${first}` : `${first} ${last}`;
    return { full, first, last };
}

function generatePhone(code) {
    const fmt = PHONE_FORMATS[code];
    if (fmt) return fmt(rand);
    return `+${Math.floor(Math.random()*99)+1} ${rand(3)} ${rand(3)} ${rand(4)}`;
}

function getAddress(code) {
    const arr = ADDRESSES[code] || ADDRESSES.DEFAULT;
    return pick(arr);
}

function getProfilePic(code, gender) {
    const ethnicity = COUNTRY_ETHNICITY[code] || 'european';
    const g = gender === 'Male' ? 'male' : 'female';
    const key = `${ethnicity}_${g}`;
    const pics = PROFILE_PICTURES[key] || PROFILE_PICTURES['european_male'];
    return pick(pics);
}

function generateIdentity(countryInput) {
    const country = resolveCountry(countryInput);
    const gender  = Math.random() < 0.5 ? 'Male' : 'Female';
    const age     = Math.floor(Math.random() * 48) + 18; // 18-65
    const { full, first, last } = generateName(country.code, gender);
    const phone   = generatePhone(country.code);
    const address = getAddress(country.code);
    const email   = `${first.toLowerCase().replace(/\s/g,'')}.${last.toLowerCase().replace(/\s/g,'')}${Math.floor(Math.random()*90)+10}@gmail.com`;
    const ethnicity = ETHNICITY_MAP[country.code] || 'Multiracial';
    const profilePic = getProfilePic(country.code, gender);

    return { country: country.name, flag: country.flag, name: full, gender, age, address, phone, email, ethnicity, profilePic };
}
