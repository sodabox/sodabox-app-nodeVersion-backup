
var   redis     = require(__dirname+'/node_modules/redis')
    , io        = require(__dirname+'/node_modules/socket.io')
    , zookeeper = require(__dirname+'/node_modules/zookeeper')
    , confFilePath = __dirname+'/../conf/socketServer.js'
;

process.argv.forEach(function (item, index){
    if(item == '--conf'){
        confFilePath = process.argv[index+1];
    }
});
var conf = require(confFilePath);


console.log(" [STARTED] "+conf.server.host+":"+conf.server.port+"("+conf.server.channel+")\n");

var SODABOX = SODABOX || {};

SODABOX.server = (function (zookeeper, redis) {

    var ROOT_PATH = '/SODABOX_messageStorage';
    var pMessageStorageList = {};
    var pConfProp;
    var zk;

    // [ private methods ]
    function addServer(key, serverObj){
        if(!pMessageStorageList.hasOwnProperty[key]){
            // @ TODO 서버 연결!!
            pMessageStorageList[key] = serverObj
        }
        var _s = pMessageStorageList[key];
        _s['_lastCheckCount'] = pMessageStorageList['_lastCheckCount'];
    }
    function removeServer(key){
        delete pMessageStorageList[key];
    }
    function resetServers(serverObjList){
        var _lastCheckCount = pMessageStorageList['_lastCheckCount'] + 1;
        pMessageStorageList['_lastCheckCount'] = _lastCheckCount;
        for (var key in serverObjList) {
            addServer(key, serverObjList[key]);
        }
        for (var k in pMessageStorageList){
            var _d = pMessageStorageList[k];
            var k_lastCheckCount =_d['_lastCheckCount']
            if(k_lastCheckCount < _lastCheckCount) {
                removeServer(k);
            }
        }
    }


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

            // ROOT_PATH
            zk.a_exists(ROOT_PATH, null, function ( rc, error, stat ){

                console.log(" [ZK:EXISTS] "+rc+", "+error+", "+stat );

                if(rc != 0){ // 존재하지 않는다면, rootPath 생성
                    zk.a_create (ROOT_PATH, null, zookeeper.ZOO_PERSISTENT, function (rc, error, path)  {
                        if (rc != 0) {
                            // ERROR :: 존재하지 않아서 생성했는데 에러 난 경우
                            console.error ("  [ZK:**ERROR**] ("+ROOT_PATH+") %d, error: '%s', path=%s", rc, error, path);
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

        zk.a_exists(ROOT_PATH, null,
            function ( rc, error, stat ){

                // @ TODO 같은 SocketServer 가 존재하면 안된다 체크 필요!!

                console.log(JSON.stringify(pConfProp));

                var zNodePath = "/"+pConfProp.server.channel+":"+pConfProp.server.host+":"+pConfProp.server.port;
                zk.a_create (ROOT_PATH+zNodePath, JSON.stringify(pConfProp), zookeeper.ZOO_EPHEMERAL, function (rc, error, path)  {
                    if (rc != 0) {
                        // ERROR :: 존재하지 않아서 생성했는데 에러 난 경우
                        console.error ("  [ZK:**ERROR**] ("+ROOT_PATH+zNodePath+") %d, error: '%s', path=%s", rc, error, path);
                    } else {
                        console.log (" [ZK:CREATEED] %s", path);
                        zk_retrieveServerList();
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
                            if(pConfProp.server.channel != thisServerInfo[0] ){ // CHANNEL NAME
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
                            }

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

            zk_connect();
        },
        messageStorageList: pMessageStorageList
    };

}(zookeeper, redis));


SODABOX.socket = (function (io, redis) {

    var pConfProp;
    var messageStorageClient;
    var sessionStorageClient;

    function io_init(){

        io = io.listen(Number(pConfProp.server.port));
        io.enable('browser client minification');  // send minified client
        io.enable('browser client etag');          // apply etag caching logic based on version number
        io.enable('browser client gzip');          // gzip the file
        io.set('log level', 1);    
        io.set("origins = *");
        io.set('transports', 
            [
                'websocket'
                , 'flashsocket'
                , 'htmlfile'
                , 'xhr-polling'
                , 'jsonp-polling'
            ]);
        io.sockets.on('connection', function (socket) {
            
            socket.on('join', function(data){    
                
                socket._REF = socket.handshake.headers.referer;
                socket._AU  = data.AU;
                socket._CN  = data.CN;
                socket._UR  = data.UR;
                socket._MG  = data.MG;
                socket._SC  = socket.id;

                if(data.r){
                    if(data.r == 'HOMEURL'){
                        socket._REF = getHomeUrl(socket._REF);
                    }
                }

                socket._REF = escape(socket._REF);

                console.log(' > socket._REF : '+socket._REF );
                
                console.log(' **** socket.io [JOIN('+socket.id+')] **** \n'+
                            '       from page  : '+JSON.stringify(data)+ '\n'+
                            '      socket._REF : ' + socket._REF+ '\n'+
                            '      socket._AU  : ' + socket._AU+ '\n'+
                            '      socket._CN  : ' + socket._CN+ '\n'+
                            '      socket._UR  : ' + socket._UR+ '\n'+
                            '      socket._MG  : ' + socket._MG+ '\n'+
                            '      socket._SC  : ' + socket._SC+ '\n'
                );
                
                // 1. HSET
                sessionStorageClient.hset(socket._REF, socket._SC, JSON.stringify({CN: socket._CN, UR: socket._UR}), redis.print);   
                    
                // 2. HGET ALL
                sessionStorageClient.hgetall(socket._REF, function (err, channels) {
                    sendSystemMessage('IN', channels);
                });
                
                io.sockets.sockets[socket._SC].emit('join', {socketId: io.sockets.sockets[socket._SC].id});
                
                console.log(' **** ');
                
            });
            
            socket.on('disconnect', function(){
                
                console.log(' **** socket.io [DISCONNECT('+socket.id+')] **** \n'+
                            '      socket._REF : ' + socket._REF+
                            '      socket._SC  : ' + socket._SC
                );
                
                try{
                    // 1. HDEL
                    sessionStorageClient.hdel(socket._REF, socket._SC);
                    // 2. HGET ALL
                    sessionStorageClient.hgetall(socket._REF, function (err, channels) {
                        sendSystemMessage('OUT', channels);
                    });
                } catch(e) {
                    console.log(' **** ERROR **** : '+socket._REF+' / '+socket._SC);
                }
                console.log(' **** ');
            });
            
        });

        /* Session !! */

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

        /* Subscribed !! */
        messageStorageClient = redis.createClient(pConfProp.messageStorage.port, 
                                    pConfProp.messageStorage.host, 
                                    {no_ready_check: true});
        if (pConfProp.messageStorage.password) {
            messageStorageClient.auth(pConfProp.messageStorage.password, function() {
                console.log('Subscribed Redis publish client connected');
            });
        }

        messageStorageClient.on('subscribe', function (channel, count){
            console.log(' **** messageStorageClient [MESSAGE('+channel+')] **** '+count);
        });
        messageStorageClient.on('message', function (channel, msg){
            var data = JSON.parse(msg);
            
            console.log(' **** messageStorageClient [MESSAGE('+channel+')] **** \n'+JSON.stringify(data));
                
            if(data._type == 'S'){
                emitMessage(data._type, data.SC, data.MG, data._users);
            }else{
                emitMessage(data._type, data.SC, data.MG, data._from);
            }
        });

        messageStorageClient.subscribe(pConfProp.server.channel);
    }



    // ## message functions, sending to client ## //

    function sendSystemMessage(msgType, channels){
        
        var users = [];
        for (var s in channels) {
            var t = JSON.parse(channels[s]);
            users.push(t.UR);
        }
        
        for (var socketId in channels) {
            
            var c = JSON.parse(channels[socketId]);
            if( c.CN == pConfProp.server.channel ){
                emitMessage('S', socketId, msgType, users);
                
            }else{
                
                // ** MG, SC ** //
                SODABOX.server.messageStorageList[c.CN].publish( c.CN,   JSON.stringify({
                    MG : msgType,   // (MG - message)
                    SC : socketId,  // (SC - socket )
                    _type : 'S',     // S : system message
                    _users : users
                }));
            }
        }   
    }

    function emitMessage(argType, argSocketId, argMessage, user){
        
        try{        
            
            if(argType == 'S'){
                var params = {
                    UR : io.sockets.sockets[argSocketId]._UR,
                    MG : argMessage,
                    _type : argType,
                    _users : user
                };
                io.sockets.sockets[argSocketId].emit(argType+'_MSG', params);

            }else{
                var params = {
                    UR : user,
                    MG : argMessage,
                    _type : argType
                };
                io.sockets.sockets[argSocketId].emit(argType+'_MSG', params);
                
            }
           
            
            console.log(' **** socket.io [EMIT('+argType+'_MSG'+')] **** \n'+
                        '       from page  : '+JSON.stringify(params)
            );
            
            
            
        } catch(e) {
            console.log(' **** ERROR **** : '+io.sockets.sockets[argSocketId]);
            if(io.sockets.sockets[argSocketId]){
                console.log('           exec redisClient.hdel > '+argSocketId);
                sessionStorageClient.hdel(io.sockets.sockets[argSocketId]._REF, argSocketId);
            }
        }
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
            io_init();

        }
    };
}(io, redis));



SODABOX.server.init(conf);

SODABOX.socket.init(conf);
