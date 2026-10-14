# KistenKompass

Erste lauffähige Entwicklungsstufe für einen Umzug: Räume mit Farben, Kartons mit fortlaufenden Nummern, Inhaltslisten, Suche, Status, Transportdaten und QR-Etiketten mit 120 × 100 mm und 15 × 15 mm Raumfarbe.

## Lokal starten

Node.js 24 vorausgesetzt. `npm ci`, anschließend `npm run build` und `npm start`. Öffnen: http://localhost:3000. Für Entwicklung Server mit `npm.cmd run server` und in zweitem Terminal `npm.cmd run dev` starten. Der API-Server startet bei Änderungen automatisch neu. Einen bereits laufenden Server nach Änderungen am Startskript einmal mit Strg+C beenden und erneut starten.

## Auf dem iPhone testen

1. Rechner und iPhone mit demselben Heimnetz verbinden (der Rechner darf per Ethernet angeschlossen sein).
2. In einem Terminal `npm.cmd run server` und in einem zweiten `npm.cmd run dev` starten. Beide Terminals geöffnet lassen.
3. In Safari auf dem iPhone die von Vite unter **Network** angezeigte Adresse öffnen, beispielsweise `http://192.168.77.20:5173`. Auf dem Desktop bleibt `http://localhost:5173` erreichbar. Auf dem iPhone die LAN-IP des Rechners verwenden; `localhost` bezeichnet dort das iPhone selbst.

Der Dev-Server lauscht auf allen Netzwerkschnittstellen und verwendet fest Port 5173. Ist der Port belegt, meldet er einen Fehler statt auf einen anderen Port auszuweichen. Änderungen am Frontend werden auch auf dem iPhone automatisch übernommen. API-Anfragen laufen über denselben Dev-Server zum Backend auf Port 3000.

Falls die Seite nicht erreichbar ist: die IPv4-Adresse des aktiven Ethernet-/WLAN-Adapters mit `ipconfig` prüfen, Node.js in der Windows-Firewall für private Netzwerke zulassen und sicherstellen, dass das iPhone nicht in einem isolierten Gast-WLAN ist. Für diesen lokalen HTTP-Test den API-Server ohne die Produktionsvariablen `PUBLIC_URL` und `NODE_ENV=production` starten, damit Anmeldung und Cookies zur LAN-Adresse passen.

## UNRAID mit Nginx Proxy Manager

Für Veröffentlichungen über GitHub Container Registry und Updates über den UNRAID-Docker-Tab: [deploy/GHCR.md](deploy/GHCR.md). Der vorbereitete GitHub-Workflow veröffentlicht getestete Images bei einem Release.

Eigene HTTPS-Adresse, Proxy-IP und freie LAN-IP werden in `.env` eingetragen. Vollständige Anleitung mit Compose und UNRAID-Docker-Vorlage: [deploy/UNRAID.md](deploy/UNRAID.md).

## Stand und nächste Schritte

Beim ersten Aufruf wird ein Administratorkonto eingerichtet (Passwort mindestens zehn Zeichen). Über „Umzüge & Benutzer“ können Umzüge angelegt und bearbeitet sowie Benutzer erstellt, bearbeitet und deaktiviert werden. Administratoren sehen alle Umzüge und verwalten die globalen Kartonarten. Benutzer sehen eigene und zugewiesene Umzüge und dürfen deren Räume und Kartons bearbeiten. Benutzerzuweisungen ändern nur Administratoren. Administratoren können Umzüge nach einer Bestätigung endgültig mit allen zugehörigen Räumen, Kartons und Benutzerzuweisungen löschen. Andere Umzüge, Benutzer und globale Kartonarten bleiben erhalten. Kontenänderungen beenden bestehende Sitzungen; mindestens ein aktiver Administrator bleibt erhalten. Passwörter werden gesalzen mit scrypt gespeichert, Sitzungen verwenden HttpOnly-Cookies und laufen nach sieben Tagen ab. Für Zugriff außerhalb des Heimnetzes HTTPS verwenden.

Bestehende Räume und Kartons werden beim ersten Start automatisch dem Umzug „Mein erster Umzug“ zugeordnet. Kartonnummern bleiben global eindeutig. Neue QR-Etiketten verweisen auf den zugehörigen Umzug, vorhandene QR-Links ohne Umzugskennung auf den ersten Umzug. Vor einem Update das Datenverzeichnis sichern.

Noch offen: Raum-Bearbeitung, Stapeldruck/PDF-Erzeugung, Kamerascanner, PWA und Offline-Synchronisierung. Browserdruck bietet zunächst PDF-Speicherung. Lange Texte auf Etiketten benötigen noch eine höhenabhängige Seitenaufteilung; derzeit neun Inhaltszeilen je Seite.

Kartonarten erhalten Außenmaße (Länge × Breite × Höhe in cm). Daraus wird das Volumen in Litern und m³ berechnet. Die Übersicht summiert alle erfassten Kartons unabhängig von Status und Filter. Bestehende Kartonarten bleiben erhalten; fehlende Maße werden angezeigt und müssen ergänzt werden. Möbel und zusätzlicher Platz für Lücken sind nicht enthalten.

Prüfung: `npm run build` und `npm test`.

Fotos können beim Erfassen und Bearbeiten eines Kartons ergänzt werden: bis zu sechs Bilder aus der Fotomediathek oder über „Foto aufnehmen“. Bilder werden im Browser auf höchstens 1600 Pixel Kantenlänge verkleinert und als JPEG gespeichert. Hinzufügen und Entfernen wird erst mit „Speichern“ übernommen. Die Fotos liegen in der SQLite-Datenbank, sind über die Umzugsberechtigung geschützt und werden beim Löschen des Kartons oder Umzugs entfernt. Bei einem vorgeschalteten Reverse Proxy muss das Request-Limit mindestens 9 MB zulassen.
