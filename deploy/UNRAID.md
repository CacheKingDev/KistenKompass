# UNRAID und Nginx Proxy Manager

Trage deine eigene HTTPS-Adresse, die tatsächliche Proxy-IP und eine freie LAN-IP ein. Die folgenden Angaben mit example.com und 192.0.2.x sind ausschließlich Beispiele und müssen ersetzt werden. Die Anwendung hört intern standardmäßig auf **3000/HTTP** (`PORT` ist anpassbar); NPM übernimmt HTTPS. Kein Unterpfad.

## 1. Dateien und Daten vorbereiten

Projekt oder das ZIP nach `/mnt/user/appdata/kistenkompass-source` kopieren und dort entpacken. Auf UNRAID im Terminal:

```sh
cd /mnt/user/appdata/kistenkompass-source
mkdir -p /mnt/user/appdata/kistenkompass
chown 1000:1000 /mnt/user/appdata/kistenkompass
chmod 750 /mnt/user/appdata/kistenkompass
cp .env.example .env
nano .env
```

In `.env` die leeren Felder `PUBLIC_URL`, `TRUST_PROXY` und `APP_IP` mit eigenen Werten ausfüllen. Die App-IP im Router reservieren bzw. außerhalb des DHCP-Pools auswählen. Netzwerkname und Zeitzone bei Bedarf anpassen.

Vorhandene Daten übernehmen: bisherigen Server stoppen und **das gesamte Datenverzeichnis einschließlich eventuell vorhandener SQLite-WAL-Dateien** nach `/mnt/user/appdata/kistenkompass` kopieren. Anschließend die Schreibrechte der übernommenen Dateien für UID/GID 1000 prüfen. Bei laufender App keine einzelne SQLite-Datei kopieren.

## 2. UNRAID-Netz prüfen und Container starten

```sh
docker network inspect br0
```

Das vorhandene benutzerdefinierte LAN-Netz muss den Bereich deiner gewählten App-IP enthalten. Wenn dein LAN-Netz anders heißt, `UNRAID_NETWORK` entsprechend ändern. Die Compose-Datei nutzt dieses bestehende Netz; sie ändert weder Router noch UNRAID-Netzwerkeinstellungen.

Mit Docker Compose (z. B. über bereits installierten Compose Manager):

```sh
docker compose config --quiet
docker compose up -d --build
docker compose ps
docker compose logs --tail=100 kistenkompass
```

Der Container läuft als UID/GID 1000. Daten bleiben im appdata-Verzeichnis. Für die eigene LAN-IP werden keine Host-Portfreigaben benötigt.

Alternativ ohne Compose das Image im Projektordner bauen:

```sh
docker build -t kistenkompass:local .
```

Dann `deploy/my-kistenkompass.xml` nach `/boot/config/plugins/dockerMan/templates-user/` kopieren, im UNRAID-Docker-Tab **Add Container** wählen und die Vorlage `KistenKompass` auswählen. Image-Repository auf `kistenkompass:local` und WebUI auf deine HTTPS-Adresse setzen. Bei **Fixed IP address** die gewählte freie LAN-IP eintragen. Netzwerk `Custom: br0`, Appdata-Pfad und Variablen kontrollieren. Das Image ist lokal gebaut; für Updates erneut bauen und den Container mit dem neuen Image neu erstellen. Entweder Compose oder die UNRAID-Vorlage zur Verwaltung verwenden.

## 3. Nginx Proxy Manager

Auf `192.0.2.2` einen **Proxy Host** einrichten:

| Feld | Wert |
|---|---|
| Domain Names | `umzug.example.com` |
| Scheme | `http` |
| Forward Hostname / IP | gewählte `APP_IP` |
| Forward Port | `3000` |
| Cache Assets | aus |
| Websockets Support | für den aktuellen Funktionsumfang nicht erforderlich |
| SSL Certificate | gültiges Zertifikat für `umzug.example.com` auswählen/erstellen |
| Force SSL | an |
| HTTP/2 Support | an |

Die normalen NPM-Proxy-Header genügen; kein eigener `location /`-Block ist nötig. Die App erwartet den ursprünglichen Host sowie `X-Forwarded-Proto` und `X-Forwarded-For`. Vertraut wird ausschließlich dem Proxy `192.0.2.2`. Wenn NPM durch NAT mit anderer Quell-IP am App-Container ankommt, genau diese Adresse in `TRUST_PROXY` eintragen; nicht pauschal alle Proxies freigeben.

Den Proxy Host für die erste Einrichtung mit einer NPM-Access-List auf deinen Zugriff beschränken. Unter `https://umzug.example.com` das erste Administratorkonto einrichten, danach die gewünschte externe Erreichbarkeit aktivieren. Bei übernommener Datenbank mit Konten die bestehende Anmeldung nutzen.

