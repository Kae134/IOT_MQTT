// Load environment variables
require('dotenv').config();

const mqtt = require('mqtt');
const WebSocket = require('ws');

// Configuration from environment variables
const MQTT_BROKER = process.env.MQTT_BROKER_URL;
const MQTT_TOPIC = process.env.MQTT_TOPIC_PATTERN || 'classroom/+/telemetry';
const WS_PORT = parseInt(process.env.WS_PORT) || 8080;

console.log('[CONFIG] Loaded from .env');
console.log(`[CONFIG] MQTT: ${MQTT_BROKER}`);
console.log(`[CONFIG] Topic: ${MQTT_TOPIC}`);
console.log(`[CONFIG] WebSocket: ${WS_PORT}`);

// Connect to MQTT broker
console.log('[MQTT] Connecting to broker...');
const mqttClient = mqtt.connect(MQTT_BROKER);

// Create WebSocket server
const wss = new WebSocket.Server({ port: WS_PORT });
console.log(`[WS] Server started on ws://localhost:${WS_PORT}`);

// Store connected WebSocket clients
const clients = new Set();

// MQTT connection handler
mqttClient.on('connect', () => {
  console.log('[MQTT] Connected to broker');
  console.log(`[MQTT] Subscribing to topic: ${MQTT_TOPIC}`);
  mqttClient.subscribe(MQTT_TOPIC, (err) => {
    if (err) {
      console.error('[MQTT] Subscription error:', err);
    } else {
      console.log('[MQTT] Subscription successful');
    }
  });
});

// MQTT message handler
mqttClient.on('message', (topic, message) => {
  console.log(`[MQTT] Message received on ${topic}`);
  
  try {
    const payload = JSON.parse(message.toString());
    
    // Extract deviceId from topic
    const deviceId = topic.split('/')[1];
    
    // Create message for WebSocket clients
    const wsMessage = {
      type: 'telemetry',
      deviceId: deviceId,
      topic: topic,
      payload: payload,
      timestamp: Date.now()
    };
    
    // Send to all connected WebSocket clients
    const messageStr = JSON.stringify(wsMessage);
    let sentCount = 0;
    
    clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(messageStr);
        sentCount++;
      }
    });
    
    console.log(`[WS] Sent to ${sentCount} client(s)`);
  } catch (error) {
    console.error('[ERROR] Parsing error:', error);
  }
});

// MQTT error handler
mqttClient.on('error', (error) => {
  console.error('[MQTT] Error:', error);
});

// WebSocket connection handler
wss.on('connection', (ws) => {
  console.log('[WS] New client connected');
  clients.add(ws);
  
  // Welcome message
  ws.send(JSON.stringify({
    type: 'connected',
    message: 'Connected to MQTT -> WebSocket bridge',
    timestamp: Date.now()
  }));
  
  // Disconnection handler
  ws.on('close', () => {
    console.log('[WS] Client disconnected');
    clients.delete(ws);
  });
  
  // Error handler
  ws.on('error', (error) => {
    console.error('[WS] Client error:', error);
    clients.delete(ws);
  });
});

// WebSocket server error handler
wss.on('error', (error) => {
  console.error('[WS] Server error:', error);
});

console.log('\n[BRIDGE] MQTT -> WebSocket bridge operational');
console.log(`[BRIDGE] MQTT: ${MQTT_BROKER}`);
console.log(`[BRIDGE] WebSocket: ws://localhost:${WS_PORT}`);
console.log('\n[INFO] Press Ctrl+C to stop\n');