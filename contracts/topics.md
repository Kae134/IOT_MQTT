# Topics MQTT - Contrat de communication

## Préfixe
Tous les topics suivent le pattern : `classroom/<deviceId>/<type>`

Où `<deviceId>` est l'identifiant unique du device (ex: `esp32-01`)

---

## Liste des topics

| Topic | Sens | Émis par | Description | Payload |
|-------|------|----------|-------------|---------|
| `classroom/<deviceId>/telemetry` | ESP32 → Serveur | ESP32 | Mesures périodiques (température, humidité, batterie) | JSON telemetry |
| `classroom/<deviceId>/events` | ESP32 → Serveur | ESP32 | Événements ponctuels (boot, ACK commande, erreur) | JSON event |
| `classroom/<deviceId>/cmd` | Serveur → ESP32 | Bridge | Commandes envoyées au device (LED, changement intervalle) | JSON cmd |
| `classroom/<deviceId>/status` | ESP32 → Serveur | ESP32 | État du device (online/offline) via LWT | JSON status |

---

## Wildcards pour abonnement

- `classroom/+/telemetry` → Toutes les télémétries de tous les devices
- `classroom/+/events` → Tous les événements de tous les devices
- `classroom/<deviceId>/#` → Tous les messages d'un device spécifique

---

## Exemples de topics complets

```
classroom/esp32-01/telemetry
classroom/esp32-01/events
classroom/esp32-01/cmd
classroom/esp32-01/status

classroom/esp32-02/telemetry
classroom/esp32-02/events
...
```

---

## Notes importantes

- **deviceId** : Doit être unique par device physique
- **QoS** : Utiliser QoS 0 pour la télémétrie (rapide), QoS 1 pour les commandes (fiable)
- **Retained** : Le status doit être retained pour que les nouveaux clients sachent l'état
- **LWT (Last Will & Testament)** : Configuré sur le topic `status` pour détecter les déconnexions