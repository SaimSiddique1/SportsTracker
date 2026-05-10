const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");
const { Pool } = require("pg");
require("dotenv").config();

const demoStorePath = path.join(__dirname, "data", "app-data.json");

const defaultSystemConfig = {
  registrationEnabled: true,
  maintenanceMode: false,
  maintenanceMessage: "Scheduled maintenance is in progress. Please check back soon.",
};

const defaultContentModeration = {
  homeHeroHeadline: "Welcome to Sports Tracker",
  homeHeroSubtext: "Search players, explore tables, and track the latest sports updates.",
  featuredPlayers: ["Lionel Messi", "Erling Haaland"],
  updatedAt: new Date().toISOString(),
  updatedBy: null,
};

const defaultAppOperations = {
  maintenanceBanner: "No active maintenance banner.",
  apiRefreshIntervalMinutes: 20,
  sportsApiKeyPreview: "RAPI...DEMO",
  sportsApiStatus: "healthy",
  authApiStatus: "healthy",
  updatedAt: new Date().toISOString(),
  updatedBy: null,
};

const defaultAuditDetails = {};

const defaultAdminPermissions = {
  manageUsers: true,
  manageContent: true,
  manageSystem: true,
  viewDatabase: true,
};

const maskArrayFromCsv = (value) =>
  String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const createMemoryStore = () => ({
  nextUserId: 1,
  nextAuditId: 1,
  users: [],
  sessions: [],
  audits: [],
  systemConfig: {
    ...defaultSystemConfig,
    updatedAt: new Date().toISOString(),
    updatedBy: null,
  },
  contentModeration: { ...defaultContentModeration },
  appOperations: { ...defaultAppOperations },
});

const ensureDemoStore = async () => {
  try {
    await fs.access(demoStorePath);
  } catch {
    await fs.mkdir(path.dirname(demoStorePath), { recursive: true });
    await fs.writeFile(
      demoStorePath,
      JSON.stringify(createMemoryStore(), null, 2),
      "utf8"
    );
  }
};

const readDemoStore = async () => {
  await ensureDemoStore();
  const raw = await fs.readFile(demoStorePath, "utf8");
  return JSON.parse(raw);
};

const writeDemoStore = async (data) => {
  await fs.writeFile(demoStorePath, JSON.stringify(data, null, 2), "utf8");
};

