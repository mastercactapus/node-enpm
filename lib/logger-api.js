var api = {};


["progress", "debug", "error", "fatal", "info", "ok"].forEach(function(method){
    api[method] = function(){};
});

module.exports = api;
