module.exports = { 

    server: {
    	host : '127.0.0.1',
    	port : '9001',
    	channel : 'CH01'
    },
    
    zookeeper: {
    	url : 'localhost:2181'
    },
    
    messageStorage: {
    	host : '127.0.0.1',
    	port : '9901',
        password: 'redispassword'
    },
    
    sessionStorage: {
    	host : '127.0.0.1',
    	port : '8801',
        password: 'redispassword'
    }

};
