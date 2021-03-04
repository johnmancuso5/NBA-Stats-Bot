const fs = require("fs");
const url = require("url");
const http = require("http");
const https = require("https");
const crypto= require("crypto");

const port = 3000;
const server = http.createServer();
var Twit = require('twit');

/*
https://github.com/draftbit/twitter-lite
https://medium.com/jspoint/introduction-to-node-js-a-beginners-guide-to-node-js-and-npm-eca9c408f9fe
*/

var config = require('./config');

var T = new Twit(config);

server.on("listening", listen_handler)
function listen_handler(){
    console.log(`Now Listening on Port ${port}`); 
}

let player_states = [];
const count = {counter : 0};


server.on("request", request_handler);
function request_handler(req, res){
    console.log(`New Request from ${req.socket.remoteAddress} for ${req.url}`);
    if(req.url === "/"){
        res.writeHead(200, {"Content-Type": "text/html"});
        const html_stream = fs.createReadStream("./html/form.html");  /// Takes our html when we open up our website
        html_stream.pipe(res);
        console.log(player_states);
    }
    else if (req.url.startsWith("/search")){
        const {player} = url.parse(req.url, true).query;

        if(player === null){
            not_found(res);
        }

        const state = crypto.randomBytes(20).toString("hex");

        player_states.push({player, state});
        let player_name = player_states[count.counter++].player;
        
        console.log(player_name);

        get_player_info(player_name, res);
    }

    else{
        not_found(res);
    }
}

function not_found(res){
    res.writeHead(404, {"Content-Type": "text/html"});
    res.end(`<h1>404 Not Found</h1>`);
}

// Used to get the players ID
function get_player_info(player, res){
    const player_endpoint = `https://www.balldontlie.io/api/v1/players?search=${player}`;

	https.request(player_endpoint, {method:"GET"}, process_stream).end();	
	
	function process_stream (player_stream){	
		let player_data = "";
		player_stream.on("data", chunk => player_data += chunk);	
        player_stream.on("end", () => get_player_id(player_data, player, res));
    }
    
}

function get_player_id(player_data, player_name, res){
    const JSONresponse = JSON.parse(player_data);

    let player = JSON.parse(player_data);
    let player_count = JSONresponse.meta.total_count;

    if(player_count === 0){
        not_found(res);
    }

    else{
        let player_id = player.data[0].id;                  // Takes the player id
        get_player_stats(player_id, player_name, res);
    }

}

function get_player_stats(player_id, player_name, res){
    const stats_endpoint = `https://www.balldontlie.io/api/v1/season_averages?player_ids[]=${player_id}`;

    https.request(stats_endpoint, {method:"GET"}, process_stream)	
    .end();

    function process_stream (player_stream){	
		let player_data = "";
		player_stream.on("data", chunk => player_data += chunk);	
		player_stream.on("end", () => stats_results(player_data, player_name, res));
	}
}

function stats_results(player_data, player_name, res){
    let results = JSON.parse(player_data);

    var tweet = {
        status: `${player_name} Stats:\nPPG: ${results.data[0].pts} REB: ${results.data[0].reb} AST: ${results.data[0].ast}`
    }

    T.post('statuses/update', tweet, tweet_callback);

    function tweet_callback(err, data, response){
        if(err){
            console.log("Couldn't tweet.")
        }
        else{
            console.log("Tweeted");
        }
    }
}



server.listen(port);