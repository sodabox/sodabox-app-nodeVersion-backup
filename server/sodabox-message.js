
var   express   = require(__dirname+'/node_modules/express')
    , everyauth = require(__dirname+'/node_modules/everyauth')
    , redis     = require(__dirname+'/node_modules/redis')
    , zookeeper = require(__dirname+'/node_modules/zookeeper')
    , url       = require('url')

    , confFilePath = __dirname+'/../conf/messageServer.js'
;

process.argv.forEach(function (item, index){
    if(item == '--conf'){
        confFilePath = process.argv[index+1];
    }
});
var conf = require(confFilePath);


console.log(" [STARTED] "+conf.server.host+":"+conf.server.port+"\n");

var SODABOX = SODABOX || {};

SODABOX.server = (function (zookeeper, redis) {

    var MSG_SERVER_ROOT_PATH = '/SODABOX_messageServer';
    var pMessageServerList = {};

    var ROOT_PATH = '/SODABOX_messageStorage';
    var pMessageStorageList = {};
    var pConfProp;
    var zk;

    function zk_connect(){
        zk = new zookeeper(
            {
                connect: pConfProp.zookeeper.url,
                timeout: 1000,
                debug_level: zookeeper.ZOO_LOG_LEVEL_WARNING,
                host_order_deterministic: false
            }
        );

        zk.connect(function (err) {
            if(err) throw err;

            console.log (" [ZK:CONNECT] id=%s", zk.client_id);

            // MSG_SERVER_ROOT_PATH
            zk.a_exists(MSG_SERVER_ROOT_PATH, null, function ( rc, error, stat ){

                console.log(" [ZK:EXISTS] "+rc+", "+error+", "+stat );

                if(rc != 0){ // 존재하지 않는다면, rootPath 생성
                    zk.a_create (MSG_SERVER_ROOT_PATH, null, zookeeper.ZOO_PERSISTENT, function (rc, error, path)  {
                        if (rc != 0) {
                            // ERROR :: 존재하지 않아서 생성했는데 에러 난 경우
                            console.error ("  [ZK:**ERROR**] ("+MSG_SERVER_ROOT_PATH+") %d, error: '%s', path=%s", rc, error, path);
                        } else {
                            zk_createServerNode();
                        }
                    });
                }else{
                    zk_createServerNode();
                }

            });
        });
    }
    function zk_createServerNode(){

        zk.a_exists(MSG_SERVER_ROOT_PATH, null,
            function ( rc, error, stat ){

                // @ TODO 같은 SocketServer 가 존재하면 안된다 체크 필요!!

                console.log(JSON.stringify(pConfProp));

                var zNodePath = "/"+pConfProp.server.host+":"+pConfProp.server.port;
                zk.a_create (MSG_SERVER_ROOT_PATH+zNodePath, JSON.stringify(pConfProp), zookeeper.ZOO_EPHEMERAL, function (rc, error, path)  {
                    if (rc != 0) {
                        // ERROR :: 존재하지 않아서 생성했는데 에러 난 경우
                        console.error ("  [ZK:**ERROR**] ("+MSG_SERVER_ROOT_PATH+zNodePath+") %d, error: '%s', path=%s", rc, error, path);
                    } else {
                        console.log (" [ZK:CREATEED] %s", path);
                        zk_retrieveServerList();
                        zk_retrieveMessageServerList();
                    }
                });
        });
    }
    function zk_retrieveServerList(){
        zk.aw_get_children(
                ROOT_PATH,
                function ( type, state, path ){
                    console.log('  [WATCH] '+type+','+state+','+path);
                    zk_retrieveServerList();
                },
                function(rc,error,children){

                    console.log(' >>> '+rc+','+error+','+children);

                    if(rc==0){

                        var _lastCheckCount = pMessageStorageList['_lastCheckCount'] + 1;
                        pMessageStorageList['_lastCheckCount'] = _lastCheckCount;

                        children.forEach(function(child){

                            console.log(child);
                            var thisServerInfo = child.split(':');
                            //if(pConfProp.server.channel != thisServerInfo[0] ){ // CHANNEL NAME
                                zk.a_get( ROOT_PATH+'/'+child, false, function(rc, error, stat, data){

                                    console.log(' ---- '+rc+','+error+','+stat+','+data);

                                    var thisServerInfo = child.split(':');
                                    var parsedConf = JSON.parse(data);

                                    console.log(parsedConf.server.channel);

                                    console.log('---------'+thisServerInfo[0]+'\n'+pMessageStorageList+'\n\n\n\n');
                                    // ---- 
                                    if(!pMessageStorageList.hasOwnProperty(thisServerInfo[0])){


                                        var messageClient = redis.createClient(
                                            parsedConf.messageStorage.port, 
                                            parsedConf.messageStorage.host, 
                                            {no_ready_check: true}
                                        );
                                                                    
                                        if (parsedConf.messageStorage.password) {
                                            console.log('dasdfasdfasdasfadad');
                                            messageClient.auth(parsedConf.messageStorage.password, function() {
                                                console.log(' - Redis client connected');
                                                pMessageStorageList[thisServerInfo[0]] = messageClient;
                                            });
                                        }else{
                                            console.log(' - Redis client connected without password.');
                                            pMessageStorageList[thisServerInfo[0]] = messageClient;    
                                        }
                                    }else{
                                        console.log(' Redis Client was existed....');
                                    }

                                
                                });
                            //}

                        });

                    }

                }
        );
    }

    function zk_retrieveMessageServerList(){
        zk.aw_get_children(
                MSG_SERVER_ROOT_PATH,
                function ( type, state, path ){
                    console.log('  [WATCH] '+type+','+state+','+path);
                    zk_retrieveMessageServerList();
                },
                function(rc,error,children){

                    console.log(' >>> '+rc+','+error+','+children);

                    if(rc==0){
                        var _lastCheckCount = pMessageServerList['_lastCheckCount'] + 1;
                        pMessageServerList['_lastCheckCount'] = _lastCheckCount;
                        children.forEach(function(child){
                            console.log(child);
                            pMessageServerList[child] = _lastCheckCount;  
                        });
                    }

                }
        );
    }


    // [ public methods ]
    return {
        init: function (conf) {
            pConfProp = conf;
            pMessageStorageList['_lastCheckCount'] = 0;
            pMessageServerList['_lastCheckCount'] = 0;

            zk_connect();
        },
        messageStorageList: pMessageStorageList,
        messageServerList: pMessageServerList

    };

}(zookeeper, redis));





