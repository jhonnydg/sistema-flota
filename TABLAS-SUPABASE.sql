-- ══════════════════════════════════════════════
--  SISTEMA DE FLOTA - Script de base de datos
--  Copiá todo esto en el SQL Editor de Supabase
-- ══════════════════════════════════════════════

-- Usuarios
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  pin TEXT NOT NULL,
  sucursal_id TEXT,
  shift_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Asistencia (entradas y salidas)
CREATE TABLE attendance (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  date TEXT NOT NULL,
  sucursal_id TEXT,
  clock_in TIMESTAMPTZ,
  clock_out TIMESTAMPTZ,
  late BOOLEAN DEFAULT FALSE,
  late_min INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Solicitudes (cambios de horario, relevos, etc.)
CREATE TABLE requests (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  from_id TEXT NOT NULL,
  to_id TEXT,
  sup_id TEXT,
  date TEXT,
  note TEXT,
  time TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reportes de drivers
CREATE TABLE reports (
  id TEXT PRIMARY KEY,
  reporter_id TEXT NOT NULL,
  driver_id TEXT NOT NULL,
  cat TEXT NOT NULL,
  detail TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notificaciones
CREATE TABLE notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  msg TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Dias libres
CREATE TABLE days_off (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  date TEXT,
  cfg JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notas del turno
CREATE TABLE notes (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  text TEXT NOT NULL,
  author_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Alertas de no presentacion
CREATE TABLE alerts (
  id TEXT PRIMARY KEY,
  driver_id TEXT NOT NULL,
  date TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ubicaciones GPS
CREATE TABLE locations (
  user_id TEXT PRIMARY KEY,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  active BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════
--  Seguridad (permite todo via PIN, sin auth JWT)
-- ══════════════════════════════════════════════
ALTER TABLE users        ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance   ENABLE ROW LEVEL SECURITY;
ALTER TABLE requests     ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports      ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE days_off     ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts       ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations    ENABLE ROW LEVEL SECURITY;

CREATE POLICY "open" ON users        FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "open" ON attendance   FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "open" ON requests     FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "open" ON reports      FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "open" ON notifications FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "open" ON days_off     FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "open" ON notes        FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "open" ON alerts       FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "open" ON locations    FOR ALL USING (true) WITH CHECK (true);

-- ══════════════════════════════════════════════
--  Tiempo real (para actualizaciones instantaneas)
-- ══════════════════════════════════════════════
ALTER PUBLICATION supabase_realtime ADD TABLE users;
ALTER PUBLICATION supabase_realtime ADD TABLE attendance;
ALTER PUBLICATION supabase_realtime ADD TABLE requests;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE days_off;
ALTER PUBLICATION supabase_realtime ADD TABLE notes;
ALTER PUBLICATION supabase_realtime ADD TABLE alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE locations;

-- ══════════════════════════════════════════════
--  Usuarios iniciales del sistema
-- ══════════════════════════════════════════════
INSERT INTO users (id, name, role, pin, sucursal_id, shift_id) VALUES
('a1',  'Carlos Mendez',  'admin',        '0000', 'su1', NULL),
('sv1', 'Ana García',      'supervisor',   '1111', 'su1', 'm'),
('sv2', 'Roberto Vega',    'supervisor',   '1112', 'su2', 't'),
('dp1', 'María López',     'despacho',     '2001', 'su1', 'm'),
('dp2', 'Juan Ríos',       'despacho',     '2002', 'su1', 't'),
('dp3', 'Pablo Cruz',      'despacho',     '2003', 'su2', 'n'),
('ax1', 'Lucía Flores',    'aux_despacho', '3001', 'su1', 'm'),
('ax2', 'Diego Mora',      'aux_despacho', '3002', 'su2', 't'),
('d1',  'Miguel Torres',  'driver',       '1001', 'su1', 'm'),
('d2',  'Luis Ramírez',   'driver',       '1002', 'su1', 'm'),
('d3',  'Jorge Vargas',   'driver',       '1003', 'su1', 't'),
('d4',  'Pedro Alvarado', 'driver',       '1004', 'su2', 't'),
('d5',  'Roberto Solis',  'driver',       '1005', 'su1', 'n'),
('d6',  'David Herrera',  'driver',       '1006', 'su2', 'n'),
('d7',  'Carmen Ruiz',    'driver',       '1007', 'su2', 'm'),
('d8',  'Sofia Mendez',   'driver',       '1008', 'su2', 't');
