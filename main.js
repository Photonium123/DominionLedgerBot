const { Client } = require('pg');
const Discord = require('discord.js');
const fs = require('fs');

const token = fs.readFileSync('./token.txt').toString().trim();
const pass = fs.readFileSync('./password.txt').toString().trim();

const db = new Client({
  user: 'postgres',
  host: 'localhost',
  database: 'dominion',
  password: pass
}); 


const client = new Discord.Client();

client.on('ready', () => {
  console.log("Logged in as " + client.user.tag);
});

client.on('message', msg => {
  if(msg.content == "reinitialize") {
    // initialize database 
  }
  else if(msg.content.length > 5  && msg.content.substring(0,5) == "!win ") {
    // add win

    // extract player ids

    /*let res = string.split(' ');
    let playerIDs = []

    for(let i = 1; i < res.length; i++) {
        
    }

    f*/

    console.log(msg.mentions.members.array());
  }

  if(msg.content == "ping") {
    msg.reply("Pong!");
  }
});


console.log("starting...");
client.login(token);
