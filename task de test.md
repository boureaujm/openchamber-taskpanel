# Plan de test du Task Panel

## 1. Préparer l’environnement

### 1.1 Installer les dépendances [x]

- Vérifier la version de Bun
- Installer les dépendances du projet

### 1.2 Configurer les variables [x]

- Créer le fichier local
- Vérifier les chemins

### 1.3 Préparer les données [ ]

- Copier les fixtures de test
- Ajouter un jeu de données incomplet
- Vérifier les valeurs manquantes

## 2. Construire l’interface

### 2.1 Créer la structure [x]

- Ajouter l’en-tête
- Ajouter la barre de progression

### 2.2 Ajouter les sections [ ]

- Afficher une section ouverte
- Afficher une section repliée
- Conserver l’état après actualisation

### 2.3 Tester les tâches imbriquées [ ]

  - Ajouter une tâche de niveau deux
    - Ajouter une tâche de niveau trois
    - Ajouter une autre tâche de niveau trois
  - Vérifier l’indentation visuelle

## 3. Tester les interactions

### 3.1 Sélectionner un fichier [ ]

- Ouvrir le sélecteur
- Naviguer dans un dossier
- Sélectionner un fichier Markdown

### 3.2 Masquer les tâches terminées [x]

- Cliquer sur l’œil
- Vérifier que les tâches terminées disparaissent

### 3.3 Atteindre la tâche active [ ]

- Cliquer sur la barre « en cours »
- Faire défiler jusqu’à la tâche active

## 4. Valider les états limites

### 4.1 Plan partiellement terminé [ ]

- Vérifier le compteur global
- Vérifier le compteur de chaque section

### 4.2 Section entièrement terminée [x]

- Confirmer que la section peut être repliée
- Vérifier la couleur du compteur

### 4.3 Plan sans tâche [ ]

- Afficher le message d’état vide

## 5. Livraison

### 5.1 Vérifier la qualité [ ]

- Lancer les tests unitaires
- Lancer le build de production
- Vérifier le rendu sombre
- Vérifier le rendu clair

### 5.2 Documenter la version [ ]

- Ajouter une note de version
- Relire les instructions d’installation

- Vérifier le statut final [x]
