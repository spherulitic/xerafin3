Xerafin.prototype = {
  constructor:Xerafin,
  deferredFunctionGroup: function(values){
    var f = new Array();
    var g = new Array();
    $.ajaxSetup({cache:true});
    values.forEach(function(elem,index){
      f[index]= elem;
      g[index] = eval(f[index]);
    });
    $.ajaxSetup({cache:false});
    return g;
  },
  recursiveScripts: function(data, current, last){
    let self=this;
    var fun = this.deferredFunctionGroup(data[current]);
    $.when.apply($,fun).done(function(){
      appendDebugLog("Script group "+current+" Download Complete");
      if (current<last) {self.recursiveScripts(data,current+1,last);}
      else {
        appendDebugLog("All Scripts Downloaded Successfully");
        if (self.logged){
          if (!noaccess){
            generatePanels();
          }
          else {
            $('#logProgress').html('');
            overlay.clear();
            noaccess=false;
          }
        }
      }
    });
  },
  parseScripts: function(data){
    if (this.logged){
      this.recursiveScripts(data.scripts,0,data.scripts.length-1);
    }
    else {
      this.recursiveScripts(data.preload,0,data.preload.length-1);
    }
  },
  generateScripts:function(){
    let self=this;
    let d = {'status': ((this.logged)? 1:0)};
    this.logged ? appendDebugLog("Downloading Required Scripts"):appendDebugLog("Downloading Core Scripts");
    $.ajax({
      'method': "POST",
      'url': "PHP/generateScripts2.php",
      'data': JSON.stringify(d),
      'success': function(response, responseStatus) {
        let data=JSON.parse(response);
        appendDebugLog(data);
        self.parseScripts(data);

      },
      'error': function(jqXHR, textStatus, errorThrown) {
        appendDebugLog("<b>Something went wrong whilst generating scripts!</b>");
      }
    });
  },
  init:function(){
    this.config = new Config();
    if (this.next) {
      this.generateScripts();
    }
    else {
      this.error = new XError();
    }
  }

}
function Xerafin(data={}){
  this.next = data.next || true
  this.views = new Object();
  this.logged = false;
  this.init();
}
Config.prototype = {
  constructor:Config,
  deleteOldLocalStorage:function(){
  },
  popLocalStorage:function(){
    if (!localStorage.qQCounter) {localStorage.qQCounter = 0;}
    if (!localStorage.qQCorrect) {localStorage.qQCorrect = 0;}
    if (!localStorage.qQAlpha) {localStorage.qQAlpha = 0;}
    if (!localStorage.gAlphaSortInput) {localStorage.gAlphaSortInput = 0;}
    if (!localStorage.gAlphaDisplay) {localStorage.gAlphaDisplay = 0;}
    if (!localStorage.gSlothPref) {localStorage.gSlothPref = 0;}
    if (!localStorage.soundEnabled) {localStorage.soundEnabled = true;}
    if (!localStorage.musicEnabled) {localStorage.musicEnabled = true;}
    if (!localStorage.gWordwallTheme) {localStorage.gWordwallTheme = 0;}
    if (!localStorage.gTileDisplay) {localStorage.gTileDisplay = 0;}
    if (!localStorage.qQPanelOpen) {localStorage.qQPanelOpen = (isMobile()? 0 : 1);}
    if (typeof(localStorage.showAnswersQuiz)=='undefined'){localStorage.setItem('showAnswersQuiz', '1')};
    if (typeof localStorage.qCardboxStartScore==='undefined'){
      localStorage.setItem('qCardboxStartScore','0');
      localStorage.setItem('qCardboxScore','0');
      localStorage.setItem('qCardboxQAnswered','0');
      localStorage.setItem('qCardboxDiff','0');
    }
  },
  popConstants: function(){
  let self=this;
    this.activeApps = [
      ['Basic Quiz', 'initBQ','images/icons/question-png-icon-1.png'],
      //['Cardbox Invaders','initInvaders','images/cardboxInvaders2.png'],
      ['Wall of Words','initWordWall','images/icons/xeraWall.png']
    ];
    this.colorAnswers = [
      'black','#dddddd','hsl(0,75%,50%)','hsl(25,75%,50%)','hsl(50,75%,50%)','hsl(75,75%,50%)','hsl(100,75%,50%)','hsl(150,75%,50%)',
      'hsl(175,75%,50%)','hsl(200,75%,50%)','hsl(225,75%,50%)','hsl(250,75%,50%)','hsl(275,75%,50%)','hsl(300,75%,50%)'
    ];
    this.colorAnswersOld = [
      "black", "azure", "mediumorchid", "palegreen", "yellowgreen", "khaki", "salmon", "hotpink",
      "crimson", "magenta", "orange", "peachpuff", "mistyrose", "floralwhite",'white'
    ];
    this.showcase = [
        {

          'title':'What is Xerafin?',
          'image':'images/xerafinNew.png',
          'blurb':"Xerafin is an online study environment for word games.  The website is under constant development and designed with the concept of word study being a social activity that is both addictive and highly competitive!",
          'layout':{'size':'70%'}
        },
        {
          'title':"Will this work on my phone?",
          'image':"images/showcase/mobile.png",
          'blurb':"As long as you have internet access and a supported browser everything should work.  Xerafin adjusts its layout to your desktop, laptop, pad or phone and remains in sync with all of them.",
          'layout':{'position':'top','size':'80%'}
        },
        {
          'title':"Games: Subword Sloth",
          'image':"images/showcase/Sloth.gif",
          'blurb':"Find as many subanagrams as you can against the clock.  Review the answers and discover new words to add to your study routine.",
          'layout':{'position':'top','size':'75%'},
        },
        {
          'title':"So is it an app or a game?",
          'image':"images/showcase/desktopShot.gif",
          'blurb':"We like to think of it as both, attempting to combine the power of an app with the entertainment value of a game.  We also see Xerafin as a community, with many of our earliest users being familiar with each other from the tournament Scrabble scene.",
          'layout':{'size':'100%'}
        },

      ];

    this.privacyLinks = [
      ['Back to Top','privTop'],
      ['Last Update','privUpdate'],
      ['Information We Collect','privCollect'],
      ['Information You Provide','privProvide'],
      ['Information We Collect When You Use Our Service','privWhen'],
      ['How We Use Your Information','privUsage'],
      ['How We Share Information','privShare'],
      ['Legal Basis for Processing','privLegal'],
      ['Third Party Services','privThird'],
      ['Security','privSecurity'],
      ['Data Retention','privData'],
      ['Access','privAccess'],
      ['GDPR','privGDPR'],
      ['Your Choices','privChoices'],
      ["Children's Information",'privChildren'],
      ['Online Privacy Policy Only','privOnlinePriv'],
      ['Modifications to This Policy','privPolicyUpdates'],
      ['International Data Transfers','privInternational'],
      ["Consent",'privConsent'],
      ['Data Controller','privController']];
    this.tosLinks = [
      ['Top','tosTop'],
      ['Last Update','tosLastUpdate'],
      ['Preamble','tosPreamble'],
      ['Your Account','tosAccount'],
      ['Account Structure','tosStructure'],
      ['Privacy Policy','tosPriv'],
      ['Indemnity','tosIndem'],
      ['Termination','tosTermin'],
      ['License to Reproduce Content','tosRepro'],
      ['Account Content','tosContent'],
      ['Content Posted on Other Websites','tosOther'],
      ['No Resale of Services','tosResale'],
      ['Exposure to Content','tosExposure'],
      ['Member Conduct','tosMemCond'],
      ['Volunteers','tosVolunteer'],
      ['Changes','tosChanges'],
      ['Disclaimer of Warranties','tosWarr'],
      ['Limitation of Liability','tosLimit'],
      ['General Information','tosGeneral']
    ];
    this.slogans = [
      'Enabling cardboxing on the can since 2016!',
      "That smell is your dinner burning..."
    ];
    this.autoForm = new Object();
    this.autoForm['eMail'] = {
      'ref':'eMail',
      'label':'eMail Address',
      'type':'input',
      'validationType':'email',
      'helpText':"Must be a valid eMail address, such as 'myname@gmail.com'"
    }
    this.autoForm['password'] = {
      'ref':'password',
      'label':'Enter Password',
      'type':'password',
      'confirmField':'passwordConfirm',
      'validationType':'password',
      'helpText':'Requirements:<br><ul>'
      +'<li>Must contain at least 1 lowercase alphabetical character.</li>'
      +'<li>Must contain at least 1 uppercase alphabetical character.</li>'
      +'<li>Must contain at least one special character.  Examples: !($"-@ .</li>'
      +'<li>Must contain at least 1 numeric character.</li>'
      +'<li>Must be eight characters or longer.</li></ul>'
    }
    this.autoForm['passwordC'] = {
      'ref':'passwordConfirm',
      'label':'Confirm Password',
      'type':'password',
      'validationType':'passwordConfirm',
      'valSource':'password',
      'helpText':'Repeat Password you just wrote.'
    }
    this.autoForm['handle'] = {
      'ref':'handle',
      'label':'Handle',
      'type':'input',
      'validationType':'handle',
      'helpText':'A unique identifier that can be used instead of your real name.  For example: "Iceman" or "Maverick"'
      +'<BR> Rules for this are as follows:'
      +'<ul><li> Must be between 4 and 15 characters long.</li>'
      +'<li> No spaces between characters.</li>'
      +"<li> No Numbers.  We're not THAT big of a community to warrant their usage. </li>"
      +'<li> "_" and "-" characters ARE permitted </li>'
      +'<li> Nothing which may be interpreted as offensive by others. </li>'
      +'<li> Try to keep it pronouncable.  We will turn down a gibberish handle like "xtqgtszdc". </li>'
      +'</ul>Xerafin will automatically set first character to upper case; The rest to lower case.</ul>'
    }
    this.autoForm['privacyCheck'] = {
      'ref':'privacyCheck',
      'label':"I agree to Xerafin's 'Privacy Policy' and 'Terms of Service'",
      'type':'checkbox',
      'validationType':'mustCheck',
      'helpText':'This must be checked in order to register an account with Xerafin'
    }
    this.autoForm['firstName'] = {
      'ref':'firstName',
      'label':'Firstname',
      'type':'input',
      'validationType':'alphabet',
      'isOptional':true,
      'helpText':'Maximum length: 20 characters.<br>Note: First character will be automatically converted to upper case by the server.'
    }
    this.autoForm['lastName'] = {
      'ref':'lastName',
      'label':'Lastname',
      'type':'input',
      'validationType':'alphabet',
      'isOptional':true,
      'helpText':'Maximum length: 20 characters.<br>Note: First character will be automatically converted to upper case by the server.'
    }
    this.autoForm['comments'] = {
      'ref':'comments',
      'label':'Other',
      'type':'textarea',
      'height':90,
      'validationType':'none',
      'isOptional':true,
      'helpText':'Anything else you feel is worth mentioning in relation to your registration.'
    }
    this.autoForm['captcha'] = {
      'ref':'captcha',
      'settings': {
        'sitekey': '6Lc0SKsZAAAAABykLZKfhQvfu0r6l-O4b5hzlIBT',
        'badge': 'inline',
        'theme': 'dark'
      }
    }
    this.disableWatches = true;
  },
  popGlobals: function(){
    dot = "&#183;";
    debuglog = "";
    noaccess = false;
    passThroughs = 0;
    var leaderboardTimeout;
  },
  init:function(){
    this.popGlobals();
    this.deleteOldLocalStorage();
    this.popLocalStorage();
    this.popConstants();
  }
}
function Config(data={}){
  this.init();
}
