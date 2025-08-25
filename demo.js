#!/usr/bin/env node

import { spawn } from "child_process";
import crypto from "hypercore-crypto";
import b4a from "b4a";
import { setTimeout } from "timers/promises";

console.log("🚀 Starting Hyperswarm Demo");
console.log("This will show Alice and Bob connecting with enhanced logging");
console.log("=".repeat(80));

// Generate a shared topic
const topic = b4a.toString(crypto.randomBytes(32), "hex");
console.log(`📋 Shared Topic: ${topic}`);
console.log("=".repeat(80));

// Start Alice
console.log("👩 Starting Alice...");
const alice = spawn("node", ["main.js", "--name", "alice", "--topic", topic], {
  stdio: ["inherit", "pipe", "pipe"],
});

alice.stdout.on("data", (data) => {
  const lines = data
    .toString()
    .split("\n")
    .filter((line) => line.trim());
  lines.forEach((line) => console.log(`[ALICE] ${line}`));
});

alice.stderr.on("data", (data) => {
  console.log(`[ALICE ERROR] ${data}`);
});

// Wait a bit, then start Bob
await setTimeout(2000);

console.log("\n👨 Starting Bob...");
const bob = spawn("node", ["main.js", "--name", "bob", "--topic", topic], {
  stdio: ["inherit", "pipe", "pipe"],
});

bob.stdout.on("data", (data) => {
  const lines = data
    .toString()
    .split("\n")
    .filter((line) => line.trim());
  lines.forEach((line) => console.log(`[BOB] ${line}`));
});

bob.stderr.on("data", (data) => {
  console.log(`[BOB ERROR] ${data}`);
});

// Let them run for a while
console.log("\n⏱️  Letting peers discover each other for 10 seconds...");
await setTimeout(10000);

// Simulate Alice sending a message
console.log("\n📤 Alice sending message...");
alice.stdin.write("Hello Bob!\n");

await setTimeout(2000);

// Simulate Bob responding
console.log("📤 Bob responding...");
bob.stdin.write("Hi Alice! Nice to meet you.\n");

await setTimeout(3000);

// Show some commands
console.log("\n📋 Alice checking peers...");
alice.stdin.write("/peers\n");

await setTimeout(1000);

console.log("📋 Bob showing status...");
bob.stdin.write("/status\n");

await setTimeout(3000);

// Clean shutdown
console.log("\n🛑 Shutting down demo...");
alice.stdin.write("/quit\n");
bob.stdin.write("/quit\n");

await setTimeout(2000);

alice.kill("SIGTERM");
bob.kill("SIGTERM");

console.log("✅ Demo completed!");
console.log("=".repeat(80));
