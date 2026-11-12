# Atelier Cuisine

Calculateur de débit de la cuisine sous escalier. L’application regroupe les caissons, les portes, les tiroirs et le stock. Elle calcule les pièces à découper, la quincaillerie et les chutes, et permet d’imprimer le débit.

Cet export est issu de la version 1 publiée sur Sites, commit `ef949d4e6a8b449e1dd2de35272872819e015bc3`. Il inclut le code source, les dépendances verrouillées et les migrations de la base de données.

## Déposer le projet sur GitHub

1. Décompresse le ZIP. Ouvre le dossier `atelier-cuisine`, celui qui contient `package.json`.
2. Crée un dépôt **privé et vide** sur GitHub, par exemple `atelier-cuisine`. Le code contient tes cotes de départ. Laisse GitHub créer le dépôt sans README ni fichier .gitignore.
3. Depuis un terminal ouvert dans le dossier extrait, exécute les commandes ci-dessous. Remplace `TON_COMPTE` et le nom du dépôt par ceux de ton dépôt.

```sh
git init -b main
git add .
git commit -m "Importer Atelier Cuisine"
git remote add origin https://github.com/TON_COMPTE/atelier-cuisine.git
git push -u origin main
```

Git envoie aussi les dossiers et fichiers de configuration qui commencent par un point. GitHub Desktop peut également publier le dépôt local en privé.

[Guide GitHub pour importer du code existant](https://docs.github.com/fr/migrations/importing-source-code/using-the-command-line-to-import-source-code/adding-locally-hosted-code-to-github)

## Lancer le calculateur en local

Installe Node.js **22.13 ou plus récent** et ouvre un terminal dans le dossier du projet.

```sh
npm ci
npm run build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_happy_power_man.sql
npm start
```

Ouvre l’adresse locale affichée dans le terminal. La commande de migration est à lancer une fois sur une base locale neuve. Les modifications et l’historique de cette installation sont ensuite conservés dans `.wrangler/state/`.

| Dossier | Contenu |
| --- | --- |
| `app/` | Interface, impression et API de sauvegarde |
| `lib/kitchen.ts` | Cotes, règles de débit et quincaillerie |
| `lib/nesting.ts` | Calepinage et chutes |
| `lib/seed.ts` | Cotes et éléments préremplis |
| `drizzle/` | Migrations de la base D1 |

## Hébergement et données

GitHub sert à stocker et modifier le code. Pour héberger l’application, il faut exécuter son Worker et lui lier une base Cloudflare D1 sous le nom `DB`. GitHub Pages héberge les pages statiques. L’enregistrement des cotes et l’historique dépendent de l’API du Worker.

Sur Sites, l’accès privé protège le projet et l’API de sauvegarde. Pour héberger ce code ailleurs, configure l’accès au Worker et applique les migrations D1 avant de l’ouvrir aux utilisateurs.

Le ZIP inclut les cotes de départ dans `lib/seed.ts`. Tu peux exporter un instantané des données saisies depuis **Historique → Sauvegarder une copie** dans le site. Les versions sauvegardées du site en ligne sont dans sa base D1.

[Notes techniques du projet Vinext](docs/developpement-vinext.md)
