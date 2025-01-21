
-- Création de données de test pour ma BDD
BEGIN;

-- Insertion des données pour la table 'role'
INSERT INTO "role"(name) VALUES
('admin'),
('user');


-- Insertion des données pour la table 'user'
INSERT INTO "user"(firstname, email, "password", role_id) VALUES
('Pierre', 'pierre@gmail.com', 'pierre1pierre1', 2),
('Nadia', 'nadia@gmail.com', 'nadia1nadia1',2),
('Valentin', 'valentin@gmail.com', 'valentin1valentin1',2);

-- Insertion des données pour la table 'timer'
INSERT INTO "timer"("time_begin", "time_end", "date", "status", "user_id", "duration") VALUES
(now(), now() + INTERVAL '2 minutes', '2025-01-16',  false, 1, 120);

-- Insertion des données pour la table 'machine'
INSERT INTO "machine" (name) VALUES
('Jensen'),
('Kannegieser'),
('Plieuse 1'),
('Plieuse 2');


-- Insertion des données pour la table 'article'
INSERT INTO "article"(name, initial_quantity, objective) VALUES
('Draps Housses', 10 , 1000),
('Serviette Eponge', 5 , 1200),
('Draps Cliniques', 20 , 1300);


-- Insertion des données pour la table 'production'
INSERT INTO "production" (machine_id, article_id, quantity_product_aff,  quantity_reject_aff,  created_at, timer_id)
VALUES
-- (1, 3, 50, 10, 0, 0,  now()),
-- (2, 3, 60, 20, 0, 0,  now()),


-- (2, 3, 70, 10, 0, 0, now()),
-- (1, 3, 80, 5, 0, 0, now()),
-- (3, 2, 100, 10, 0, 0, now()),
-- (4, 2, 150, 15, 0, 0, now()),
-- (3, 1, 160, 20, 0, 0, now()),
-- (3, 1, 170, 70, 0, 0, now()),
-- (3, 1, 180, 80, 0, 0, now()),
-- (3, 1, 190, 40, 0, 0, now()),
-- (4, 2, 170, 70, 0, 0, now()),
(2, 1, 200, 0, now(), 1),
(2, 1, 0, 5,  now(), 1);
-- (2, 3, 0, 0, 10, 5,  now()),


-- (3, 1, 0, 0, 10, 5,  now()),
-- (3, 1, 0, 0, 20, 8,  now()),
-- (4, 2, 0, 0, 10, 5,  now()),
-- (4, 2, 0, 0, 20, 10,  now()),
-- (4, 2, 0, 0, 30, 15,  now()),


-- (4, 2, 250, 100, 0, 0,  now()),
-- (1, 3, 100, 50, 0, 0,  now());

-- (1, 3, 120, 60, 0, 0,  now()),
-- (1, 3, 150, 75, 0, 0,  now()),
-- (3, 2, 200, 100, 0, 0,  now());

COMMIT;