Intern muss `umzug.example.com` ebenfalls auf NPM (`192.0.2.2`) auflösen, oder der Router muss Hairpin NAT unterstützen. Extern zeigt der DNS-Eintrag auf deine öffentliche Adresse; die bestehenden Routerfreigaben 80/443 führen zu NPM. Den App-Port 3000 nicht zum Internet weiterleiten. Neue QR-Etiketten verwenden immer `https://umzug.example.com`, auch wenn die Seite über eine interne Adresse geöffnet wird.

## 4. Funktion prüfen

- `https://umzug.example.com/api/health` liefert `{"ok":true}`.
- Anmeldung, Umzug anlegen und Karton speichern über die HTTPS-Domain prüfen.
- Sitzungscookie `kk_session` trägt `Secure`, `HttpOnly` und `SameSite=Strict`.
- Ein QR-Etikett öffnen und prüfen, dass Domain und Umzug korrekt sind.
- Mit iPhone im WLAN und über Mobilfunk testen.
- Container neu starten und prüfen, dass Umzüge und Kartons erhalten bleiben.

`Ungültiger Ursprung`: `PUBLIC_URL` muss exakt zur Browseradresse passen (HTTPS, Domain, gegebenenfalls Port). `502 Bad Gateway`: Erreichbarkeit der App-IP und Port 3000 von NPM prüfen. `EACCES`: UID/GID 1000 muss appdata-Dateien schreiben können. Anmeldung für alle Clients gleichzeitig begrenzt: die tatsächlich sichtbare NPM-Quell-IP und dessen Weiterleitungsheader kontrollieren.

## Updates, Sicherung und Wiederherstellung

Vor Updates Container stoppen und das gesamte appdata-Verzeichnis sichern. Anschließend im Quellordner `docker compose up -d --build` ausführen. Quellcode und `.env` ebenfalls aufbewahren; `.env` nicht ins Docker-Image kopieren.

Wiederherstellung: Container stoppen, gesichertes appdata-Verzeichnis zurückspielen, Rechte prüfen und mit passender Anwendungsversion starten. Bei Rückkehr zu einer älteren Version auch deren dazugehörige Datenbanksicherung verwenden.

Die Kartonnummerierung erfolgt pro Umzug: Neue Umzüge beginnen bei #001. Beim ersten Start wird die bisherige globale Nummernvergabe in einer Transaktion migriert. Bestehende Kartonnummern und Inhalte bleiben erhalten. Neue Kartons erhalten innerhalb ihres Umzugs die kleinste freie Nummer. Gelöschte Nummern werden wiederverwendet; bestehende Kartons werden nicht umnummeriert. Alte und neue Anwendungsversionen dürfen nicht gleichzeitig dieselbe Datenbank verwenden; für eine Rückkehr zur alten Version die Sicherung vor dieser Migration wiederherstellen.

## Prüfumfang dieser Änderung

Docker-Image erfolgreich gebaut und mit UID 1000, Anmeldung, Secure-Cookie, Raum/Karton-Speicherung, persistentem Volume nach Containerneustart und Healthcheck geprüft (`node deploy/smoke-docker.mjs`). Frontend-Build, kompilierter Produktionsserver, sechzehn HTTP-/Datentests für Proxy-Vertrauen, HTTPS-Cookies, Domainprüfung, Client-Anmeldelimit und Daten nach Neustart sind geprüft. Die tatsächliche LAN-IP, UNRAID-`br0`, DNS, Zertifikat und iPhone-Zugriff über NPM müssen auf deinem Server geprüft werden.

Offizielle Grundlagen: [Express hinter Proxies](https://expressjs.com/en/guide/behind-proxies/), [Nginx Proxy Manager](https://nginxproxymanager.com/guide/), [UNRAID-Container und Netzwerke](https://docs.unraid.net/unraid-os/using-unraid-to/run-docker-containers/managing-and-customizing-containers/).

## Eigener Port und Container-Protokoll

In der Unraid-Vorlage eine Variable mit Schlüssel `PORT` hinzufügen, beispielsweise `3080`. Zulässig sind ganze Zahlen von 1 bis 65535; Standard ist 3000. Bei eigener LAN-IP (`Custom: br0` oder einem VLAN-Netz wie `br0.80`) im Nginx Proxy Manager den Forward Port auf denselben Wert setzen. Keine Docker-Portzuordnung erforderlich. Die öffentliche HTTPS-Adresse bleibt gleich, solange NPM weiterhin HTTPS auf Port 443 bereitstellt. Bei Bridge-Netzwerk dagegen eine Portzuordnung vom gewünschten Host-Port zum konfigurierten Container-Port hinzufügen.

Unter Unraid → Docker → KistenKompass → Protokoll erscheinen Startzeit, Produktionsmodus, HTTP-Port, Datenbankpfad, HTTPS-Adresse, Proxy-Konfiguration und Einrichtungstatus. Schreibanfragen und fehlgeschlagene Anfragen werden mit HTTP-Status protokolliert; regelmäßige erfolgreiche Healthchecks bleiben ruhig. Passwörter, Cookies, Anfragetexte und Suchparameter werden nicht protokolliert. Beim Stoppen werden Server und Datenbank geschlossen.
