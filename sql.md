$env:PGPASSWORD="tita2005"; & "C:\Program Files\PostgreSQL\18\pgAdmin 4\runtime\psql.exe" -U postgres -h localhost -p 5432 -d postgres -c "DROP DATABASE IF EXISTS stock; CREATE DATABASE stock;"




$env:PGPASSWORD="tita2005"; & "C:\Program Files\PostgreSQL\18\pgAdmin 4\runtime\psql.exe" -U postgres -h localhost -p 5432 -d stock -f "C:\Users\DELL\Desktop\memoir-l3 - Copie\backup.sql"