const createPgStore = () => {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  const getAdminState = async (key, fallbackValue) => {
    const result = await pool.query(
      "SELECT value FROM admin_state WHERE key = $1",
      [key]
    );
    return result.rows[0]?.value || fallbackValue;
  };

  const setAdminState = async (key, value) => {
    await pool.query(
      `INSERT INTO admin_state (key, value)
       VALUES ($1, $2::jsonb)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
      [key, JSON.stringify(value)]
    );
  };

  const quoteIdentifier = (identifier) => `"${String(identifier).replace(/"/g, '""')}"`;

  const normalizeUserRow = (row) => {
    if (!row) {
      return null;
    }

    const isAdmin = Boolean(row.is_admin ?? row.isAdmin ?? row.role === "admin");
    return {
      ...row,
      role: isAdmin ? "admin" : "user",
      isAdmin,
      permissions: row.permissions || (isAdmin ? defaultAdminPermissions : {}),
    };
  };

  return {
    async init() {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          username TEXT NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          role TEXT NOT NULL DEFAULT 'user',
          disabled BOOLEAN NOT NULL DEFAULT FALSE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);

      await pool.query(`
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS disabled BOOLEAN NOT NULL DEFAULT FALSE
      `);

      await pool.query(`
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user'
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS user_admin_permissions (
          user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
          is_admin BOOLEAN NOT NULL DEFAULT FALSE,
          permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_by INTEGER NULL REFERENCES users(id)
        )
      `);

      await pool.query(
        `INSERT INTO user_admin_permissions (user_id, is_admin, permissions)
         SELECT
           id,
           role = 'admin',
           CASE WHEN role = 'admin' THEN $1::jsonb ELSE '{}'::jsonb END
         FROM users
         ON CONFLICT (user_id) DO NOTHING`,
        [JSON.stringify(defaultAdminPermissions)]
      );

      await pool.query(`
        CREATE TABLE IF NOT EXISTS system_config (
          id INTEGER PRIMARY KEY,
          registration_enabled BOOLEAN NOT NULL DEFAULT TRUE,
          maintenance_mode BOOLEAN NOT NULL DEFAULT FALSE,
          maintenance_message TEXT NOT NULL DEFAULT 'Scheduled maintenance is in progress. Please check back soon.',
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_by INTEGER NULL REFERENCES users(id)
        )
      `);

      await pool.query(`
        ALTER TABLE system_config
        ADD COLUMN IF NOT EXISTS maintenance_message TEXT NOT NULL DEFAULT 'Scheduled maintenance is in progress. Please check back soon.'
      `);

      await pool.query(
        `INSERT INTO system_config (
          id,
          registration_enabled,
          maintenance_mode,
          maintenance_message
        )
        VALUES (1, TRUE, FALSE, 'Scheduled maintenance is in progress. Please check back soon.')
        ON CONFLICT (id) DO NOTHING`
      );

      await pool.query(`
        UPDATE system_config
        SET maintenance_message = COALESCE(maintenance_message, 'Scheduled maintenance is in progress. Please check back soon.')
        WHERE id = 1
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS admin_state (
          key TEXT PRIMARY KEY,
          value JSONB NOT NULL
        )
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS admin_audits (
          id SERIAL PRIMARY KEY,
          action_type TEXT NOT NULL,
          summary TEXT NOT NULL,
          actor_user_id INTEGER NULL REFERENCES users(id),
          target_type TEXT NOT NULL,
          target_id TEXT NULL,
          details JSONB NOT NULL DEFAULT '{}'::jsonb,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS user_sessions (
          id TEXT PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id),
          label TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          revoked_at TIMESTAMPTZ NULL
        )
      `);

      await setAdminState("contentModeration", defaultContentModeration);
      await setAdminState("appOperations", defaultAppOperations);
    },

    async countAdmins() {
      const result = await pool.query(
        `SELECT COUNT(*)::int AS count
         FROM users
         LEFT JOIN user_admin_permissions ON user_admin_permissions.user_id = users.id
         WHERE COALESCE(user_admin_permissions.is_admin, users.role = 'admin') = TRUE`
      );
      return result.rows[0].count;
    },

    async findUserByEmail(email) {
      const result = await pool.query(
        `SELECT
          users.*,
          COALESCE(user_admin_permissions.is_admin, users.role = 'admin') AS is_admin,
          COALESCE(user_admin_permissions.permissions, '{}'::jsonb) AS permissions
         FROM users
         LEFT JOIN user_admin_permissions ON user_admin_permissions.user_id = users.id
         WHERE users.email = $1`,
        [email]
      );
      return normalizeUserRow(result.rows[0]);
    },

    async findUserById(id) {
      const result = await pool.query(
        `SELECT
          users.*,
          COALESCE(user_admin_permissions.is_admin, users.role = 'admin') AS is_admin,
          COALESCE(user_admin_permissions.permissions, '{}'::jsonb) AS permissions
         FROM users
         LEFT JOIN user_admin_permissions ON user_admin_permissions.user_id = users.id
         WHERE users.id = $1`,
        [id]
      );
      return normalizeUserRow(result.rows[0]);
    },

    async createUser({ username, email, passwordHash, role }) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const result = await client.query(
        `INSERT INTO users (username, email, password_hash, role)
         VALUES ($1, $2, $3, $4)
         RETURNING id, username, email, role, disabled`,
          [username, email, passwordHash, role]
        );
        const user = result.rows[0];
        await client.query(
          `INSERT INTO user_admin_permissions (user_id, is_admin, permissions)
           VALUES ($1, $2, $3::jsonb)`,
          [
            user.id,
            role === "admin",
            JSON.stringify(role === "admin" ? defaultAdminPermissions : {}),
          ]
        );
        await client.query("COMMIT");
        return normalizeUserRow(user);
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    },

    async updateUserProfile({ id, username, passwordHash }) {
      const result = await pool.query(
        `UPDATE users
         SET username = $1, password_hash = $2
         WHERE id = $3
         RETURNING id, username, email, role, disabled`,
        [username, passwordHash, id]
      );
      return normalizeUserRow(result.rows[0]);
    },

    async listUsers(search = "") {
      const normalizedSearch = `%${search.toLowerCase()}%`;
      const result = await pool.query(
        `SELECT
           users.id,
           users.username,
           users.email,
           CASE
             WHEN COALESCE(user_admin_permissions.is_admin, users.role = 'admin') THEN 'admin'
             ELSE 'user'
           END AS role,
           COALESCE(user_admin_permissions.is_admin, users.role = 'admin') AS "isAdmin",
           COALESCE(user_admin_permissions.permissions, '{}'::jsonb) AS permissions,
           users.disabled,
           users.created_at AS "createdAt"
         FROM users
         LEFT JOIN user_admin_permissions ON user_admin_permissions.user_id = users.id
         WHERE LOWER(users.username) LIKE $1 OR LOWER(users.email) LIKE $1
         ORDER BY users.id ASC`,
        [normalizedSearch]
      );
      return result.rows.map(normalizeUserRow);
    },

    async updateUserAccess({ id, role, disabled, updatedBy = null }) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const result = await client.query(
          `UPDATE users
           SET role = $1, disabled = $2
           WHERE id = $3
           RETURNING id, username, email, role, disabled, created_at AS "createdAt"`,
          [role, disabled, id]
        );
        const user = result.rows[0] || null;

        if (user) {
          await client.query(
            `INSERT INTO user_admin_permissions (
              user_id,
              is_admin,
              permissions,
              updated_by
            )
            VALUES ($1, $2, $3::jsonb, $4)
            ON CONFLICT (user_id) DO UPDATE
            SET is_admin = EXCLUDED.is_admin,
                permissions = EXCLUDED.permissions,
                updated_at = NOW(),
                updated_by = EXCLUDED.updated_by`,
            [
              id,
              role === "admin",
              JSON.stringify(role === "admin" ? defaultAdminPermissions : {}),
              updatedBy,
            ]
          );
        }

        await client.query("COMMIT");
        return normalizeUserRow(user);
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    },

    async deleteUser(id) {
      await pool.query(
        `DELETE FROM user_sessions
         WHERE user_id = $1`,
        [id]
      );
      const result = await pool.query(
        `DELETE FROM users
         WHERE id = $1
         RETURNING id, username, email, role, disabled, created_at AS "createdAt"`,
        [id]
      );
      return normalizeUserRow(result.rows[0]);
    },

    async getSystemConfig() {
      const result = await pool.query(
        `SELECT
          registration_enabled AS "registrationEnabled",
          maintenance_mode AS "maintenanceMode",
          maintenance_message AS "maintenanceMessage",
          updated_at AS "updatedAt",
          updated_by AS "updatedBy"
         FROM system_config
         WHERE id = 1`
      );
      return result.rows[0];
    },

    async updateSystemConfig(config, updatedBy) {
      const result = await pool.query(
        `UPDATE system_config
         SET registration_enabled = $1,
             maintenance_mode = $2,
             maintenance_message = $3,
             updated_at = NOW(),
             updated_by = $4
         WHERE id = 1
         RETURNING
           registration_enabled AS "registrationEnabled",
           maintenance_mode AS "maintenanceMode",
           maintenance_message AS "maintenanceMessage",
           updated_at AS "updatedAt",
           updated_by AS "updatedBy"`,
        [
          config.registrationEnabled,
          config.maintenanceMode,
          config.maintenanceMessage,
          updatedBy,
        ]
      );
      return result.rows[0];
    },

    async getContentModeration() {
      return getAdminState("contentModeration", defaultContentModeration);
    },

    async updateContentModeration(content) {
      await setAdminState("contentModeration", content);
      return content;
    },

    async getAppOperations() {
      return getAdminState("appOperations", defaultAppOperations);
    },

    async updateAppOperations(operations) {
      await setAdminState("appOperations", operations);
      return operations;
    },

    async createSession({ userId, label }) {
      const sessionId = crypto.randomUUID();
      await pool.query(
        `INSERT INTO user_sessions (id, user_id, label)
         VALUES ($1, $2, $3)`,
        [sessionId, userId, label]
      );
      return {
        id: sessionId,
        userId,
        label,
      };
    },

    async isSessionActive(sessionId) {
      const result = await pool.query(
        `SELECT id
         FROM user_sessions
         WHERE id = $1 AND revoked_at IS NULL`,
        [sessionId]
      );
      return result.rows.length > 0;
    },

    async touchSession(sessionId) {
      await pool.query(
        `UPDATE user_sessions
         SET last_seen_at = NOW()
         WHERE id = $1`,
        [sessionId]
      );
    },

    async listActiveSessions() {
      const result = await pool.query(
        `SELECT
          user_sessions.id,
          user_sessions.user_id AS "userId",
          user_sessions.label,
          user_sessions.created_at AS "createdAt",
          user_sessions.last_seen_at AS "lastSeenAt",
          users.username,
          users.email,
          users.role
         FROM user_sessions
         JOIN users ON users.id = user_sessions.user_id
         WHERE user_sessions.revoked_at IS NULL
         ORDER BY user_sessions.created_at DESC`
      );
      return result.rows;
    },

    async revokeSession(sessionId) {
      const result = await pool.query(
        `UPDATE user_sessions
         SET revoked_at = NOW()
         WHERE id = $1
         RETURNING id`,
        [sessionId]
      );
      return result.rows.length > 0;
    },

    async addAuditEntry({
      actionType,
      summary,
      actorUserId,
      targetType,
      targetId,
      details = defaultAuditDetails,
    }) {
      const result = await pool.query(
        `INSERT INTO admin_audits (
          action_type,
          summary,
          actor_user_id,
          target_type,
          target_id,
          details
        )
        VALUES ($1, $2, $3, $4, $5, $6::jsonb)
        RETURNING
          id,
          action_type AS "actionType",
          summary,
          actor_user_id AS "actorUserId",
          target_type AS "targetType",
          target_id AS "targetId",
          details,
          created_at AS "createdAt"`,
        [actionType, summary, actorUserId, targetType, targetId, JSON.stringify(details)]
      );
      return result.rows[0];
    },

    async listAuditEntries(limit = 20) {
      const result = await pool.query(
        `SELECT
          id,
          action_type AS "actionType",
          summary,
          actor_user_id AS "actorUserId",
          target_type AS "targetType",
          target_id AS "targetId",
          details,
          created_at AS "createdAt"
         FROM admin_audits
         ORDER BY created_at DESC
         LIMIT $1`,
        [limit]
      );
      return result.rows;
    },

    async listDatabaseTables() {
      const result = await pool.query(
        `SELECT
          table_schema AS "schema",
          table_name AS "name",
          table_type AS "type"
         FROM information_schema.tables
         WHERE table_schema = 'public'
         ORDER BY table_name ASC`
      );

      return Promise.all(result.rows.map(async (table) => {
        const countResult = await pool.query(
          `SELECT COUNT(*)::int AS count
           FROM ${quoteIdentifier(table.schema)}.${quoteIdentifier(table.name)}`
        );
        return {
          ...table,
          rowCount: countResult.rows[0].count,
        };
      }));
    },

    async previewDatabaseTable(tableName, limit = 25) {
      const tables = await this.listDatabaseTables();
      const table = tables.find((entry) => entry.name === tableName);

      if (!table) {
        return null;
      }

      const columnResult = await pool.query(
        `SELECT column_name AS name, data_type AS "dataType"
         FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = $1
         ORDER BY ordinal_position ASC`,
        [tableName]
      );

      const safeLimit = Math.min(Math.max(Number(limit) || 25, 1), 100);
      const rowResult = await pool.query(
        `SELECT *
         FROM ${quoteIdentifier(table.schema)}.${quoteIdentifier(table.name)}
         LIMIT $1`,
        [safeLimit]
      );

      return {
        table,
        columns: columnResult.rows,
        rows: rowResult.rows,
      };
    },
  };
};

