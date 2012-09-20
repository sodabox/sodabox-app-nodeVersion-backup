
var   redis     = require(__dirname+'/node_modules/redis')
    , io        = require(__dirname+'/node_modules/socket.io')
    , zookeeper = require(__dirname+'/node_modules/zookeeper')
    , port      = process.env.PORT || 3000

    , confFilePath = __dirname+'/../conf/conf-server.js'

    , sessionStorage
    , messageStorages = []
    , messageStoragesChk = []
;

/* */
process.argv.forEach(function (item, index){
    if(item == '--conf'){
        confFilePath = process.argv[index+1];
    }
});
var conf = require(confFilePath);


console.log(" [STARTED] "+conf.server.host+":"+conf.server.port+"("+conf.server.channel+")\n");


/** ZOOKEEPER **/

var SOCKET_SERVER_PATH = '/SOCKET';

var zk = new zookeeper(
    {
        connect: conf.zookeeper.url,
        timeout: 1000,
        debug_level: zookeeper.ZOO_LOG_LEVEL_WARNING,
        host_order_deterministic: false
    }
);

zk.connect(function (err) {
	
	if(err) throw err;
	
	console.log (" [ZK:CONNECT] id=%s", zk.client_id);

	// SOCKET_SERVER_PATH
	zk.a_exists(SOCKET_SERVER_PATH, null, function ( rc, error, stat ){

		console.log(" [ZK:EXISTS] "+rc+", "+error+", "+stat );

		if(rc != 0){ // 존재하지 않는다면, rootPath 생성 
			zk.a_create (SOCKET_SERVER_PATH, null, ZooKeeper.ZOO_PERSISTENT, function (rc, error, path)  {
				if (rc != 0) {
					// ERROR :: 존재하지 않아서 생성했는데 에러 난 경우
					console.error ("  [ZK:**ERROR**] ("+SOCKET_SERVER_PATH+") %d, error: '%s', path=%s", rc, error, path);
				} else {
					createSocketServerZNode();
				}
			});
		}else{
			createSocketServerZNode();
		}

	});
});

var createSocketServerZNode = function(){
	
	zk.a_exists(SOCKET_SERVER_PATH, null,
		function ( rc, error, stat ){

			// @ TODO 같은 SocketServer 가 존재하면 안된다 체크 필요!!

			var zNodePath = "/"+conf.server.channel+":"+conf.server.host+":"+conf.server.port;
			zk.a_create (SOCKET_SERVER_PATH+zNodePath, JSON.stringify(conf), zookeeper.ZOO_EPHEMERAL, function (rc, error, path)  {
				if (rc != 0) {
					// ERROR :: 존재하지 않아서 생성했는데 에러 난 경우
					console.error ("  [ZK:**ERROR**] ("+SOCKET_SERVER_PATH+zNodePath+") %d, error: '%s', path=%s", rc, error, path);
				} else {
					console.log (" [ZK:CREATEED] %s", path);
					
					// do something...

					getMessageStorageList();
				}
		});
	});

};

var getMessageStorageList = function(){
	zk.aw_get_children(
		SOCKET_SERVER_PATH,
		function ( type, state, path ){
			console.log('  [WATCH] '+type+','+state+','+path);
			getMessageStorageList();
		},
		function(rc,error,children){


			console.log(' >>> '+rc+','+error+','+children);

			if(rc==0){
				children.forEach(function(child){

					console.log(child);

					zk.a_get( SOCKET_SERVER_PATH+'/'+child, false, function(rc, error, stat, data){

						console.log(' ---- '+rc+','+error+','+stat+','+data);

						if (a.hasOwnProperty(k)) {


						}else{

							var messageClient = redis.createClient(
						    	conf.sessionStorage.port, 
						        conf.sessionStorage.host, 
						        {no_ready_check: true}
							);
						                                
						    if (conf.sessionStorage.password) {
						        sessionStorageClient.auth(conf.sessionStorage.password, function() {
						            console.log(' - Redis client connected');
						        });
						    }
						}
					} );

				});

				for (var mk in messageStoragesChk) {
					if(!messageStoragesChk[mk]){
						
					}
				}
				
				
			}


			

			/*
			var result=[];
			if(rc==0){
				children.forEach(function(child){
					var info = child.split(':');
					result.push({
						channel: info[0],
						host: info[1],
						port: info[2]
					});
				});

				options.nodeCallback(result);
				
			}*/
		}
	);

};




/*


if(conf.sessionStorage.host === undefined || conf.sessionStorage.port === undefined){

    sessionStorageClient = redis.createClient();
    console.log(' - REDIS - localhost');

}else{
    sessionStorageClient = redis.createClient(
    	conf.sessionStorage.port, 
        conf.sessionStorage.host, 
        {no_ready_check: true}
	);
                                
    if (conf.sessionStorage.password) {
        sessionStorageClient.auth(conf.sessionStorage.password, function() {
            console.log(' - Redis client connected');
        });
    }
}

*/

var a = []; 
a[0] = 0
a['one'] = 1;
a['two'] = 2;
a['three'] = 3;

for (var k in a) {
    if (a.hasOwnProperty(k)) {
        console.log('key is: ' + k + ', value is: ' + a[k]);
    }
}
console.log(a.length);



