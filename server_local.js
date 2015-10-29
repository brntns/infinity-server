var http = require('http');
var sockjs = require('sockjs');
// var pty = require('pty');

var echo = sockjs.createServer();

var mysql = require('mysql');

var db_conf = {
    host     : 'localhost',
    user     : '',
    password : '',
    database : 'infinity'
};

var connection;
var messages = [];
var clients = [];
var flagcount = '';
//
// var term = pty.spawn('bash', [], {
//   name: 'xterm-color',
//   cols: 80,
//   rows: 30,
//   cwd: process.env.HOME,
//   env: process.env
// });
//
// term.on('data', function(data) {
//   console.log(data);
//     var update = {id:'nethack', data:data,client:clients.length};
//
//     broadcast(JSON.stringify(update));
//
// });






// Populating messages array

connection = mysql.createConnection(db_conf);

connection.query('SELECT message, id, flag from messages ORDER BY id ASC', function(err, rows, fields) {

    if (err) throw err;

    for(var x = 0; x < rows.length; x++){

        var getMessages = {'message':rows[x].message,'flag':rows[x].flag,'id':rows[x].id};

        messages.push(getMessages);

    }
    connection.end();
});

echo.on('connection', function(conn) {

    clients.push(conn);
    console.log('Opening ' + conn.id + clients);

    var initdata = {id:'init',data:messages,client:clients.length};

    conn.write(JSON.stringify(initdata));

    conn.on('data', function(message) {

        var flagId = new RegExp("/flag [0-9]", "g");
        // var shell = new RegExp("$", "g");
        // var nethack = new RegExp("/fortune", "g");
        var rlMsg = new RegExp("/add [a-z]", "g");

        // if(message.match(shell)){
        //     var cmmd = message.replace('$','');
        //     term.write(cmmd +  '\r');
        // }
        // if(message.match(nethack)){
        //     var cmmd = message.replace('/','');
        //     term.write(cmmd);
        // }

        if(message.match(flagId)){

            var flagId = message.replace('/flag ','');
            var getFlags = 'SELECT flag FROM messages WHERE id=' + connection.escape(flagId);

            connection = mysql.createConnection(db_conf);

            connection.query(getFlags, [message], function(err, results) {
                if (err) throw err;
                getNewFlag(message, results, flagId);
            });

        }
        if(message.match(rlMsg)){

            connection = mysql.createConnection(db_conf);
             var Msg = message.replace('/add ','');

            connection.query('INSERT INTO messages (message) VALUES (?)', [Msg], function(err, results) {
                if (err) throw err;

            });

            messages = [];

            connection.query('SELECT message, id, flag from messages ORDER BY id ASC', function(err, rows, fields) {
                if (err) throw err;

                for(var  x= 0; x < rows.length; x++){

                    var getMessages = {'message':rows[x].message,'flag':rows[x].flag,'id':rows[x].id};
                    messages.push(getMessages);


                }

                var update = {id:'init', data:messages,client:clients.length};

                broadcast(JSON.stringify(update));

                connection.end();
            });
        }

    });

    conn.on('close', function() {

      for(var i = 0; i < clients.length; i++){

          if(clients[i].id === conn.id){
              console.log('deleting ' + conn.id + '! ' + clients.length + ' clients remaining')
              clients.splice(i,1);
          }
          else{
              console.log('failed deleting closed connection');
          }
      }
    });
});

function broadcast(msg){

    for(var c = 0; c < clients.length; c++){
        clients[c].write(msg);
    }
}

function getNewFlag(message, results, flagId) {

    for(var x = 0; x < results.length; x++){

        flagcount = results[x].flag + 1;

    }

    var deleteQuery = 'DELETE FROM messages WHERE id =' + connection.escape(flagId);
    var pushFlags = 'UPDATE messages SET flag='+ flagcount +' WHERE id=' + connection.escape(flagId);

    connection = mysql.createConnection(db_conf);

    if(flagcount >= 5){

        connection.query(deleteQuery, [message], function(err, results) {


        });
        for(var y = 0; y < messages.length; y++){

                if(messages[y].id == flagId){

                    var splice = true;
                    var cut = y;

                }
        }
        if(splice === true){
            console.log(flagId + ' has more than 5 flags and got deleted');

            messages.splice(cut,1);

            var update = {id:'init', data:messages,client:clients.length};

            broadcast(JSON.stringify(update));
        }

    }
    else{

        connection.query(pushFlags, [message], function(err, results) {

        });
        messages = [];

        connection.query('SELECT message, id, flag from messages ORDER BY id ASC', function(err, rows, fields) {
            if (err) throw err;

            for(var  x= 0; x < rows.length; x++){

                var getMessages = {'message':rows[x].message,'flag':rows[x].flag,'id':rows[x].id};
                messages.push(getMessages);


            }
               console.log(flagId + ' now has '+ flagcount + ' flags');
                var update = {id:'init', data:messages,client:clients.length};

                broadcast(JSON.stringify(update));

                connection.end();
        });



    }
}
var server = http.createServer();
echo.installHandlers(server, {prefix:'/echo'});
var port = process.env.PORT || 5000;
server.listen(port, 'localhost');
