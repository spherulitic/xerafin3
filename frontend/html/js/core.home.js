Home.prototype = {
  constructor:Home,
  getUnloggedStats:function(){
    if (this.statFetch!=='undefined'){clearTimeout(this.statFetch);}
    let self=this;
    this.statFetch = setTimeout(Home.prototype.getUnloggedStats.bind(this),9000);
    $.ajax({
      type: "POST",
      url: "getAllTimeStats.py",
      success: function(response,responseStatus){

        self.updateStatsWidget(response[0]);
      },
      error: function(jqXHR, textStatus, errorThrown) {
        self.getUnloggedStats();
      }
    });
  },
  drawShowcase:function(){
    x = document.createElement('div');
    $(x).addClass('well frontPage');
    $(x).css({'width':'100%'})
    this.showcase = document.createElement('div');
    $(this.showcase).css({'width':'100%','margin':'auto','position':'relative'});
    $(x).append(this.showcase);
    this.show = new NewShowcase ({
      'data': xerafin.config.showcase,
      'pare': this.showcase
    });
    return x;
  },
  drawFBLikes:function(){
    this.fbStuff = document.createElement('div');
    $(this.fbStuff).addClass('metalBOne');
    $(this.fbStuff).css({'font-family':'Lato, sans serif!important','padding':'5px 3px','text-align':'center','margin':'auto','margin-top':'5px','border-radius':'0.2em','box-sizing':'border-box'});
    this.fbLikes=document.createElement('div');
    $(this.fbLikes).css({'margin':'auto!important','text-align':'center!important'});
    $(this.fbLikes).addClass('fb-page');

    $(this.fbLikes).attr({
      'data-href':'https://www.facebook.com/Xerafin-1510667382519099/',
      'data-width':'',
      'data-height':'70',
      'data-small-header':'true',
      'data-hide-cover':'false',
      'data-adapt-container-width':"true"
    });
    $(this.fbStuff).append(this.fbLikes);
    return this.fbStuff;
  },
  updateStatsWidget:function(d){
    $(this.statsContent).html(
    "Since <span style='font-weight:bold;'>11/10/2016</span>, <span style='font-weight:bold;'>"+Number(d.users).toLocaleString()+"</span> Xerafin users have answered <span style='font-weight:bold;'>"+Number(d.questions).toLocaleString()+"</span> alphagrams.  That's an average of <span style='font-weight:bold;'>"+Number(Math.ceil(Number(d.questions)/Number(d.users))).toLocaleString()+"</span> per user!"
    );
  },
  drawStatsWidget:function(){
    this.statsWidget = document.createElement('div');
    $(this.statsWidget).addClass('frontPage highlightRow');
    $(this.statsWidget).css({'border':'2px solid black','vertical-align':'middle'});
    this.statsContent = document.createElement('div');
    $(this.statsContent).css({'font-family':'Lato, sans-serif','vertical-align':'middle','min-height':'1.05em','margin':'1vh 2vh','text-align':'center','line-height':'1.1em','font-size':'1.1em'});
    $(this.statsWidget).append(this.statsContent);
    this.getUnloggedStats();
    return this.statsWidget;
  },
  drawMenuOptions:function(){
    this.popMenuNotL();
    console.log(this.menuContentNotL);
    this.menu = new HomeMenu({
      source: this.menuContentNotL,
      startVal: 1,
    });
    return this.menu.output();
  },

  drawDocViewer:function(){
    this.docView=document.createElement('div');
    return this.docView;
  },
  popMenuNotL: function(){
    let self=this;
    this.menuContentNotL = {
      0:{  'title':'Join Us!','after':function(e){
          self.updateDocViewer(self.register());
        }
      },
      1:{  'title':'Announcements',
        'after':function(e){
          self.updateDocViewer(self.announcements());
        }
      },
      2:{  'title':'Privacy Policy',
        'after':function(e){
          self.updateDocViewer(self.loadDoc('privacy','docs/privacy.htm'));
        }
      },
      3:{  'title':'Terms of Service',
        'after':function(e){
          self.updateDocViewer(self.loadDoc('tos','docs/tos.html'));
        }
      }
    }
  },
  updateDocViewer:function(obj){
    $(this.docView).ready(function(e){
      console.log(obj);
      $(self.docView).html('');
      $(self.docView).append(obj);
    });
  },
  drawLoginGroup: function(){
    this.loginContent = document.createElement('div');
    this.loginPanel = new LoginDialog();
    $(this.loginContent).addClass('well frontPage');
    $(this.loginContent).css({'width':'100%'})
    $(this.loginContent).append(this.loginPanel.output(),this.drawMenuOptions(),this.drawFBLikes());
    return this.loginContent;
  },
  drawLoginScreen:function(){
    let self=this;
    this.lhs = document.createElement('div');
    this.rhs = document.createElement('div');
    $(this.lhs).addClass('col-xs-12 col-sm-6 col-md-5 col-lg-4');
    $(this.rhs).addClass('col-xs-12 col-sm-6 col-md-7 col-lg-8');
    let x = document.createElement('div');
    $(x).addClass('container-fluid');
    $(this.lhs).append(this.drawLoginGroup(),this.drawShowcase());
//    $(this.fbLikes).ready(function(){self.initFB();});
    $(this.showcase).ready(function(){
      self.show.init();
      self.show.output();
    });
    $(this.rhs).append(this.drawStatsWidget(),this.drawDocViewer());
    this.updateDocViewer(this.menuContentNotL[this.menu.startVal].after());
    $(x).append(this.lhs,this.rhs);
    return x;
  },
  draw:function() {
    this.content = document.createElement('div');
    $(this.content).append(this.drawLoginScreen());
  },
//  initFB: function(){
//    let self=this;
//    window.fbAsyncInit = function() {
//      FB.init({
//      'appId'      : self.fbAppId,
//      'xfbml'      : true,
//      'cookie'     : true,
//      'status'     : false,
//      'version'    : self.fbAppVer
//      });
//    }
//    this.checkFBLoginStatus();
//  },
//  checkFBLoginStatus:function(){
//    let x;
//    if (this.fbFetch!=='undefined'){clearTimeout(this.fbFetch);}
//    if (typeof FB!=='undefined'){
//        FB.getLoginStatus(function(response) {
//        console.log('test');
//        console.log(response);
//        if (response.status=='unknown'){self.fbFetch = setTimeout(Home.prototype.checkFBLoginStatus.bind(self),30);}
//        if (self.fbLink!=='undefined'){$(self.fbLink).prop('disabled',true);}
//        x = response;
//      });
//      console.log('FBStatusOP');
//      console.log(x);
//      return x;
//    }
//    else {
//      this.fbFetch = setTimeout(Home.prototype.checkFBLoginStatus.bind(this),30);
//    }
//  },
  registrationForm: function (){
    let self=this;
    let x = xerafin.config.autoForm;
    this.registerForm = new XeraForm({
      'fields':[
        x.eMail,
        x.password,
        x.passwordC,
        x.handle,
        x.firstName,
        x.lastName,
        x.comments,
        x.privacyCheck
      ],
      'formHelp':"<ul><li>We are not open to the general public at present.</li>"+
      "<li>The developers may require the optional information before activating your account.</li>"+
      "<li>Handling time can take anything up to 48 hours, but usually a LOT sooner.</li></ul>",
      'captcha': x.captcha,
      'submit': {
        'html':'Submit',
        'url':'/PHP/register.php',
        'after': function(x){
          let y = self.registerForm;
          if (!x.registered){
            Object.entries(x.messages).forEach(function([i,v]){
              console.log(v);
              if (v.scope!=='captcha'){
                y.rows[v.scope].updateFeedback(v.msg);
              }
              else {
                $(y.captchaFeedback).html("<span style='color:red'>"+v.msg+"</span");
                $(y.captchaFeedback).show(500);
              }
            });
          }
          else {
            $(y.formRegion).slideUp(500);
            $(y.formHelpBox).removeClass('highlightRow');$(y.formHelpBox).addClass('steelRowed');
            $(y.formHelpBox).html("An eMail to verify your account has been sent.<BR>Follow the link provided there and you will be notified when your account is ready.");
          }
        }
      }
    });
    return this.registerForm.output();
  },
  loadDoc:function(name,path){
    let self=this;
    $.ajax({
      type: "POST",
      url: path,
      success: function(response, responseStatus) {
        let z = {'privacy':2,'tos':3};
        let y = {'privacy':'Privacy','tos':'Terms of Service'};
        let x = new XeraDoc({
          'body': response,
          'hasBookmarks':true,
          'hasHeader':true,
          'hasFooter':true,
          'head': y[name],
          'bookmarks':xerafin.config[name+'Links'],
          'pare': self.docView
        });
        return x.output();

      },
      error: function(jqXHR, textStatus, errorThrown) {
        return(name+" Statement Load Error");
      }
    });

  },
  register: function(){
    let x = new XeraDoc({
      'body': this.registrationForm(),
      'hasScroll':false,
      'hasBookmarks':false,
      'hasHeader':true,
      'hasFooter':true,
      'head': 'Register New Account',
      'foot': "Xerafin is undergoing Beta testing. As such, accounts are activated at the developers' discretion.",
      'pare': this.docView
    });
    return x.output();
  },
  announcements: function(){
    let x = new XeraDoc({
      'body': 'Test',
      'hasScroll':false,
      'hasBookmarks':false,
      'hasHeader':true,
      'hasFooter':true,
      'head': 'Announcements',
      'foot': "TBD",
      'pare': this.docView
    });
    return x.output();
  },
  init:function() {
    (function(d, s, id){
      var js, fjs = d.getElementsByTagName(s)[0];
      if (d.getElementById(id)) {return;}
      js = d.createElement(s); js.id = id;
//      js.src = "//connect.facebook.net/en_US/sdk.js";
//      fjs.parentNode.insertBefore(js, fjs);
    }(document, 'script', 'facebook-jssdk'));
//    this.initFB();
    this.draw();
  },
  output: function() {
    $(document.body).html('');
    $(document.body).append(this.content);
  }
}
function Home(data={}){
  //console.log(data);
//  this.fbAppId = data.fbAppId;
//  this.fbAppVer = data.fbAppVer;
  this.init();
}
