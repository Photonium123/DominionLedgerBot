const { Client } = require('pg');
const Discord = require('discord.js');
const fs = require('fs');

let db;

if(process.env.DATABASE_URL) {
  db = new Clinet({
    connectionString: process.env.DATABASE_URL,
    ssl: true
  }); 
}
else {
  const pass = fs.readFileSync('./password.txt').toString().trim();

  db = new Client({
    user: 'postgres',
    host: 'localhost',
    database: 'dominion',
    password: pass
  });
}

db.connect();

const client = new Discord.Client();

function stringsToID(stris) {
  let num = 0;

  for(let j = 0; j < stris.length; j++) {
    stri = stris[j];

    for(let i = 0; i < stri.length; i++) {
      num += stri.charCodeAt(i); 
    }
  }

  return num;
}

client.on('ready', () => {
  console.log("Logged in as " + client.user.tag);
});

client.on('message', msg => {
  if(msg.content == "!help") {
    msg.reply("Commands:\n`!help`: show this message\n`!prepdb`: update db for server\n`!win`: add a win\n`!data`: get data for a matchup\n`!alldata`: get all win data for a player (coming soon...)");   
  }

  else if(msg.content == "!prepdb") {
    // initialize database 
    let members = msg.guild.members.array();

    let playerIDs = [];
    for(let i = 0; i < members.length; i++) {
      if(members[i].user.id != client.user.id) {
        playerIDs.push(members[i].user.id);
      }
    }

    db.query("SELECT relname FROM pg_class WHERE relname = 's" + msg.guild.id + "'", (err, res) => {
      if(err) throw err;
        
      // table doesn't exist
      if(res.rows == 0) {
        let tablestr = " ( id integer primary key, date text";
        for(let i = 0; i < playerIDs.length; i++) {
          tablestr += ", u" + playerIDs[i] + " integer";
        }

        tablestr += " )";

        let q = "CREATE TABLE s" + msg.guild.id + tablestr;
        //console.log(q); 
        db.query(q, (err2, res2) => {
          if(err2) throw err2;
        });

        msg.reply("New table created...");

        let subsets = [];
        for(let i = 0; i < (1 << playerIDs.length); i++) {
          let subset = []; 

          let mask = i;
          let pos = playerIDs.length - 1;

          while(mask > 0) {
            if(mask & 1 == 1) {
              subset.push(playerIDs[pos])
            }

            mask = mask >> 1;
            pos--;
          }

          if(subset.length > 1) {
            subsets.push(subset);
          }
        }
   
        for(let i = 0; i < subsets.length; i++) {
          //let qstring = "SELECT * FROM s" + msg.guild.id + " WHERE "; 
          let potentialstring = "INSERT INTO s" + msg.guild.id + " (id, ";
          let endstring = "(" + stringsToID(subsets[i]) + ", ";

          for(let j = 0; j < subsets[i].length; j++) {
            if(j != subsets[i].length - 1) {
              //qstring += "u" + subsets[i][j] + ">=0 AND "
              potentialstring += "u" + subsets[i][j] + ", "; 
              endstring += "0, "; 
            }
            else {
              //qstring += "u" + subsets[i][j] + ">=0"
              potentialstring += "u" + subsets[i][j] + ")";
              endstring += "0)";
            }
          }

          //db.query(qstring, (err2, res2) => {
            //if(err2) throw err2;

            //if(res2.rows.length == 0) {
              // row doesn't exist, safe to add it
              db.query(potentialstring + " VALUES " + endstring, err3 => {
                if(err3) throw err3; 
              });
           // }
          //});

          //console.log(qstring, potentialstring + " VALUES " +  endstring);
        }

        msg.reply("New rows added!");
      }
  
      // add new columns
      else {
        for(let i = 0; i < playerIDs.length; i++) {
          let columnstr = "ALTER TABLE " + msg.guild.id + " ADD COLUMN " + playerIDs[i] + " INTEGER";

          db.query(columnstr, err2 => {
            if(err) throw err;
          });
        }

        msg.reply("Table already created, new users added...");

        let subsets = [];
        for(let i = 0; i < (1 << playerIDs.length); i++) {
          let subset = []; 

          let mask = i;
          let pos = playerIDs.length - 1;

          while(mask > 0) {
            if(mask & 1 == 1) {
              subset.push(playerIDs[pos])
            }

            mask = mask >> 1;
            pos--;
          }

          if(subset.length > 1) {
            subsets.push(subset);
          }
        }
   
        for(let i = 0; i < subsets.length; i++) {
          let qstring = "SELECT * FROM s" + msg.guild.id + " WHERE "; 
          let potentialstring = "INSERT INTO s" + msg.guild.id + " (";
          let endstring = "(" + stringsToID(subsets[i]) + ", ";

          for(let j = 0; j < subsets[i].length; j++) {
            if(j != subsets[i].length - 1) {
              qstring += "u" + subsets[i][j] + ">=0 AND "
              potentialstring += "u" + subsets[i][j] + ", "; 
              endstring += "0, "; 
            }
            else {
              qstring += "u" + subsets[i][j] + ">=0"
              potentialstring += "u" + subsets[i][j] + ")";
              endstring += "0)";
            }
          }

          db.query(qstring, (err2, res2) => {
            if(err2) throw err2;

            if(res2.rows.length == 0) {
              // row doesn't exist, safe to add it
              db.query(potentialstring + " VALUES " + endstring, err3 => {
                if(err3) throw err3; 
              });
            }
          });
        }

        msg.reply("New rows added!"); 
      }
    });
  }

  else if(msg.content.length > 5 && (msg.content.substring(0,5) == "!win " || msg.content.substring(0,5) == "!pin ")) {
    // add win

    // extract mentioned ids
    let res = msg.content.split(' ');

    let players = new Set();
    let winner = null;

    for(let i = 1; i < res.length; i++) {
      let uid = res[i].substring(2, res[i].length - 1);
      let user = client.users.find(user => user.id == uid);
      
      if(user == null) {
        msg.reply("Invalid syntax (user not found). Usage: `!win <winner> <player2> <player3> ... <playerN>`"); 
        return;
      }

      if(i == 1) {
        winner = user.id;
      }

      players.add(user.id);
    }

    console.log("Winner: " + winner);
    console.log(players);

    let playerArr = Array.from(players);
    if(playerArr.length < 2) {
      msg.reply("Need at least two users in the game!");
      return;
    }

    let query = "UPDATE s" + msg.guild.id + " SET u" + winner + " = u" + winner + " + 1 WHERE id=" + stringsToID(playerArr);
    let query2 = "UPDATE s" + msg.guild.id + " SET date=concat(date, '" + (new Date()).toUTCString() + ";') WHERE id=" + stringsToID(playerArr);

    db.query(query, err => {
      if(err) throw err;

      // pin = previous win, don't record date
      if(msg.content.substring(0,5) == "!win ") {
        db.query(query2, err2 => {
          if(err2) throw err2; 
        });
      }


      let q = "SELECT * from s" + msg.guild.id + " WHERE id=" + stringsToID(playerArr);

      db.query(q, (err, res) => {
        if(err) throw err;

        let str = "";
        for(let i = 0; i < playerArr.length; i++) {
          let uname = client.users.get(playerArr[i]).username;
          let score = res.rows[0]["u" + playerArr[i]];

          str += "\n" + uname + ": " + score;
        }

        msg.reply("```" + str + "```");
        console.log(q);
      });
    });  

    console.log(query);
    console.log(query2);
  }

  else if(msg.content.length > 6 && msg.content.substring(0, 6) == "!data ") {
    // get one data

    // extract mentioned ids
    let res = msg.content.split(' ');

    let players = new Set();

    for(let i = 1; i < res.length; i++) {
      let uid = res[i].substring(2, res[i].length - 1);
      let user = client.users.find(user => user.id == uid);
      
      if(user == null) {
        msg.reply("Invalid syntax (user not found). Usage: `!data <player1> <player2> ... <playerN>`"); 
        return;
      }

      players.add(user.id);
    }

    console.log(players);

    let playerArr = Array.from(players);
    if(playerArr.length < 2) {
       msg.reply("Need at least two users to obtain data. Perhaps you meant to use !alldata?");
       return;
    }

    let query = "SELECT * from s" + msg.guild.id + " WHERE id=" + stringsToID(playerArr);

    db.query(query, (err, res) => {
      if(err) throw err;

      let str = "";
      for(let i = 0; i < playerArr.length; i++) {
        let uname = client.users.get(playerArr[i]).username;
        let score = res.rows[0]["u" + playerArr[i]];

        str += "\n" + uname + ": " + score;
      }

      msg.reply("```" + str + "```");
    });

    console.log(query);
  }
});


console.log("starting...");

if(process.env.TOKEN) {
  client.login(process.env.TOKEN); 
}
else {
  const token = fs.readFileSync('./token.txt').toString().trim();
  client.login(token);
}
