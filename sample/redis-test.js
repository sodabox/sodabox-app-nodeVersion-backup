var   redis     = require(__dirname+'/node_modules/redis')
    , io        = require(__dirname+'/node_modules/socket.io')
    , zookeeper = require(__dirname+'/node_modules/zookeeper')
    , port      = process.env.PORT || 3000

    , confFilePath = __dirname+'/../conf/conf-server.js'

    , sessionStorage
    , messageStorages = []
    , checkCount = 1;
;

/* */
process.argv.forEach(function (item, index){
    if(item == '--conf'){
        confFilePath = process.argv[index+1];
    }
});
var conf = require(confFilePath);


console.log(" [STARTED] "+conf.server.host+":"+conf.server.port+"("+conf.server.channel+")\n");