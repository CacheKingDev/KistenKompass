# Veröffentlichung über GitHub Container Registry

Der Workflow `.github/workflows/publish-image.yml` testet und baut bei veröffentlichten Releases (keine Vorabversionen) ein Linux/amd64-Image für einen x86-64-Unraid-Server. Der Release-Tag muss beispielsweise `v0.1.0` heißen. Veröffentlicht werden `ghcr.io/OWNER/REPOSITORY:0.1.0` und `:stable`; OWNER und REPOSITORY werden kleingeschrieben. Nur neue Releases aktualisieren das Image, nicht gewöhnliche Commits. Ältere Releases nicht erneut veröffentlichen, da dies auch `stable` zurücksetzen würde.

## GitHub vorbereiten

1. Auf GitHub ein leeres Repository `kistenkompass` erstellen, ohne README oder sonstige Initialdateien. Ein privates Repository ist möglich.
2. Im lokalen Projektordner Git initialisieren und vor dem ersten Commit mit `git status --short` prüfen, welche Dateien aufgenommen werden. `.env`, Daten, Build-Ausgaben und node_modules werden ignoriert; keine Sicherungen oder Zugangsdaten hinzufügen.
3. Commit erstellen und auf `main` pushen. Für die Anmeldung die normale GitHub-Anmeldung verwenden; keine Tokens in Dateien schreiben.
4. Im Repository unter Releases ein neues Release für `main` mit neuem Tag `v0.1.0` veröffentlichen. Im Actions-Tab den erfolgreichen Workflow abwarten. Er verwendet GitHubs automatisch bereitgestellten GITHUB_TOKEN; ein eigenes Registry-Secret ist nicht erforderlich.
5. Das Paket im Packages-Bereich des GitHub-Kontos öffnen und unter Package settings die Sichtbarkeit bewusst auf Public setzen, wenn Unraid ohne Registry-Anmeldung herunterladen soll. Neue Pakete sind zunächst privat. Das Image und die darin enthaltene Anwendung sind bei Public öffentlich zugänglich, auch bei privatem Quellrepository. Für private Pakete ist eine Registry-Anmeldung auf Unraid mit einem geeigneten Token nötig.

## Unraid installieren

Die Anleitung `deploy/UNRAID.md` gilt für Datenverzeichnis, UID/GID 1000, freie LAN-IP, Nginx Proxy Manager und Funktionsprüfung weiterhin.

Für die Unraid-Docker-Verwaltung die vorhandene Vorlage `deploy/my-kistenkompass.xml` nach `/boot/config/plugins/dockerMan/templates-user/` kopieren. Unter Docker → Add Container die Vorlage auswählen und Repository von `kistenkompass:local` auf `ghcr.io/DEINNAME/kistenkompass:stable` ändern. Kein lokaler Image-Build ist nötig. Netzwerk `Custom: br0`, freie feste App-IP, Appdata-Zuordnung nach `/data`, PUBLIC_URL und TRUST_PROXY prüfen, dann starten. Autostart aktivieren. Dieses Deployment über die Unraid-Vorlage verwalten.

## Updates

Änderungen committen, testen und auf GitHub pushen. Ein neues Release mit einer bisher unbenutzten, höheren Version veröffentlichen, beispielsweise `v0.1.1`. Nach erfolgreichem Workflow steht das neue `stable`-Image bereit.

Auf Unraid vor der Aktualisierung den Container stoppen und das gesamte Verzeichnis `/mnt/user/appdata/kistenkompass` sichern. Im Docker-Tab auf Updates prüfen und KistenKompass aktualisieren, anschließend starten und Anmeldung, Daten und `/api/health` prüfen. Die Appdata-Zuordnung erhält Daten beim Ersetzen des Containers.

Für einen Rückschritt den Container stoppen, die zur alten Version gehörende Sicherung wiederherstellen und das Repository auf den alten Versionstag setzen, beispielsweise `ghcr.io/DEINNAME/kistenkompass:0.1.0`. Bei Datenbankmigrationen genügt allein das alte Image nicht.

Grundlagen: https://docs.github.com/en/actions/tutorials/publish-packages/publish-docker-images und https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry
