function parseEmoji(target){
    var f = /**Smileys**/ ['\(:3\)',':[)]', '\(:[pP]\)', '\(;[pP]\)', '\(X[Pp]\)', '\(:[(]\)', '\([/]:[(]\)', '\(:\'[(]\)', '\(:D[Xx]:\)', '\(:[|]\)',
    '\(:\'\'[(][)]\)', '\(:[Oo]\)', '\(\/:[Oo]\)', ':cathappy:', ':catlove:',  ':catnaughty:', ':catsmooch:', ':catgrumpy:', ':catsad:', ':angry:', ':angryred:',
    '\(:\'[Oo]\)',   '\(:[Xx][(]:\)',  ':pfft:', ':animesweat:', '\(:[(]2]\)',   ':what:', ':whatblue:', ':despair:', ':worried:', ':munch:', '\(:[xX][Oo]:\)',
    ':embarrassed:', ':zzz:', '\(:[Xx][oO][oO]:\)', '\(:[.]:\)',  ':sick:', ':cattoothy:', ':cattoothycry:', ':catmunch:', ':jolly:', ':winktongue:', ':peaceful:', ':loveeyes:',
    ':cool:', ':quinnface:', '\(:[)]2\)',  '\(:[|]2\)', '\(:\'\'[Dd]\)', '\([=][)]\)', '\(:[Dd]\)', '\(:\'[dD]2]\)', '\(:[Xx][Dd]2\)', '\([Oo]:[)]\)',
    ':devil:', '\(;[)]\)', '\(:[|]3\)', '\(:[|]4\)', ':unimpressed:',  ':stressed:', ':sorrow:', ':hmm:', '\(:[Xx][Zz]:\)', '\(:32\)',
    '\(:3heart\)', '\(:3alt\)',
/** '\(:[Dd]2\)' No regular D, replaced :D2 with :D regexp**/
    ':lightning:', ':star:', ':suncloud:', ':fountain:', ':snowman:', ':yacht:', ':camping:', ':recycle:', ':sun:', ':cloud:',':umbrella:',':snowflake:',
    ':lightbeam:', ':waterdrops:', ':waterdrop:', ':shootstar:' , ':cloudpuff:' ,':tsunami:', ':volcano:', ':constellation:', ':worldafrica:', ':worldamerica:',
    ':worldasia:', ':darkmoon:', ':moonright:', ':moonleft:', ':fullmoon:', ':fullsun:', ':shiningstar:', ':hibiscus:', ':sunflower:', ':daisy:', ':corncob:',
    ':wheat:', ':branch:', ':orange:', ':lemon:', ':banana:', ':pineapple:', ':applered:', ':grannysmith:' , ':crocodile:', ':whale:', ':snail:', ':horse:',
    ':ram:',  ':shell:',  ':caterpillar:',  ':ant:',  ':ladybug:',  ':fish:',  ':camel:',  ':dolphin:',  ':cowface:',  ':tigerface:',  ':wolfface:',  ':bearface:',
    ':pandaface:', ':paws:',
    ':rice:', ':curry:', ':ramen:', ':spaghetti:' , ':bread:', ':chips:', ':chocchip:', ':chocolate:', ':sweets:', ':lollypop:', ':pudding:', ':honey:', ':beer1:',
    ':beer2:', ':milk:', ':cloudyday:', ':umbrella2:', ':starrynight:', ':sunsethill:', ':sunsetsea:', ':sunsetcity:', ':sunsetcitystrong:', ':rainbowsky:',
    ':bridgenight:', ':globenetwork:', ':mooncycle0:', ':mooncycle1:', ':mooncycle2:', ':mooncycle3:', ':mooncycle4:', ':mooncycle5:', ':mooncycle6:',
    ':mooncycle7:', ':mooncycle8:', ':shootstar2:', ':chestnut:', ':sprout:',  ':pine:', ':tree:', ':palm:', ':cactus:', ':tulip:', ':sakura:', ':tulipred:',
    ':clover:', ':autumnleaf:', ':fallleaf:', ':toadstool:', ':tomato:', ':aubergine:', ':grape:', ':melon:', ':watermelon:', ':pear:', ':peach:', ':cherry:',
    ':strawberry:', ':burger:', ':pizza:', ':meatstick:', ':chickenleg:', ':riceballbr:', ':riceballw:', ':sweetpotato:', ':dango:', ':skewer:', ':sushi:',
    ':prawn:', ':naruto:', ':icecream:', ':shavedice:',':sundae:', ':doughnut:', ':cake:' , ':bento:', ':gyudon:', ':friedegg:', ':cutlery:', ':greentea:',
    ':flask:', ':redwine:', ':cocktail1:', ':cocktail2:', ':bdaycake:', ':heartshake:', ':heartbreak:', ':doubleheart:', ':heartsparkle:', ':heartgrow:',
    ':heartarrow:', ':heartblue:', ':heartgreen:', ':heartyellow:', ':heartpurple:', ':heartbow:', ':heartspin:', ':heartbox:',':arrowtwist:', ':arrowrotate:',
    ':arrowrotate1:', ':arrowrotate2:', ':clock:', ':hourglass:', ':roundm:', ':arrowboxright:', ':arrowboxleft:',':attention:', ':stop:', ':boxpointleft:',
    ':boxpointup:', ':boxpointdown:', ':redcircle:', ':curvearrowleft:', ':curvearrowright:', ':hash:', ':doublearrowright:', ':doublearrowleft:',
    ':doublearrowup:', ':doublearrowdown:', ':boxpointright:', ':blloop:', ':loopbox:', ':zero:', ':one:', ':two:', ':three:', ':four:', ':five:', ':six:',
    ':seven:', ':eight:', ':nine:', ':\!\!:', ':watch:', ':hourglass2:', ':telephone:', ':pointup:', ':gemini:', ':cancer:', ':leo:', ':virgo:', ':libra:',
    ':scorpio:', ':wheelchair:', ':fist:', ':wave:', ':peacesign:',':pencil:', ':redcross:', ':greencross:', ':graph:', ':\!q:', ':tm:', ':info:',
    ':leftrightarrow:', ':updownarrow:', ':nwarrow:', ':nearrow:', ':searrow:', ':swarrow:', ':tick:', ':aires:', ':taurus:', ':sagittarius:', ':capricorn:',
    ':aquarius:', ':pisces:', ':spade:', ':club:', ':heart2:', ':diamond2:', ':hot:', ':anchor:', ':scissor:', ':greentick:', ':envelope:', ':pen:', ':btick:',
    ':bcross:', ':sparkle:', ':purplestar:', ':blackstar:', ':rq:', ':gq:', ':g\!:', ':r\!:', ':heart:', ':bplus:', ':bminus:', ':bdiv:', ':china:', ':germany:',
    ':spain:', ':france:', ':uk:', ':italy:', ':japan:', ':skorea:', ':russia:', ':usa:', ':fishing:', ':karaoke:', ':film:', ':filmcube:', ':musicheadphone:',
    ':palette:', ':ticket:', ':clapperboard:', ':tragedycomedy:', ':gaming:', ':lucky7:', ':8ball:', ':dice:', ':tenpin:', ':cards:', ':note:', ':notes:',
    ':saxophone:', ':guitar:', ':keyboard:', ':trumpet:', ':violin:', ':musicsheet:', ':trophy:', ':merrygoround:',':ferriswheel:', ':rollercoaster:', ':tophat:',
    ':circus:', ':tennisball:', ':skis:', ':basketball:', ':finishflag:', ':snowboard:', ':walk:', ':surf:', ':horserace:', ':rugby:', ':rugby2:', ':swim:',
    ':lightbulb:', ':angrymark:', ':bomb:', ':zzz2:', ':explosion:', ':poo:', ':strong:', ':speechbubble:', ':moneybag:', ':currency:', ':gdollar:', ':ccard:',
    ':yen:', ':dollar:', ':euro:', ':pound:', ':dollarwing:', ':pc:', ':briefcase:', ':save:', ':folder:', ':folderopen:', ':document:', ':document1:',
    ':calendar:', ':alien:', ':kiss:', ':loveletter:', ':diamond:',':ribbon:',':crown:', ':sunhat:', ':lipstick:', ':nails:', ':flowers:', ':boar:', ':elephant:',
    ':fish2:', ':puffer:', ':tortoise:', ':dropbear:', ':monkeyface:', ':dogface:', ':pigface:', ':frogface:', ':mouseface:',  ':horseface:', ':choicehand:',
    ':thumbsup:', ':thumbsdown:', ':clap:', ':bumblebee:', ':link:', ':graphup:', ':graphdown:', ':bargraph:', ':clipboard:', ':pin:', ':pin1:', ':paperclip:',
    ':ruler:', ':45ruler:',':notehere:', ':booky:', ':bookbw:', ':bookbr:', ':bookr:', ':bookopen:', ':bookg:', ':bookbl:', ':booky1:', ':books:', ':parchment:',
    ':notepencil:', ':call:', ':outgoing:',  ':incoming:', ':box:', ':email:', ':email1:', ':email2:', ':mailbox:', ':mailbox1:', ':mailbox2:', ':mailbox3:',
    ':mailbox4:', ':mobile:', ':mobile2:', ':camera:', ':vidcam:', ':tv:',
    ':burrito:'            ];

var r = /*Smileys*/ ['1f61a', '1f600', '1f61b', '1f61c','1f61d', '1f61e', '1f61f','1f62a', '1f62b','1f62c', '1f62d', '1f62e', '1f62f', '1f63a','1f63b', '1f63c', '1f63d', '1f63e', '1f63f', '1f620', '1f621', '1f622', '1f623', '1f624',  '1f625', '1f626', '1f627', '1f628', '1f629','1f630', '1f631', '1f632', '1f633','1f634', '1f635', '1f636', '1f637', '1f638', '1f639', '1f640', '1f60a', '1f60b', '1f60c', '1f60d', '1f60e', '1f60f', '1f600', '1f601', '1f602', '1f603', '1f604', '1f605', '1f606', '1f607', '1f608', '1f609', '1f610', '1f611', '1f612', '1f613', '1f614', '1f615', '1f616', '1f617', '1f618', '1f619',
'26a1', '2b50','26c5', '26f2', '26c4', '26f5', '26fa', '267b', '2600', '2601', '2614', '2744', '2747', '1f4a6', '1f4a7', '1f4ab', '1f4ad','1f30a', '1f30b', '1f30c', '1f30d', '1f30e', '1f30f', '1f31a', '1f31b', '1f31c', '1f31d', '1f31e', '1f31f', '1f33a', '1f33b', '1f33c', '1f33d', '1f33e', '1f33f',
'1f34a', '1f34b', '1f34c', '1f34d', '1f34e', '1f34f', '1f40a', '1f40b', '1f40c', '1f40e', '1f40f', '1f41a',  '1f41b',  '1f41c',  '1f41e',  '1f41f', '1f42a', '1f42c', '1f42e', '1f42f', '1f43a', '1f43b', '1f43c', '1f43e', '1f35a', '1f35b' , '1f35c', '1f35d', '1f35e', '1f35f', '1f36a', '1f36b', '1f36c', '1f36d', '1f36e', '1f36f', '1f37a', '1f37b', '1f37c', '1f301', '1f302', '1f303', '1f304', '1f305', '1f306', '1f307', '1f308', '1f309', '1f310', '1f311', '1f312', '1f313', '1f314', '1f315', '1f316', '1f317', '1f318', '1f319', '1f320', '1f330', '1f331', '1f332', '1f333', '1f334', '1f335', '1f337', '1f338', '1f339', '1f340', '1f342', '1f343', '1f344', '1f345', '1f346', '1f347', '1f348', '1f349', '1f350', '1f351', '1f352', '1f353', '1f354', '1f355', '1f356', '1f357', '1f358', '1f359', '1f360', '1f361', '1f362', '1f363', '1f364', '1f365', '1f366', '1f367', '1f368', '1f369', '1f370', '1f371', '1f372', '1f373', '1f374', '1f375', '1f376', '1f377', '1f378', '1f379', '1f382',
'1f493', '1f494', '1f495', '1f496', '1f497', '1f498', '1f499',  '1f49a',  '1f49b',  '1f49c',  '1f49d',  '1f49e',  '1f49f', '1f500', '1f501', '1f502', '1f503', '23f0', '23f3', '24c2', '25b6', '25c0', '26a0', '26d4', '2b05' , '2b06', '2b07', '2b55', '21a9', '21aa', '20e3', '23e9', '23ea', '23eb', '23ec', '27a1', '27b0', '27bf', '0030;&#x20e3', '31-20e3', '32-20e3', '33-20e3', '34-20e3', '35-20e3', '36-20e3', '37-20e3', '38-20e3', '39-20e3', '203c', '231a', '231b', '260e', '261d', '264a', '264b', '264c', '264d', '264e', '264f', '267f', '270a', '270b', '270c', '270f', '274c', '274e', '303d', '2049', '2122', '2139', '2194', '2195', '2196', '2197', '2198', '2199', '2611', '2648', '2649', '2650', '2651', '2652', '2653', '2660', '2663', '2665', '2666', '2668', '2693', '2702',
'2705', '2709', '2712', '2714', '2716', '2728', '2733', '2734', '2753', '2754', '2755', '2757', '2764', '2795', '2796', '2797', '1f1e8-1f1f3', '1f1e9-1f1ea', '1f1ea-1f1f8', '1f1eb-1f1f7', '1f1ec-1f1e7', '1f1ee-1f1f9', '1f1ef-1f1f5', '1f1f0-1f1f7', '1f1f7-1f1fa', '1f1fa-1f1f8', '1f3a3', '1f3a4', '1f3a5', '1f3a6', '1f3a7', '1f3a8', '1f3ab', '1f3ac', '1f3ad', '1f3ae', '1f3b0', '1f3b1', '1f3b2', '1f3b3', '1f3b4', '1f3b5' , '1f3b6', '1f3b7', '1f3b8', '1f3b9', '1f3ba', '1f3bb', '1f3bc', '1f3c6', '1f3a0', '1f3a1', '1f3a2', '1f3a9', '1f3aa', '1f3be', '1f3bf', '1f3c0', '1f3c1', '1f3c2', '1f3c3', '1f3c4', '1f3c7', '1f3c8', '1f3c9', '1f3ca', '1f4a1', '1f4a2', '1f4a3', '1f4a4', '1f4a5', '1f4a9', '1f4aa', '1f4ac', '1f4b0', '1f4b1', '1f4b2', '1f4b3', '1f4b4', '1f4b5', '1f4b6', '1f4b7', '1f4b8', '1f4bb', '1f4bc', '1f4be', '1f4c1', '1f4c2', '1f4c3', '1f4c4', '1f4c5' , '1f47d', '1f48b', '1f48c', '1f48e', '1f380', '1f451', '1f452', '1f484', '1f485', '1f490', '1f417', '1f418', '1f420',
'1f421', '1f422', '1f428', '1f435', '1f436', '1f437', '1f438', '1f439', '1f434', '1f44c', '1f44d', '1f44e', '1f44f', '1f41d', '1f517', '1f4c8', '1f4c9', '1f4ca', '1f4cb', '1f4cc', '1f4cd', '1f4ce', '1f4cf', '1f4d0', '1f4d1', '1f4d2', '1f4d3', '1f4d5', '1f4d6', '1f4d7', '1f4d8', '1f4d9', '1f4da', '1f4dc', '1f4dd', '1f4de', '1f4e4', '1f4e5', '1f4e6', '1f4e7', '1f4e8', '1f4e9', '1f4ea', '1f4eb', '1f4ec', '1f4ed', '1f4ee', '1f4f0', '1f4f1', '1f4f2', '1f4f7', '1f4f9', '1f4fa',
'1f32f'];

    for (var x=f.length-1; x>0;x--) {
        var rvalue = r[x];
        if (rvalue.toString().search(new RegExp ('-','g')) !== -1) {
            rvalue = rvalue.toString().replace(new RegExp ('-','g'),";&#x");
        }
        target = target.toString().replace(new RegExp (f[x],'g'), "&#x"+rvalue+';');
    }
return target;
}
