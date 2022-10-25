XScripts.prototype = {
    constructor: XScripts,
    loadScript: function(d){
      let self=this;
      return new Promise(resolve =>  {
        let path = 'js/' + d.title + ".js";
        console.log("Loading " + path);
        $.getScript(path)
        .then(
          function(data,textStatus){
            if (self.logged){xerafin.error.log.add(d.title + " script loaded",'HTTP');}
            resolve(true);
          }
        );
      });
    },
    loadGroup: async function(group){
      console.log("Load Group");
      console.log(group);
      let self = this;
      let f = new Array();
      $.ajaxSetup({cache:true});
      group.files.forEach(function(elem,index){
        f.push(self.loadScript(elem));
      });
      return new Promise(resolve => {
        Promise.all(f).then((values) => {
          $.ajaxSetup({cache:false});
          console.log(group.group + " script group loaded");
        if (self.logged){xerafin.error.log.add(group.group + " script group loaded",'HTTP');}
          resolve(true);
        });
      })
    },
    load: async function(current){
      console.log("Loading Scripts");
      console.log(this.files);
      let group = await this.loadGroup(this.files[current]);
      if (group) {
        if (current < this.files.length - 1) {
          let x = await this.load(current+1);
          if (x) {
            return new Promise (resolve => {resolve(true);})
          }
        }
        else {
          console.log("All scripts loaded successfully");
          if (self.logged){xerafin.error.log.add("All scripts loaded successfully");}
          return new Promise (resolve => {resolve(true);})
        }
      }
    },
    get: async function(){
      let self=this;
      return new Promise (resolve => {
        if (this.logged) {
            xerafin.error.log.add("Downloading Required Scripts","HTTP");
        }
        $.get(this.path, async function(response) {
//        $.ajax({
//          method: "POST",
//          url: this.path,
//          data: JSON.stringify({'status': this.logged}),
//          success: async function(response, responseStatus) {
            self.data = JSON.parse(response);
            console.log("Logging self.data from the script.get() function");
            console.log(self.data);
            if (self.logged) {
              self.files = self.data.scripts;
              self.nav = self.data.nav;
            }
            else {self.files = self.data.preload;}

            let x = await self.load(0);
            if (x) {resolve(true);}
//          },
//          error: function(jqXHR, textStatus, errorThrown) {
//            xerafin.error.log.add("Error whilst generating scripts! "+jqXHR.status,"error");
        });
      });
    }
}
function XScripts (data = {}){
  this.logged = data.logged || false;
  this.path = data.path || "/JSON/config/configClient.xerf";
}
