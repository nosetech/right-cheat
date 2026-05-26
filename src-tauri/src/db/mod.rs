pub mod repository;
pub mod schema;

use rusqlite::Connection;
use std::path::PathBuf;
use std::sync::Mutex;

pub struct DbConnection(pub Mutex<Connection>);

pub fn open_connection(db_path: PathBuf) -> Result<Connection, rusqlite::Error> {
    let conn = Connection::open(&db_path)?;
    conn.execute_batch("PRAGMA foreign_keys = ON;")?;
    schema::apply_migrations(&conn)?;
    Ok(conn)
}
