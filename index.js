import express from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';
import { randomUUID } from 'crypto'
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: 'https://alex5ander.itch.io/coding-racer' } });
// const io = new Server(server, { cors: { origin: 'https://html-classic.itch.zone' } });
// const io = new Server(server, { cors: { origin: '*' } });

app.use(express.static('public'));

server.listen(3000, () => console.log("Server listen on http://localhost:3000"));

const codes = [
  `def fibonacci(n):
  a, b = 0, 1
  for _ in range(n):
      yield a
      a, b = b, a + b`,

  `function reverseString(str) {
  return str.split('').reverse().join('');
}`,

  `public class HelloWorld {
  public static void main(String[] args) {
      System.out.println("Hello, World!");
  }
}`,

  `int factorial(int n) {
  return (n == 1 || n == 0) ? 1 : n * factorial(n - 1);
}`,

  `10.times do |i|
  puts "Iteration \#{i}"
end`,

  `class Program {
  static void Main() {
      Console.WriteLine("Enter your name:");
      string name = Console.ReadLine();
      Console.WriteLine("Hello " + name);
  }
}`,

  `<?php
function isEven($num) {
  return $num % 2 == 0;
}
?>`,

  `package main
import "fmt"

func main() {
  fmt.Println("Hello, Go!")
}`,

  `let names = ["Anna", "Alex", "Brian", "Jack"]
for name in names {
  print("Hello, \\(name)!")
}`,

  `fun greet(name: String): String {
  return "Hello, \$name!"
}`
];

class Player {
  constructor(id) {
    this.id = id;
    this.name = "";
    this.character = 0;
    this.typed = "";
    this.progress = 0;
  }
}

class Room {
  constructor() {
    this.id = randomUUID();
    this.text = codes[Math.floor(Math.random() * codes.length)];
    /** @type {Player[]} */
    this.players = [];
    this.started = false;
  }
}

/** @type {Room[]} */
let rooms = [];

/** @param {Room} room */
const update = (room) => {
  for (let i = 0; i < room.players.length; i++) {
    let player = room.players[i];
    let players = room.players.sort((e) => e.id == player.id ? -1 : 0).map(({ progress, name, character }) => ({ progress, name, character }));
    io.to(player.id).emit("update", { players });
  }
}

/** 
 * @param {Socket} socket 
 * @param {Room} room
 */
const OnDisconnect = (socket, room) => {
  socket.on('disconnect', () => {
    const player = room.players.find(e => e.id == socket.id);
    room.players = room.players.filter(e => e.id != socket.id);
    rooms = rooms.filter(e => e.players.length != 0);
    if (player) {
      console.log(`Player ${player.name} disconnected`);
    }
    io.to(room.id).emit('opponent_disconnected');
  });
}

/** 
 * @param {Socket} socket 
 * @param {Room} room
 */
const OnTyping = (socket, room) => {
  socket.on('typing', (typed, callback) => {

    if (typed.length > room.text.length || room.players.length != 2) {
      return;
    }

    const player = room.players.find(e => e.id == socket.id);

    player.typed = typed;

    let classes = [];

    for (let i = 0; i < room.text.length; i++) {

      if (typed[i] != undefined) {

        let type = typed[i].charCodeAt();
        let txt = room.text[i].charCodeAt();

        classes.push(type == txt ? "correct" : "error");
      } else {
        classes.push("");
      }
    }

    player.progress = classes.reduce((prev, current) => {
      if (current == "correct") {
        prev += 1;
      }
      return prev
    }, 0);

    update(room);
    callback(classes);

    if (player.typed == room.text) {
      io.to(room.id).emit('end', player.name);
      rooms = rooms.filter(e => e.id != room.id);
    }
  });
}

/**
 * @param {Socket} socket 
 * @param {Room} room 
 * @param {Player} player 
 */
const OnJoin = (socket, room, player) => {
  socket.on('join', ({ name, character }) => {
    console.log(`player ${name} join`)
    player.name = name;
    player.character = character;
    room.players.push(player);
    socket.join(room.id);

    if (room.players.length == 2) {
      io.to(room.id).emit('start', { text: room.text });
      update(room);
    }
  });
}

/** @param {Socket} socket */
const OnConnection = (socket) => {
  let room = rooms.find(room => room.players.length < 2);
  let player = new Player(socket.id);

  if (!room) {
    room = new Room();
    rooms.push(room);
  }

  OnJoin(socket, room, player);
  update(room);
  OnDisconnect(socket, room);
  OnTyping(socket, room);
}

io.on('connection', OnConnection);