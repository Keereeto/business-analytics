
CREATE OR REPLACE FUNCTION log_table_changes()
RETURNS TRIGGER AS $$
DECLARE
    log_action VARCHAR(100);
    log_entity_id BIGINT;
    log_details JSONB;
    log_user_id BIGINT;
BEGIN
    -- Read the application user ID, if the backend supplied one.
    log_user_id := NULLIF(current_setting('app.user_id', TRUE), '')::BIGINT;

    IF TG_OP = 'INSERT' THEN
        log_action := 'INSERT';
        log_entity_id := NEW.id;
        log_details := jsonb_build_object(
            'new', to_jsonb(NEW)
        );

    ELSIF TG_OP = 'UPDATE' THEN
        log_action := 'UPDATE';
        log_entity_id := NEW.id;
        log_details := jsonb_build_object(
            'old', to_jsonb(OLD),
            'new', to_jsonb(NEW)
        );

    ELSIF TG_OP = 'DELETE' THEN
        log_action := 'DELETE';
        log_entity_id := OLD.id;
        log_details := jsonb_build_object(
            'old', to_jsonb(OLD)
        );
    END IF;

    INSERT INTO system_logs (
        user_id,
        action,
        entity_type,
        entity_id,
        details
    )
    VALUES (
        log_user_id,
        log_action,
        TG_TABLE_NAME,
        log_entity_id,
        log_details
    );

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


DROP TRIGGER IF EXISTS users_audit_trigger ON users;
CREATE TRIGGER users_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON users
FOR EACH ROW
EXECUTE FUNCTION log_table_changes();


DROP TRIGGER IF EXISTS projects_audit_trigger ON projects;
CREATE TRIGGER projects_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON projects
FOR EACH ROW
EXECUTE FUNCTION log_table_changes();


DROP TRIGGER IF EXISTS tasks_audit_trigger ON tasks;
CREATE TRIGGER tasks_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON tasks
FOR EACH ROW
EXECUTE FUNCTION log_table_changes();