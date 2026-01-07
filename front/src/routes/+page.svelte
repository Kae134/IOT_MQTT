<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  
  // Location configuration
  const LOCATIONS: Record<string, { name: string; country: string }> = {
    'esp32-01': { name: 'Paris', country: 'France' },
    'esp32-02': { name: 'Tokyo', country: 'Japan' },
    'esp32-03': { name: 'New York', country: 'USA' },
    'esp32-04': { name: 'Sydney', country: 'Australia' },
    'esp32-05': { name: 'Rio', country: 'Brazil' }
  };
  
  // State
  let ws: WebSocket | null = null;
  let connected = false;
  let devices: Map<string, any> = new Map();
  let messageCount = 0;
  let filterLocation = 'all';
  let showStats = true;
  
  // Thresholds
  const ONLINE_THRESHOLD = 5;
  const WARNING_THRESHOLD = 30;
  
  /**
   * Get location information for a device
   */
  function getLocationInfo(deviceId: string) {
    return LOCATIONS[deviceId] || { 
      name: deviceId, 
      country: 'Unknown' 
    };
  }
  
  /**
   * Determine device status (online/warning/offline)
   */
  function getDeviceStatus(lastSeen: string): string {
    const now = Date.now();
    const lastSeenTime = new Date(lastSeen).getTime();
    const secondsAgo = (now - lastSeenTime) / 1000;
    
    if (secondsAgo < ONLINE_THRESHOLD) return 'online';
    if (secondsAgo < WARNING_THRESHOLD) return 'warning';
    return 'offline';
  }
  
  /**
   * Format time since last update
   */
  function formatTimeSince(isoString: string): string {
    const date = new Date(isoString);
    const now = Date.now();
    const seconds = Math.floor((now - date.getTime()) / 1000);
    
    if (seconds < 5) return 'now';
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return date.toLocaleTimeString();
  }
  
  // Reactive computed values
  $: filteredDevices = Array.from(devices.values()).filter(device => {
    if (filterLocation === 'all') return true;
    return device.deviceId === filterLocation;
  });
  
  $: onlineCount = filteredDevices.filter(
    d => getDeviceStatus(d.lastSeen) === 'online'
  ).length;
  
  $: avgTemp = filteredDevices.length > 0
    ? filteredDevices.reduce((sum, d) => sum + (d.tempC || 0), 0) / filteredDevices.length
    : 0;
  
  $: avgHum = filteredDevices.length > 0
    ? filteredDevices.reduce((sum, d) => sum + (d.humPct || 0), 0) / filteredDevices.length
    : 0;
  
  $: avgBattery = filteredDevices.length > 0
    ? filteredDevices.reduce((sum, d) => sum + (d.batteryPct || 0), 0) / filteredDevices.length
    : 0;
  
  /**
   * Connect to WebSocket server
   */
  function connectWebSocket() {
    console.log('[WS] Connecting...');
    
    ws = new WebSocket('ws://localhost:8080');
    
    ws.onopen = () => {
      console.log('[WS] Connected');
      connected = true;
    };
    
    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        if (message.type === 'telemetry') {
          messageCount++;
          
          const deviceData = {
            deviceId: message.deviceId,
            ...message.payload,
            lastSeen: new Date().toISOString()
          };
          
          devices.set(message.deviceId, deviceData);
          devices = devices; // Force reactivity
          
          console.log(`[DATA] ${message.deviceId}: ${message.payload.tempC}°C`);
        }
      } catch (error) {
        console.error('[ERROR] Parse error:', error);
      }
    };
    
    ws.onerror = (error) => {
      console.error('[WS] Error:', error);
      connected = false;
    };
    
    ws.onclose = () => {
      console.log('[WS] Disconnected');
      connected = false;
      
      // Auto-reconnect after 3s
      setTimeout(() => {
        console.log('[WS] Reconnecting...');
        connectWebSocket();
      }, 3000);
    };
  }
  
  // Periodic status update
  let statusInterval: number;
  
  onMount(() => {
    connectWebSocket();
    
    // Check device status every second
    statusInterval = setInterval(() => {
      devices = new Map(devices); // Force UI update
    }, 1000) as unknown as number;
  });
  
  onDestroy(() => {
    if (ws) ws.close();
    if (statusInterval) clearInterval(statusInterval);
  });
