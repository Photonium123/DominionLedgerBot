const { Client } = require('pg');
const Discord = require('discord.js');
const fs = require('fs');

const token =  fs.readFileSync('./token.txt').toString().trim();

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
  if(msg.content == "ping") {
    msg.reply("Pong!");
  }
});


console.log("starting...");
client.login(token);
