module.exports = { 

    server: {
    	host : '127.0.0.1',
    	port : '9002',
    	channel : 'CH02'
    },
    
    zookeeper: {
    	url : 'localhost:2181'
    },
    
    messageStorage: {
    	host : '127.0.0.1',
    	port : '9902',
        password: 'redispassword'
    },
    
    sessionStorage: {
    	host : '127.0.0.1',
    	port : '8801',
        password: 'redispassword'
    }

};