</script>

<main>
  <div class="terminal">
    <!-- Header -->
    <div class="header">
      <div class="header-line">
        <span class="prompt">root@weather:~$</span>
        <span class="command">./weather-monitor</span>
      </div>
      <div class="status-line">
        <span class="status-item">
          <span class="label">STATUS:</span>
          <span class:connected class:disconnected={!connected}>
            {connected ? '[CONNECTED]' : '[DISCONNECTED]'}
          </span>
        </span>
        <span class="status-item">
          <span class="label">MESSAGES:</span>
          <span class="value">{messageCount}</span>
        </span>
        <span class="status-item">
          <span class="label">STATIONS:</span>
          <span class="value">{devices.size}</span>
        </span>
      </div>
    </div>

    <!-- Controls -->
    <div class="controls">
      <label>
        <span class="label">FILTER:</span>
        <select bind:value={filterLocation} class="select">
          <option value="all">all ({devices.size})</option>
          {#each Object.entries(LOCATIONS) as [deviceId, location]}
            <option value={deviceId}>{location.name}</option>
          {/each}
        </select>
      </label>
      
      <button 
        class="toggle-btn" 
        on:click={() => showStats = !showStats}
      >
        [{showStats ? 'hide' : 'show'}] stats
      </button>
    </div>

    <!-- Stats Panel -->
    {#if showStats && filteredDevices.length > 0}
      <div class="stats">
        <div class="stat">
          <span class="stat-label">AVG TEMP:</span>
          <span class="stat-value">{avgTemp.toFixed(1)}°C</span>
        </div>
        <div class="stat">
          <span class="stat-label">AVG HUM:</span>
          <span class="stat-value">{avgHum.toFixed(1)}%</span>
        </div>
        <div class="stat">
          <span class="stat-label">AVG BAT:</span>
          <span class="stat-value">{avgBattery.toFixed(0)}%</span>
        </div>
        <div class="stat">
          <span class="stat-label">ONLINE:</span>
          <span class="stat-value">{onlineCount}/{filteredDevices.length}</span>
        </div>
      </div>
    {/if}

    <!-- Alerts -->
    {#if !connected}
      <div class="alert error">
        [ERROR] Connection lost. Retrying...
      </div>
    {/if}

    {#if connected && devices.size === 0}
      <div class="alert info">
        [INFO] Waiting for data from ESP32 devices...
      </div>
    {/if}

    <!-- Devices Grid -->
    <div class="devices">
      {#each filteredDevices as device (device.deviceId)}
        {@const location = getLocationInfo(device.deviceId)}
        {@const status = getDeviceStatus(device.lastSeen)}
        
        <div class="device" class:online={status === 'online'} class:warning={status === 'warning'} class:offline={status === 'offline'}>
          <div class="device-header">
            <div class="device-id">{location.name}</div>
            <div class="device-status">
              [{status === 'online' ? 'ONLINE' : status === 'warning' ? 'STALE' : 'OFFLINE'}]
            </div>
          </div>
          
          <div class="device-location">{location.country}</div>
          
          <div class="metrics">
            <div class="metric">
              <span class="metric-label">TEMP:</span>
              <span class="metric-value">{device.tempC?.toFixed(1) ?? '--'}°C</span>
            </div>
            <div class="metric">
              <span class="metric-label">HUM:</span>
              <span class="metric-value">{device.humPct?.toFixed(1) ?? '--'}%</span>
            </div>
            <div class="metric">
              <span class="metric-label">BAT:</span>
              <span class="metric-value" class:low={device.batteryPct < 20}>
                {device.batteryPct ?? '--'}%
              </span>
            </div>
          </div>
          
          <div class="device-footer">
            <div class="footer-item">
              <span class="footer-label">LAST:</span>
              <span class="footer-value">{formatTimeSince(device.lastSeen)}</span>
            </div>
            <div class="footer-item">
              <span class="footer-label">SEQ:</span>
              <span class="footer-value">#{device.seq ?? '--'}</span>
            </div>
          </div>
        </div>
      {/each}
    </div>

    {#if filteredDevices.length === 0 && devices.size > 0}
      <div class="alert info">
        [INFO] No stations match the current filter.
      </div>
    {/if}
  </div>
</main>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    background: #000;
    color: #0f0;
    font-family: 'Courier New', 'Monaco', monospace;
    font-size: 14px;
    line-height: 1.4;
  }

  main {
    min-height: 100vh;
    padding: 20px;
  }

  .terminal {
    max-width: 1200px;
    margin: 0 auto;
  }

  /* === HEADER === */
  .header {
    border: 1px solid #0f0;
    padding: 10px;
    margin-bottom: 20px;
  }

  .header-line {
    margin-bottom: 10px;
  }

  .prompt {
    color: #0f0;
  }

  .command {
    color: #fff;
    margin-left: 5px;
  }

  .status-line {
    display: flex;
    gap: 20px;
    flex-wrap: wrap;
  }

  .status-item {
    display: flex;
    gap: 5px;
  }

  .label {
    color: #888;
  }

  .value {
    color: #fff;
  }

  .connected {
    color: #0f0;
  }

  .disconnected {
    color: #f00;
  }

  /* === CONTROLS === */
  .controls {
    display: flex;
    gap: 20px;
    margin-bottom: 20px;
    padding: 10px;
    border: 1px solid #333;
    align-items: center;
  }

  .select {
    background: #000;
    color: #0f0;
    border: 1px solid #0f0;
    padding: 5px 10px;
    font-family: inherit;
    font-size: inherit;
    cursor: pointer;
  }

  .select:focus {
    outline: none;
    border-color: #fff;
  }

  .toggle-btn {
    background: #000;
    color: #0f0;
    border: 1px solid #0f0;
    padding: 5px 15px;
    font-family: inherit;
    font-size: inherit;
    cursor: pointer;
    transition: all 0.2s;
  }

  .toggle-btn:hover {
    background: #0f0;
    color: #000;
  }

  /* === STATS === */
  .stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 10px;
    margin-bottom: 20px;
  }

  .stat {
    border: 1px solid #333;
    padding: 10px;
    display: flex;
    justify-content: space-between;
  }

  .stat-label {
    color: #888;
  }

  .stat-value {
    color: #fff;
    font-weight: bold;
  }

  /* === ALERTS === */
  .alert {
    border: 1px solid;
    padding: 10px;
    margin-bottom: 20px;
  }

  .alert.error {
    border-color: #f00;
    color: #f00;
  }

  .alert.info {
    border-color: #888;
    color: #888;
  }

  /* === DEVICES === */
  .devices {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 20px;
  }

  .device {
    border: 1px solid #333;
    padding: 15px;
    transition: border-color 0.3s;
  }

  .device.online {
    border-color: #0f0;
  }

  .device.warning {
    border-color: #fa0;
  }

  .device.offline {
    border-color: #f00;
  }

  .device:hover {
    border-color: #fff;
  }

  .device-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 5px;
  }

  .device-id {
    color: #fff;
    font-weight: bold;
    font-size: 16px;
  }

  .device-status {
    color: inherit;
  }

  .device.online .device-status {
    color: #0f0;
  }

  .device.warning .device-status {
    color: #fa0;
  }

  .device.offline .device-status {
    color: #f00;
  }

  .device-location {
    color: #888;
    margin-bottom: 15px;
  }

  .metrics {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 15px;
  }

  .metric {
    display: flex;
    justify-content: space-between;
  }

  .metric-label {
    color: #888;
  }

  .metric-value {
    color: #fff;
    font-weight: bold;
  }

  .metric-value.low {
    color: #f00;
  }

  .device-footer {
    border-top: 1px solid #333;
    padding-top: 10px;
    display: flex;
    justify-content: space-between;
    font-size: 12px;
  }

  .footer-item {
    display: flex;
    gap: 5px;
  }

  .footer-label {
    color: #666;
  }

  .footer-value {
    color: #888;
  }
</style>