SODABOX.app = (function (everyauth, express, redis) {

    var pConfProp;
    var sessionStorageClient;

    var nextUserId = 0;

    var usersById = {};
    var usersByFbId = {};
    var usersByTwitId = {};


    function messageServer_init(){

        everyauth.debug = true;
        everyauth.everymodule.findUserById( function (id, callback) {
            callback(null, usersById[id]);
        });

        everyauth
          .facebook
            .appId(pConfProp.fb.appId)
            .appSecret(pConfProp.fb.appSecret)
            .findOrCreateUser( function (session, accessToken, accessTokenExtra, fbUserMetadata) {
              return usersByFbId[fbUserMetadata.id] ||
                (usersByFbId[fbUserMetadata.id] = addUser('facebook', fbUserMetadata));
            })
            .redirectPath('/authCallback');

        everyauth
          .twitter
            .consumerKey(pConfProp.twit.consumerKey)
            .consumerSecret(pConfProp.twit.consumerSecret)
            .findOrCreateUser( function (sess, accessToken, accessSecret, twitUser) {
              return usersByTwitId[twitUser.id] || (usersByTwitId[twitUser.id] = addUser('twitter', twitUser));
            })
            .redirectPath('/authCallback');


        /**  Express F/W  **/
        var app = express.createServer(
            express.bodyParser()
          , express.static(__dirname + "/public")
          , express.favicon()
          , express.cookieParser()
          , express.session({ secret: 'rladygks'})
          , everyauth.middleware()
        );

        app.configure( function () {
          app.set('view engine', 'jade');
          app.set('views', __dirname+'/views');
        });


        app.get('/', function (req, res) {

          console.log(' > //////////// : SC['+req.session.auth._callbackSocketId+']');

        });

        app.get('/popupauth', function (req, res){

          var urlObj  = url.parse(req.url, true);
          var params  = urlObj.query;

          req.session.auth = {};
          
          req.session.auth._callbackSocketId = req.query["SC"];
          req.session.auth._channel = req.query["CN"];

          res.redirect('/auth/'+req.query["_tryTarget"]);

        });


        app.get('/authCallback', function (req, res) {

          if(req.session.auth === undefined || !req.session.auth.loggedIn){
            res.end("<html><h1>Authentication failed :( </h1></html>")

          }else{

            var loginedUsr = {};

            if(req.session.auth.twitter !== undefined){
              loginedUsr = {
                target : 'twitter',
                id :    req.session.auth.twitter.user.id,
                name :  '@'+req.session.auth.twitter.user.screen_name,
                link :  'https://twitter.com/'+req.session.auth.twitter.user.screen_name
              };
            }else if(req.session.auth.facebook !== undefined){
              loginedUsr = {
                target : 'facebook',
                id :    req.session.auth.facebook.user.id,
                name :  req.session.auth.facebook.user.name,
                link :  req.session.auth.facebook.user.link
              };
            }

            SODABOX.server.messageStorageList[req.session.auth._channel].publish( req.session.auth._channel,  JSON.stringify({
                SC : req.session.auth._callbackSocketId,
                MG : 'AUTH',
                _users : loginedUsr,
                _type : 'S'
            }));

            console.log(' > /authCallback : SC['+req.session.auth._callbackSocketId+']');
            console.log('                   CN['+req.session.auth._channel+']');
            console.log('                   UR['+JSON.stringify(loginedUsr)+']');

            res.send("<html><p>You can now <a href='#' onclick='self.close();'>close this window</a> and follow or unfollow whomever you wish.</p>" +
                     "<script type='text/javascript'>self.close();</script></html>");
          }

        });

        app.get('/user', function (req, res){


          if(req.session.auth === undefined || !req.session.auth.loggedIn){

            var urlObj  = url.parse(req.url, true);
            var params  = urlObj.query;

            req.session.auth = {};

            if(params.SC && params.CN){

              //req.session.auth._callbackSocketId = params.SC;
              //req.session.auth._channel = params.CN;

              //console.log(' > /user (ADD session!!)         : SC['+req.session.auth._callbackSocketId+']');
          
            }
            
            
            if(req.query["_callback"] === undefined || req.query["_callback"] == null){
              
              res.send('{isAuth:false}');
            }else{
              res.send(req.query["_callback"] + '({isAuth:false, tryTarget:"'+req.query["_tryTarget"]+'"});');
            }

          }else{

            var loginedUsr = {};

            if(req.session.auth.twitter !== undefined){

              loginedUsr = {
                target : 'twitter',
                id :    req.session.auth.twitter.user.id,
                name :  '@'+req.session.auth.twitter.user.screen_name,
                link :  'https://twitter.com/'+req.session.auth.twitter.user.screen_name
              };
            }else if(req.session.auth.facebook !== undefined){

              loginedUsr = {
                target : 'facebook',
                id :    req.session.auth.facebook.user.id,
                name :  req.session.auth.facebook.user.name,
                link :  req.session.auth.facebook.user.link
              };
            }

            console.log(' > /user         : UR['+JSON.stringify(loginedUsr)+']');

            res.writeHead(200, { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            });

            if(req.query["_callback"] === undefined || req.query["_callback"] == null){
              res.end('{isAuth:true, user:'+JSON.stringify(loginedUsr)+'}');
            }else{
              res.end(req.query["_callback"] + '({isAuth:true, user:'+JSON.stringify(loginedUsr)+'});');  
            }

          }

        });

        app.get('/logoutAuth', function (req, res){

          delete req.session.auth;
            
          res.writeHead(200, { 
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
          });

          res.end(req.query["_callback"] + '();');  

        });

        app.get('/message', function (req, res){
            var urlObj  = url.parse(req.url, true);
            var referer = req.headers.referer;
            var params  = urlObj.query;

            if(params.r){
                if(params.r == 'HOMEURL'){
                    referer = getHomeUrl(referer);
                }
            }

            referer = escape(referer);

            console.log(' > /message      : RF['+referer+']');
            console.log(' >                 SC['+params.SC+']');

            if(
                //!params.AU ||   // !params.CN || !params.UR || 
                !params.MG  || !params.SC // || !referer // @ TODO have to uncomment!!
            ){
            
                res.writeHead(500, { 
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                });
                res.end('Internal Error : uri parameters are not available.');
                
            }else{
                
                // 1. HSET
                //sessionStorageClient.hset(referer, params.SC, params.CN, redis.print);    
                var curUR;
                sessionStorageClient.hget(referer, params.SC, function(err, data) {

                    if(err){
                      console.error(err);
                    }else{
                      var c = JSON.parse(data);
                      curUR = c.UR;  
                    } // @ TODO !!!!!!!
                });
                
                // 2. HGET ALL
                sessionStorageClient.hgetall(referer, function (err, channels) {
                    for (var socketId in channels) {

                        //console.log(channels[socketId]+" ------- \n"+params.MG+" / "+socketId);
                        
                        var c = JSON.parse(channels[socketId]);
                        
                        SODABOX.server.messageStorageList[c.CN].publish( c.CN,  JSON.stringify({
                            MG : params.MG,   // (MG - message)
                            SC : socketId,    // (SC - socket )
                            _type : 'M',      // M :chat message / S :system message
                            _from : curUR
                        }));
                        
                    }   
                });
                
                //console.log(' ***************************************');
                
                res.writeHead(200, { 
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                });
                
                res.end(JSON.stringify(''));
                
            }

        });



        sessionStorageClient = redis.createClient(
            pConfProp.sessionStorage.port, 
            pConfProp.sessionStorage.host, 
            {no_ready_check: true}
        );
                                    
        if (pConfProp.sessionStorage.password) {
            sessionStorageClient.auth(pConfProp.sessionStorage.password, function() {
                console.log(' - Redis client connected');
            });
        }else{
            console.log(' - Redis client connected without password.');
        }


        everyauth.helpExpress(app);

        app.listen(pConfProp.server.port);

        console.log('Express is started!!, port :%d', pConfProp.server.port);

        module.exports = app;



    }

    function addUser (source, sourceUser) {
        var user;
        user = usersById[++nextUserId] = {id: nextUserId};
        user[source] = sourceUser;
        return user;
    }

    function getHomeUrl(str){

        if(str.indexOf('https://') >= 0){
            if(str.substring(8).indexOf('/') >= 0){
                return str.substring(0, 8+str.substring(8).indexOf('/'));
            }else{
                return str;
            }
        } else if(str.indexOf('http://') >= 0){
            if(str.substring(7).indexOf('/') >= 0){
                return str.substring(0, 7+str.substring(7).indexOf('/'));
            }else{
                return str;
            }
        } else {
            if(str.indexOf('/') >= 0){
                return str.substring(0, str.indexOf('/'));
            }else{
                return str;
            }
        }

    }



    // [ public methods ]
    return {
        init: function (conf) {

            pConfProp = conf;
            messageServer_init();

        }
    };
}(everyauth, express, redis));





SODABOX.server.init(conf);

SODABOX.app.init(conf);