const createDemoFileStore = () => ({
  async init() {
    await ensureDemoStore();
    const data = await readDemoStore();
    let changed = false;

    if (typeof data.nextAuditId !== "number") {
      data.nextAuditId = 1;
      changed = true;
    }

    if (!Array.isArray(data.sessions)) {
      data.sessions = [];
      changed = true;
    }

    if (!Array.isArray(data.audits)) {
      data.audits = [];
      changed = true;
    }

    if (!data.contentModeration) {
      data.contentModeration = { ...defaultContentModeration };
      changed = true;
    }

    if (!data.appOperations) {
      data.appOperations = { ...defaultAppOperations };
      changed = true;
    }

    data.users = (data.users || []).map((user) => {
      if (typeof user.isAdmin !== "boolean" || !user.permissions) {
        changed = true;
      }

      return {
        ...user,
        isAdmin: user.role === "admin",
        permissions: user.role === "admin" ? defaultAdminPermissions : {},
        disabled: Boolean(user.disabled),
      };
    });

    if (!data.systemConfig) {
      data.systemConfig = {
        ...defaultSystemConfig,
        updatedAt: new Date().toISOString(),
        updatedBy: null,
      };
      changed = true;
    } else {
      if (typeof data.systemConfig.maintenanceMessage !== "string" || !data.systemConfig.maintenanceMessage.trim()) {
        data.systemConfig.maintenanceMessage = defaultSystemConfig.maintenanceMessage;
        changed = true;
      }
      delete data.systemConfig.statsRefreshIntervalMinutes;
      delete data.systemConfig.seasonLabel;
    }

    if (changed) {
      await writeDemoStore(data);
    }
  },

  async countAdmins() {
    const data = await readDemoStore();
    return data.users.filter((user) => user.role === "admin").length;
  },

  async findUserByEmail(email) {
    const data = await readDemoStore();
    return data.users.find((user) => user.email === email) || null;
  },

  async findUserById(id) {
    const data = await readDemoStore();
    return data.users.find((user) => user.id === id) || null;
  },

  async createUser({ username, email, passwordHash, role }) {
    const data = await readDemoStore();
    const user = {
      id: data.nextUserId,
      username,
      email,
      password_hash: passwordHash,
      role,
      isAdmin: role === "admin",
      permissions: role === "admin" ? defaultAdminPermissions : {},
      disabled: false,
      created_at: new Date().toISOString(),
    };

    data.nextUserId += 1;
    data.users.push(user);
    await writeDemoStore(data);

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      isAdmin: user.isAdmin,
      permissions: user.permissions,
      disabled: user.disabled,
    };
  },

  async updateUserProfile({ id, username, passwordHash }) {
    const data = await readDemoStore();
    const user = data.users.find((entry) => entry.id === id);

    if (!user) {
      return null;
    }

    user.username = username;
    user.password_hash = passwordHash;
    await writeDemoStore(data);

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      isAdmin: user.role === "admin",
      permissions: user.role === "admin" ? defaultAdminPermissions : {},
      disabled: user.disabled,
    };
  },

  async listUsers(search = "") {
    const data = await readDemoStore();
    const needle = search.trim().toLowerCase();
    return data.users
      .filter((user) =>
        !needle ||
        user.username.toLowerCase().includes(needle) ||
        user.email.toLowerCase().includes(needle)
      )
      .map((user) => ({
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        isAdmin: user.role === "admin",
        permissions: user.role === "admin" ? defaultAdminPermissions : {},
        disabled: Boolean(user.disabled),
        createdAt: user.created_at,
      }));
  },

  async updateUserAccess({ id, role, disabled }) {
    const data = await readDemoStore();
    const user = data.users.find((entry) => entry.id === id);

    if (!user) {
      return null;
    }

    user.role = role;
    user.isAdmin = role === "admin";
    user.permissions = user.isAdmin ? defaultAdminPermissions : {};
    user.disabled = disabled;
    await writeDemoStore(data);

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      isAdmin: user.isAdmin,
      permissions: user.permissions,
      disabled: user.disabled,
      createdAt: user.created_at,
    };
  },

  async deleteUser(id) {
    const data = await readDemoStore();
    const userIndex = data.users.findIndex((entry) => entry.id === id);

    if (userIndex === -1) {
      return null;
    }

    const [deletedUser] = data.users.splice(userIndex, 1);
    data.sessions = data.sessions.filter((session) => session.userId !== id);
    await writeDemoStore(data);

    return {
      id: deletedUser.id,
      username: deletedUser.username,
      email: deletedUser.email,
      role: deletedUser.role,
      isAdmin: deletedUser.role === "admin",
      permissions: deletedUser.permissions || {},
      disabled: deletedUser.disabled,
      createdAt: deletedUser.created_at,
    };
  },

  async getSystemConfig() {
    const data = await readDemoStore();
    return data.systemConfig;
  },

  async updateSystemConfig(config, updatedBy) {
    const data = await readDemoStore();
    data.systemConfig = {
      ...data.systemConfig,
      ...config,
      updatedAt: new Date().toISOString(),
      updatedBy,
    };
    await writeDemoStore(data);
    return data.systemConfig;
  },

  async getContentModeration() {
    const data = await readDemoStore();
    return data.contentModeration || { ...defaultContentModeration };
  },

  async updateContentModeration(content) {
    const data = await readDemoStore();
    data.contentModeration = content;
    await writeDemoStore(data);
    return data.contentModeration;
  },

  async getAppOperations() {
    const data = await readDemoStore();
    return data.appOperations || { ...defaultAppOperations };
  },

  async updateAppOperations(operations) {
    const data = await readDemoStore();
    data.appOperations = operations;
    await writeDemoStore(data);
    return data.appOperations;
  },

  async createSession({ userId, label }) {
    const data = await readDemoStore();
    const session = {
      id: crypto.randomUUID(),
      userId,
      label,
      createdAt: new Date().toISOString(),
      lastSeenAt: new Date().toISOString(),
      revokedAt: null,
    };
    data.sessions.push(session);
    await writeDemoStore(data);
    return session;
  },

  async isSessionActive(sessionId) {
    const data = await readDemoStore();
    return data.sessions.some(
      (session) => session.id === sessionId && !session.revokedAt
    );
  },

  async touchSession(sessionId) {
    const data = await readDemoStore();
    const session = data.sessions.find((entry) => entry.id === sessionId);
    if (session) {
      session.lastSeenAt = new Date().toISOString();
      await writeDemoStore(data);
    }
  },

  async listActiveSessions() {
    const data = await readDemoStore();
    return data.sessions
      .filter((session) => !session.revokedAt)
      .map((session) => {
        const user = data.users.find((entry) => entry.id === session.userId);
        return {
          id: session.id,
          userId: session.userId,
          label: session.label,
          createdAt: session.createdAt,
          lastSeenAt: session.lastSeenAt,
          username: user?.username || "Unknown",
          email: user?.email || "Unknown",
          role: user?.role || "user",
        };
      });
  },

  async revokeSession(sessionId) {
    const data = await readDemoStore();
    const session = data.sessions.find((entry) => entry.id === sessionId);
    if (!session) {
      return false;
    }
    session.revokedAt = new Date().toISOString();
    await writeDemoStore(data);
    return true;
  },

  async addAuditEntry({
    actionType,
    summary,
    actorUserId,
    targetType,
    targetId,
    details = defaultAuditDetails,
  }) {
    const data = await readDemoStore();
    const entry = {
      id: data.nextAuditId,
      actionType,
      summary,
      actorUserId,
      targetType,
      targetId,
      details,
      createdAt: new Date().toISOString(),
    };
    data.nextAuditId += 1;
    data.audits.unshift(entry);
    await writeDemoStore(data);
    return entry;
  },

  async listAuditEntries(limit = 20) {
    const data = await readDemoStore();
    return data.audits.slice(0, limit);
  },

  async listDatabaseTables() {
    const data = await readDemoStore();
    const tables = [
      ["users", data.users],
      ["sessions", data.sessions],
      ["audits", data.audits],
      ["systemConfig", [data.systemConfig]],
      ["contentModeration", [data.contentModeration]],
      ["appOperations", [data.appOperations]],
    ];

    return tables.map(([name, rows]) => ({
      schema: "demo",
      name,
      type: "DEMO_DATA",
      rowCount: Array.isArray(rows) ? rows.length : 0,
    }));
  },

  async previewDatabaseTable(tableName, limit = 25) {
    const data = await readDemoStore();
    const sources = {
      users: data.users,
      sessions: data.sessions,
      audits: data.audits,
      systemConfig: [data.systemConfig],
      contentModeration: [data.contentModeration],
      appOperations: [data.appOperations],
    };
    const rows = sources[tableName];

    if (!rows) {
      return null;
    }

    const sampleRows = rows.slice(0, Math.min(Math.max(Number(limit) || 25, 1), 100));
    const columnNames = Array.from(
      sampleRows.reduce((columns, row) => {
        Object.keys(row || {}).forEach((key) => columns.add(key));
        return columns;
      }, new Set())
    );

    return {
      table: {
        schema: "demo",
        name: tableName,
        type: "DEMO_DATA",
        rowCount: rows.length,
      },
      columns: columnNames.map((name) => ({ name, dataType: "json" })),
      rows: sampleRows,
    };
  },
});

const store = process.env.DATABASE_URL ? createPgStore() : createDemoFileStore();

module.exports = {
  store,
  defaultSystemConfig,
  defaultContentModeration,
  defaultAppOperations,
  defaultAdminPermissions,
  maskArrayFromCsv,
};
